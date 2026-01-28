"""
Sensors module for IoT Sensor Agent.
Handles sensor data collection and simulation for various sensor types.
"""

import random
import time
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class SensorReading:
    """Represents a single sensor reading."""

    metric: str
    value: float
    unit: str
    timestamp: float


class Sensor:
    """Base class for all sensors."""

    def __init__(self, metric: str, unit: str):
        self.metric = metric
        self.unit = unit

    def read(self) -> SensorReading:
        """
        Read sensor value. Override in subclasses.

        Returns:
            SensorReading with current value
        """
        raise NotImplementedError("Subclasses must implement read()")


class TemperatureSensor(Sensor):
    """Temperature sensor (celsius)."""

    def __init__(self, min_temp: float = 18.0, max_temp: float = 32.0):
        super().__init__("temperature", "celsius")
        self.min_temp = min_temp
        self.max_temp = max_temp
        self._current_value = (min_temp + max_temp) / 2

    def read(self) -> SensorReading:
        """Simulate temperature reading with small random variation."""
        variation = random.uniform(-0.5, 0.5)
        self._current_value = max(self.min_temp, min(self.max_temp, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class HumiditySensor(Sensor):
    """Humidity sensor (%)."""

    def __init__(self, min_humidity: float = 40.0, max_humidity: float = 80.0):
        super().__init__("humidity", "%")
        self.min_humidity = min_humidity
        self.max_humidity = max_humidity
        self._current_value = (min_humidity + max_humidity) / 2

    def read(self) -> SensorReading:
        """Simulate humidity reading with small random variation."""
        variation = random.uniform(-2.0, 2.0)
        self._current_value = max(self.min_humidity, min(self.max_humidity, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class WeightSensor(Sensor):
    """Weight sensor (kg)."""

    def __init__(self, min_weight: float = 0.0, max_weight: float = 500.0):
        super().__init__("weight", "kg")
        self.min_weight = min_weight
        self.max_weight = max_weight
        self._current_value = 250.0

    def read(self) -> SensorReading:
        """Simulate weight reading with small random variation."""
        variation = random.uniform(-5.0, 5.0)
        self._current_value = max(self.min_weight, min(self.max_weight, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class AmmoniaSensor(Sensor):
    """Ammonia sensor (ppm)."""

    def __init__(self, min_ppm: float = 0.0, max_ppm: float = 50.0):
        super().__init__("ammonia", "ppm")
        self.min_ppm = min_ppm
        self.max_ppm = max_ppm
        self._current_value = 10.0

    def read(self) -> SensorReading:
        """Simulate ammonia reading with small random variation."""
        variation = random.uniform(-2.0, 2.0)
        self._current_value = max(self.min_ppm, min(self.max_ppm, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class CO2Sensor(Sensor):
    """CO2 sensor (ppm)."""

    def __init__(self, min_ppm: float = 300.0, max_ppm: float = 2000.0):
        super().__init__("co2", "ppm")
        self.min_ppm = min_ppm
        self.max_ppm = max_ppm
        self._current_value = 800.0

    def read(self) -> SensorReading:
        """Simulate CO2 reading with small random variation."""
        variation = random.uniform(-50.0, 50.0)
        self._current_value = max(self.min_ppm, min(self.max_ppm, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class LightIntensitySensor(Sensor):
    """Light intensity sensor (lux)."""

    def __init__(self, min_lux: float = 0.0, max_lux: float = 10000.0):
        super().__init__("light_intensity", "lux")
        self.min_lux = min_lux
        self.max_lux = max_lux
        self._current_value = 500.0

    def read(self) -> SensorReading:
        """Simulate light intensity reading with random variation."""
        variation = random.uniform(-100.0, 100.0)
        self._current_value = max(self.min_lux, min(self.max_lux, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class WaterConsumptionSensor(Sensor):
    """Water consumption sensor (liters)."""

    def __init__(self, min_liters: float = 0.0, max_liters: float = 100.0):
        super().__init__("water_consumption", "liters")
        self.min_liters = min_liters
        self.max_liters = max_liters
        self._current_value = 50.0

    def read(self) -> SensorReading:
        """Simulate water consumption reading with small random variation."""
        variation = random.uniform(-1.0, 1.0)
        self._current_value = max(self.min_liters, min(self.max_liters, self._current_value + variation))
        return SensorReading(self.metric, round(self._current_value, 2), self.unit, time.time())


class SensorManager:
    """Manages multiple sensors and collects readings."""

    def __init__(self, enabled_sensors: Optional[List[str]] = None):
        """
        Initialize sensor manager.

        Args:
            enabled_sensors: List of sensor types to enable. If None, all sensors are enabled.
        """
        self._sensors: Dict[str, Sensor] = {}
        self._init_sensors(enabled_sensors)

    def _init_sensors(self, enabled_sensors: Optional[List[str]]) -> None:
        """Initialize available sensors."""
        all_sensors = {
            "temperature": TemperatureSensor(),
            "humidity": HumiditySensor(),
            "weight": WeightSensor(),
            "ammonia": AmmoniaSensor(),
            "co2": CO2Sensor(),
            "light_intensity": LightIntensitySensor(),
            "water_consumption": WaterConsumptionSensor(),
        }

        if enabled_sensors is None:
            self._sensors = all_sensors
        else:
            for sensor_type in enabled_sensors:
                if sensor_type in all_sensors:
                    self._sensors[sensor_type] = all_sensors[sensor_type]

    def read_all(self) -> List[SensorReading]:
        """
        Read values from all enabled sensors.

        Returns:
            List of SensorReading objects
        """
        readings = []
        for sensor in self._sensors.values():
            readings.append(sensor.read())
        return readings

    def read_sensor(self, metric: str) -> Optional[SensorReading]:
        """
        Read value from a specific sensor.

        Args:
            metric: Sensor metric name

        Returns:
            SensorReading or None if sensor not found
        """
        sensor = self._sensors.get(metric)
        if sensor:
            return sensor.read()
        return None

    def get_enabled_sensors(self) -> List[str]:
        """Get list of enabled sensor metrics."""
        return list(self._sensors.keys())
