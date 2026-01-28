"""Circuit breaker implementation for LLM provider resilience."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Circuit is open, requests fail fast
    HALF_OPEN = "half_open"  # Testing if service has recovered


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration."""
    failure_threshold: int = 5  # Number of failures before opening
    success_threshold: int = 2  # Number of successes to close from half-open
    timeout_seconds: float = 60.0  # How long to stay open before half-open
    call_timeout_seconds: float = 30.0  # Timeout for individual calls


@dataclass
class CircuitBreakerStats:
    """Circuit breaker statistics."""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float | None = None
    last_state_change: float = field(default_factory=time.time)
    total_calls: int = 0
    total_failures: int = 0
    total_successes: int = 0


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open."""
    pass


class CircuitBreaker:
    """Circuit breaker for protecting against cascading failures."""

    def __init__(self, config: CircuitBreakerConfig, name: str = "llm-provider"):
        self._config = config
        self._name = name
        self._stats = CircuitBreakerStats()
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        return self._stats.state

    @property
    def stats(self) -> CircuitBreakerStats:
        """Get circuit statistics."""
        return self._stats

    def record_success(self) -> None:
        """Record a successful call."""
        self._stats.success_count += 1
        self._stats.total_successes += 1
        self._stats.total_calls += 1

        if self._stats.state == CircuitState.HALF_OPEN:
            if self._stats.success_count >= self._config.success_threshold:
                logger.info(
                    f"Circuit breaker '{self._name}' closing after {self._stats.success_count} successes"
                )
                self._stats.state = CircuitState.CLOSED
                self._stats.failure_count = 0
                self._stats.success_count = 0
                self._stats.last_state_change = time.time()

    def record_failure(self) -> None:
        """Record a failed call."""
        self._stats.failure_count += 1
        self._stats.total_failures += 1
        self._stats.total_calls += 1
        self._stats.last_failure_time = time.time()

        if self._stats.state == CircuitState.CLOSED:
            if self._stats.failure_count >= self._config.failure_threshold:
                logger.warning(
                    f"Circuit breaker '{self._name}' opening after {self._stats.failure_count} failures"
                )
                self._stats.state = CircuitState.OPEN
                self._stats.last_state_change = time.time()

    def _should_allow_request(self) -> bool:
        """Check if request should be allowed based on state."""
        now = time.time()

        if self._stats.state == CircuitState.CLOSED:
            return True

        if self._stats.state == CircuitState.OPEN:
            # Check if timeout has elapsed
            if now - self._stats.last_state_change >= self._config.timeout_seconds:
                logger.info(
                    f"Circuit breaker '{self._name}' transitioning to half-open"
                )
                self._stats.state = CircuitState.HALF_OPEN
                self._stats.last_state_change = now
                self._stats.success_count = 0
                return True
            return False

        if self._stats.state == CircuitState.HALF_OPEN:
            return True

        return False

    async def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute a function through the circuit breaker."""
        async with self._lock:
            if not self._should_allow_request():
                logger.warning(
                    f"Circuit breaker '{self._name}' is open, rejecting request"
                )
                raise CircuitBreakerError(
                    f"Circuit breaker '{self._name}' is open. "
                    f"Try again after {self._config.timeout_seconds} seconds."
                )

        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=self._config.call_timeout_seconds
            )
            self.record_success()
            return result
        except asyncio.TimeoutError as e:
            self.record_failure()
            logger.error(
                f"Circuit breaker '{self._name}' call timeout",
                extra={"name": self._name, "timeout": self._config.call_timeout_seconds}
            )
            raise
        except CircuitBreakerError:
            # Re-raise circuit breaker errors
            raise
        except Exception as e:
            self.record_failure()
            logger.error(
                f"Circuit breaker '{self._name}' call failed",
                extra={"name": self._name, "error": str(e)}
            )
            raise

    def reset(self) -> None:
        """Reset the circuit breaker to closed state."""
        self._stats = CircuitBreakerStats()
        logger.info(f"Circuit breaker '{self._name}' reset")

    def get_status(self) -> dict[str, Any]:
        """Get circuit breaker status."""
        now = time.time()
        return {
            "name": self._name,
            "state": self._stats.state.value,
            "failure_count": self._stats.failure_count,
            "success_count": self._stats.success_count,
            "total_calls": self._stats.total_calls,
            "total_failures": self._stats.total_failures,
            "total_successes": self._stats.total_successes,
            "last_failure_time": self._stats.last_failure_time,
            "last_state_change": self._stats.last_state_change,
            "time_in_state": now - self._stats.last_state_change,
        }
