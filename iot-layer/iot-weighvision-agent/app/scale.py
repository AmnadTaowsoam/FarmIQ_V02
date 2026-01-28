"""
Scale reading module for IoT WeighVision Agent.

Supports real scale reading via serial port and mock mode for testing.
"""

import logging
import random
import time
from typing import Optional

logger = logging.getLogger(__name__)


class Scale:
    """Scale interface for reading weight measurements."""
    
    def __init__(self, port: str = "/dev/ttyUSB0", mock: bool = False):
        """
        Initialize the scale.
        
        Args:
            port: Serial port path (e.g., /dev/ttyUSB0)
            mock: If True, use mock scale for testing
        """
        self.port = port
        self.mock = mock
        self._serial = None
        self._last_weight: Optional[float] = None
        self._last_reading_time: float = 0
        
        if not mock:
            self._init_serial()
    
    def _init_serial(self) -> None:
        """Initialize the serial connection to the scale."""
        try:
            import serial
            self._serial = serial.Serial(
                port=self.port,
                baudrate=9600,
                timeout=1,
            )
            logger.info(f"Scale initialized on port: {self.port}")
        except ImportError:
            logger.warning("pyserial not available, falling back to mock mode")
            self.mock = True
        except Exception as e:
            logger.error(f"Failed to initialize scale: {e}")
            self.mock = True
    
    def read_weight(self) -> Optional[float]:
        """
        Read a single weight measurement from the scale.
        
        Returns:
            Weight in kg or None if read failed
        """
        if self.mock:
            return self._generate_mock_weight()
        
        if self._serial is None:
            logger.error("Scale not initialized")
            return None
        
        try:
            # Send command to request weight (adjust based on actual scale protocol)
            # This is a generic implementation - adjust for your specific scale
            self._serial.write(b"W\r\n")
            response = self._serial.readline().decode().strip()
            
            # Parse response (adjust based on actual scale response format)
            # Example: expecting format like "120.5 kg" or just "120.5"
            weight_str = response.replace("kg", "").strip()
            weight = float(weight_str)
            
            self._last_weight = weight
            self._last_reading_time = time.time()
            
            logger.debug(f"Read weight: {weight} kg")
            return weight
            
        except ValueError as e:
            logger.warning(f"Failed to parse weight response: {response}, error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading weight: {e}")
            return None
    
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
        readings = []
        
        for i in range(max_readings):
            weight = self.read_weight()
            if weight is None:
                continue
            readings.append(weight)
            
            if i < max_readings - 1:
                time.sleep(delay_ms / 1000.0)
        
        if not readings:
            logger.warning("No valid weight readings obtained")
            return None
        
        # Check stability
        if len(readings) >= 2:
            min_weight = min(readings)
            max_weight = max(readings)
            variation = max_weight - min_weight
            
            if variation > threshold:
                logger.warning(
                    f"Weight readings unstable: variation {variation} kg > threshold {threshold} kg"
                )
                return None
        
        # Return average of readings
        stable_weight = sum(readings) / len(readings)
        logger.info(f"Stable weight: {stable_weight} kg (from {len(readings)} readings)")
        return stable_weight
    
    def _generate_mock_weight(self) -> float:
        """Generate a mock weight for testing."""
        # Generate a weight between 50 and 200 kg with small variations
        base_weight = 120.0
        
        # Add small random variation
        variation = random.uniform(-0.5, 0.5)
        
        # If we have a previous reading, make it close to that
        if self._last_weight is not None and (time.time() - self._last_reading_time) < 2.0:
            # Small variation from last reading
            variation = random.uniform(-0.1, 0.1)
            weight = self._last_weight + variation
        else:
            weight = base_weight + variation
        
        self._last_weight = weight
        self._last_reading_time = time.time()
        
        logger.debug(f"Mock weight: {weight:.2f} kg")
        return weight
    
    def close(self) -> None:
        """Close the serial connection."""
        if self._serial is not None:
            self._serial.close()
            self._serial = None
            logger.info("Scale connection closed")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
