"""Health monitoring for LLM providers."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Provider health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    status: HealthStatus
    latency_ms: float | None = None
    error: str | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


@dataclass
class ProviderHealthMetrics:
    """Health metrics for a provider."""
    provider_name: str
    model_name: str
    status: HealthStatus = HealthStatus.UNKNOWN
    last_check_time: datetime | None = None
    last_success_time: datetime | None = None
    last_failure_time: datetime | None = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    total_checks: int = 0
    total_failures: int = 0
    total_successes: int = 0
    average_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    latency_history: list[float] = field(default_factory=list)
    error_history: list[tuple[datetime, str]] = field(default_factory=list)
    is_available: bool = True

    def update(self, result: HealthCheckResult) -> None:
        """Update metrics with a new health check result."""
        self.last_check_time = result.timestamp
        self.total_checks += 1

        if result.status == HealthStatus.HEALTHY:
            self.consecutive_successes += 1
            self.consecutive_failures = 0
            self.total_successes += 1
            self.last_success_time = result.timestamp

            if result.latency_ms is not None:
                self.latency_history.append(result.latency_ms)
                # Keep only last 100 measurements
                if len(self.latency_history) > 100:
                    self.latency_history.pop(0)

                # Update latency statistics
                self._update_latency_stats()
        else:
            self.consecutive_failures += 1
            self.consecutive_successes = 0
            self.total_failures += 1
            self.last_failure_time = result.timestamp

            if result.error:
                self.error_history.append((result.timestamp, result.error))
                # Keep only last 50 errors
                if len(self.error_history) > 50:
                    self.error_history.pop(0)

        # Determine overall status
        self._update_status()

    def _update_latency_stats(self) -> None:
        """Update latency statistics."""
        if not self.latency_history:
            return

        sorted_latencies = sorted(self.latency_history)
        self.average_latency_ms = sum(sorted_latencies) / len(sorted_latencies)

        # Calculate percentiles
        n = len(sorted_latencies)
        self.p95_latency_ms = sorted_latencies[int(n * 0.95)]
        self.p99_latency_ms = sorted_latencies[int(n * 0.99)]

    def _update_status(self) -> None:
        """Update health status based on metrics."""
        if self.total_checks == 0:
            self.status = HealthStatus.UNKNOWN
            self.is_available = True
            return

        failure_rate = self.total_failures / self.total_checks

        if self.consecutive_failures >= 3 or failure_rate >= 0.5:
            self.status = HealthStatus.UNHEALTHY
            self.is_available = False
        elif self.consecutive_failures >= 1 or failure_rate >= 0.2:
            self.status = HealthStatus.DEGRADED
            self.is_available = True
        else:
            self.status = HealthStatus.HEALTHY
            self.is_available = True

    def get_summary(self) -> dict[str, Any]:
        """Get health summary."""
        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "status": self.status.value,
            "is_available": self.is_available,
            "last_check_time": self.last_check_time.isoformat() if self.last_check_time else None,
            "last_success_time": self.last_success_time.isoformat() if self.last_success_time else None,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "consecutive_failures": self.consecutive_failures,
            "consecutive_successes": self.consecutive_successes,
            "total_checks": self.total_checks,
            "total_failures": self.total_failures,
            "total_successes": self.total_successes,
            "failure_rate": self.total_failures / self.total_checks if self.total_checks > 0 else 0,
            "average_latency_ms": self.average_latency_ms,
            "p95_latency_ms": self.p95_latency_ms,
            "p99_latency_ms": self.p99_latency_ms,
            "recent_errors": [
                {"time": t.isoformat(), "error": e}
                for t, e in self.error_history[-5:]
            ],
        }


class ProviderHealthMonitor:
    """Monitor health of LLM providers."""

    def __init__(self, check_interval_seconds: float = 60.0):
        self._check_interval = check_interval_seconds
        self._metrics: dict[str, ProviderHealthMetrics] = {}
        self._health_checkers: dict[str, callable] = {}
        self._monitor_task: asyncio.Task | None = None
        self._running = False

    def register_provider(
        self,
        provider_name: str,
        model_name: str,
        health_checker: callable,
    ) -> None:
        """Register a provider for health monitoring."""
        key = f"{provider_name}:{model_name}"
        self._metrics[key] = ProviderHealthMetrics(
            provider_name=provider_name,
            model_name=model_name,
        )
        self._health_checkers[key] = health_checker
        logger.info(f"Registered health monitor for provider: {key}")

    def unregister_provider(self, provider_name: str, model_name: str) -> None:
        """Unregister a provider from health monitoring."""
        key = f"{provider_name}:{model_name}"
        if key in self._metrics:
            del self._metrics[key]
        if key in self._health_checkers:
            del self._health_checkers[key]
        logger.info(f"Unregistered health monitor for provider: {key}")

    async def check_provider_health(
        self, provider_name: str, model_name: str
    ) -> HealthCheckResult:
        """Check health of a specific provider."""
        key = f"{provider_name}:{model_name}"

        if key not in self._health_checkers:
            logger.warning(f"No health checker registered for {key}")
            return HealthCheckResult(
                status=HealthStatus.UNKNOWN,
                error="No health checker registered"
            )

        try:
            start_time = time.perf_counter()
            result = await self._health_checkers[key]()
            latency_ms = (time.perf_counter() - start_time) * 1000

            if result:
                health_result = HealthCheckResult(
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency_ms,
                )
            else:
                health_result = HealthCheckResult(
                    status=HealthStatus.UNHEALTHY,
                    latency_ms=latency_ms,
                    error="Health check returned False"
                )
        except Exception as e:
            logger.error(f"Health check failed for {key}: {e}")
            health_result = HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                error=str(e)
            )

        # Update metrics
        if key in self._metrics:
            self._metrics[key].update(health_result)

        return health_result

    async def check_all_providers(self) -> dict[str, HealthCheckResult]:
        """Check health of all registered providers."""
        results = {}
        for key in self._health_checkers:
            provider_name, model_name = key.split(":")
            results[key] = await self.check_provider_health(provider_name, model_name)
        return results

    async def _monitor_loop(self) -> None:
        """Background monitoring loop."""
        while self._running:
            try:
                await self.check_all_providers()
            except Exception as e:
                logger.error(f"Error in health monitoring loop: {e}")

            await asyncio.sleep(self._check_interval)

    async def start(self) -> None:
        """Start health monitoring."""
        if self._running:
            logger.warning("Health monitor already running")
            return

        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Health monitoring started")

    async def stop(self) -> None:
        """Stop health monitoring."""
        if not self._running:
            return

        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None

        logger.info("Health monitoring stopped")

    def get_provider_status(
        self, provider_name: str, model_name: str
    ) -> dict[str, Any] | None:
        """Get status of a specific provider."""
        key = f"{provider_name}:{model_name}"
        if key not in self._metrics:
            return None
        return self._metrics[key].get_summary()

    def get_all_status(self) -> dict[str, dict[str, Any]]:
        """Get status of all providers."""
        return {
            key: metrics.get_summary()
            for key, metrics in self._metrics.items()
        }

    def get_available_providers(self) -> list[tuple[str, str]]:
        """Get list of available (healthy/degraded) providers."""
        available = []
        for key, metrics in self._metrics.items():
            if metrics.is_available:
                available.append((metrics.provider_name, metrics.model_name))
        return available


# Global health monitor instance
_health_monitor: ProviderHealthMonitor | None = None


def get_health_monitor() -> ProviderHealthMonitor:
    """Get the global health monitor instance."""
    global _health_monitor
    if _health_monitor is None:
        _health_monitor = ProviderHealthMonitor()
    return _health_monitor
