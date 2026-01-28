"""
Mock scale implementation for testing.

Simulates scale reading without requiring actual hardware.
"""

import random
import time
from typing import Optional


class MockScale:
    """Mock scale for testing purposes."""

    def __init__(
        self,
        port: str = "/dev/ttyUSB0",
        mock: bool = True,
        base_weight: float = 120.0,
        weight_variation: float = 0.5,
        fail_read: bool = False,
        unstable: bool = False,
    ):
        """
        Initialize the mock scale.

        Args:
            port: Serial port path (for compatibility with real scale)
            mock: Always True for mock scale
            base_weight: Base weight value in kg
            weight_variation: Maximum random variation in kg
            fail_read: If True, read operations will fail
            unstable: If True, readings will be unstable (high variation)
        """
        self.port = port
        self.mock = mock
        self.base_weight = base_weight
        self.weight_variation = weight_variation
        self.fail_read = fail_read
        self.unstable = unstable
        self._closed = False
        self._last_weight: Optional[float] = None
        self._last_reading_time: float = 0
        self._read_count = 0

    def read_weight(self) -> Optional[float]:
        """
        Read a single weight measurement from the mock scale.

        Returns:
            Weight in kg or None if read failed
        """
        if self._closed:
            raise RuntimeError("Scale connection has been closed")

        if self.fail_read:
            return None

        self._read_count += 1

        # Generate weight with variation
        if self._last_weight is not None and (time.time() - self._last_reading_time) < 2.0:
            # Small variation from last reading
            variation = random.uniform(-0.1, 0.1)
            weight = self._last_weight + variation
        else:
            variation = random.uniform(-self.weight_variation, self.weight_variation)
            weight = self.base_weight + variation

        self._last_weight = weight
        self._last_reading_time = time.time()

        return weight

    def read_stable_weight(
        self,
        threshold: float = 0.1,
        max_readings: int = 5,
        delay_ms: int = 100,
    ) -> Optional[float]:
        """
        Read a stable weight by taking multiple readings and checking for stability.

        Args:
            threshold: Maximum variation between readings to consider stable
            max_readings: Maximum number of readings to take
            delay_ms: Delay between readings in milliseconds

        Returns:
            Stable weight in kg or None if readings failed or unstable
        """
        if self._closed:
            raise RuntimeError("Scale connection has been closed")

        if self.fail_read:
            return None

        readings = []

        for i in range(max_readings):
            weight = self.read_weight()
            if weight is None:
                continue
            readings.append(weight)

            if i < max_readings - 1:
                time.sleep(delay_ms / 1000.0)

        if not readings:
            return None

        # Check stability
        if len(readings) >= 2:
            min_weight = min(readings)
            max_weight = max(readings)
            variation = max_weight - min_weight

            # If unstable mode is enabled, always return unstable
            if self.unstable or variation > threshold:
                return None

        # Return average of readings
        stable_weight = sum(readings) / len(readings)
        return stable_weight

    def close(self) -> None:
        """Close the serial connection."""
        self._closed = True

    @property
    def read_count(self) -> int:
        """Get the number of reads performed."""
        return self._read_count

    @property
    def last_weight(self) -> Optional[float]:
        """Get the last weight reading."""
        return self._last_weight

    def set_base_weight(self, weight: float) -> None:
        """Set the base weight for subsequent readings."""
        self.base_weight = weight

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
