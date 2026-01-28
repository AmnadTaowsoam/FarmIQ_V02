"""
Unit tests for sensor module.
"""

import pytest
from app.sensors import (
    Sensor,
    TemperatureSensor,
    HumiditySensor,
    WeightSensor,
    AmmoniaSensor,
    CO2Sensor,
    LightIntensitySensor,
    WaterConsumptionSensor,
    SensorManager,
    SensorReading,
)


class TestTemperatureSensor:
    """Tests for TemperatureSensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = TemperatureSensor()
        assert sensor.metric == "temperature"
        assert sensor.unit == "celsius"

    def test_custom_range(self):
        """Test sensor with custom range."""
        sensor = TemperatureSensor(min_temp=10.0, max_temp=40.0)
        assert sensor.min_temp == 10.0
        assert sensor.max_temp == 40.0

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = TemperatureSensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "temperature"
        assert reading.unit == "celsius"
        assert isinstance(reading.value, float)
        assert isinstance(reading.timestamp, float)

    def test_read_within_range(self):
        """Test that readings stay within configured range."""
        sensor = TemperatureSensor(min_temp=20.0, max_temp=25.0)

        for _ in range(100):
            reading = sensor.read()
            assert 20.0 <= reading.value <= 25.0


class TestHumiditySensor:
    """Tests for HumiditySensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = HumiditySensor()
        assert sensor.metric == "humidity"
        assert sensor.unit == "%"

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = HumiditySensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "humidity"
        assert reading.unit == "%"


class TestWeightSensor:
    """Tests for WeightSensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = WeightSensor()
        assert sensor.metric == "weight"
        assert sensor.unit == "kg"

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = WeightSensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "weight"
        assert reading.unit == "kg"


class TestAmmoniaSensor:
    """Tests for AmmoniaSensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = AmmoniaSensor()
        assert sensor.metric == "ammonia"
        assert sensor.unit == "ppm"

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = AmmoniaSensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "ammonia"
        assert reading.unit == "ppm"


class TestCO2Sensor:
    """Tests for CO2Sensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = CO2Sensor()
        assert sensor.metric == "co2"
        assert sensor.unit == "ppm"

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = CO2Sensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "co2"
        assert reading.unit == "ppm"


class TestLightIntensitySensor:
    """Tests for LightIntensitySensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = LightIntensitySensor()
        assert sensor.metric == "light_intensity"
        assert sensor.unit == "lux"

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = LightIntensitySensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "light_intensity"
        assert reading.unit == "lux"


class TestWaterConsumptionSensor:
    """Tests for WaterConsumptionSensor."""

    def test_initialization(self):
        """Test sensor initialization."""
        sensor = WaterConsumptionSensor()
        assert sensor.metric == "water_consumption"
        assert sensor.unit == "liters"

    def test_read_returns_valid_reading(self):
        """Test that read returns a valid SensorReading."""
        sensor = WaterConsumptionSensor()
        reading = sensor.read()

        assert isinstance(reading, SensorReading)
        assert reading.metric == "water_consumption"
        assert reading.unit == "liters"


class TestSensorManager:
    """Tests for SensorManager."""

    def test_initialization_all_sensors(self):
        """Test that all sensors are initialized by default."""
        manager = SensorManager()
        enabled = manager.get_enabled_sensors()

        expected_sensors = [
            "temperature",
            "humidity",
            "weight",
            "ammonia",
            "co2",
            "light_intensity",
            "water_consumption",
        ]

        for sensor in expected_sensors:
            assert sensor in enabled

    def test_initialization_selected_sensors(self):
        """Test that only selected sensors are initialized."""
        manager = SensorManager(enabled_sensors=["temperature", "humidity"])
        enabled = manager.get_enabled_sensors()

        assert "temperature" in enabled
        assert "humidity" in enabled
        assert "weight" not in enabled

    def test_read_all(self):
        """Test reading all sensors."""
        manager = SensorManager(enabled_sensors=["temperature", "humidity"])
        readings = manager.read_all()

        assert len(readings) == 2
        assert all(isinstance(r, SensorReading) for r in readings)

    def test_read_sensor(self):
        """Test reading a specific sensor."""
        manager = SensorManager(enabled_sensors=["temperature", "humidity"])

        reading = manager.read_sensor("temperature")
        assert reading is not None
        assert reading.metric == "temperature"

        reading = manager.read_sensor("weight")
        assert reading is None
