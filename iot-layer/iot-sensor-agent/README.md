# IoT Sensor Agent

A lightweight Python agent for collecting and publishing sensor telemetry data via MQTT. Designed for edge deployment in agricultural IoT environments.

## Features

- **Multi-sensor support**: Temperature, Humidity, Weight, Ammonia, CO2, Light Intensity, Water Consumption
- **MQTT publishing**: QoS 1 with Last Will and Testament (LWT)
- **Graceful shutdown**: Handles SIGINT/SIGTERM for clean shutdown
- **Retry logic**: Automatic reconnection with exponential backoff
- **Docker support**: Containerized deployment ready
- **Configurable**: Environment-based configuration

## Architecture

```
iot-sensor-agent/
├── app/
│   ├── __init__.py       # Package initialization
│   ├── main.py           # Entry point and agent orchestration
│   ├── mqtt_client.py    # MQTT connection wrapper
│   ├── sensors.py        # Sensor data collection
│   ├── telemetry.py      # Envelope creation and validation
│   └── config.py         # Environment configuration
├── tests/
│   ├── test_sensors.py   # Sensor unit tests
│   └── test_telemetry.py # Telemetry unit tests
├── Dockerfile            # Container image
├── requirements.txt      # Python dependencies
└── README.md             # This file
```

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   export MQTT_HOST=edge-mqtt-broker
   export MQTT_PORT=1883
   export MQTT_USERNAME=iot-device
   export MQTT_PASSWORD=xxx
   export TENANT_ID=t-123
   export FARM_ID=f-456
   export BARN_ID=b-789
   export DEVICE_ID=d-001
   export POLL_INTERVAL_MS=60000
   ```

3. **Run the agent:**
   ```bash
   python -m app.main
   ```

### Docker Deployment

1. **Build the image:**
   ```bash
   docker build -t iot-sensor-agent:latest .
   ```

2. **Run with environment variables:**
   ```bash
   docker run -d \
     -e MQTT_HOST=edge-mqtt-broker \
     -e MQTT_PORT=1883 \
     -e MQTT_USERNAME=iot-device \
     -e MQTT_PASSWORD=xxx \
     -e TENANT_ID=t-123 \
     -e FARM_ID=f-456 \
     -e BARN_ID=b-789 \
     -e DEVICE_ID=d-001 \
     -e POLL_INTERVAL_MS=60000 \
     iot-sensor-agent:latest
   ```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MQTT_HOST` | MQTT broker hostname | `edge-mqtt-broker` |
| `MQTT_PORT` | MQTT broker port | `1883` |
| `MQTT_USERNAME` | MQTT username | - |
| `MQTT_PASSWORD` | MQTT password | - |
| `TENANT_ID` | Tenant identifier | `t-123` |
| `FARM_ID` | Farm identifier | `f-456` |
| `BARN_ID` | Barn identifier | `b-789` |
| `DEVICE_ID` | Device identifier | `d-001` |
| `POLL_INTERVAL_MS` | Sensor polling interval in milliseconds | `60000` |

## MQTT Topics

### Telemetry Topic
```
iot/telemetry/{tenant}/{farm}/{barn}/{device}/{metric}
```

Example: `iot/telemetry/t-123/f-456/b-789/d-001/temperature`

### Status Topic
```
iot/status/{tenant}/{farm}/{barn}/{device}
```

Example: `iot/status/t-123/f-456/b-789/d-001`

## Telemetry Envelope Schema

```json
{
  "event_id": "uuid",
  "tenant_id": "t-123",
  "farm_id": "f-456",
  "barn_id": "b-789",
  "device_id": "d-001",
  "metric": "temperature",
  "value": 25.5,
  "unit": "celsius",
  "ts": "2026-01-22T10:00:00Z",
  "schema_version": "1.0"
}
```

## Sensor Types

| Metric | Unit | Range (default) |
|--------|------|-----------------|
| `temperature` | celsius | 18.0 - 32.0 |
| `humidity` | % | 40.0 - 80.0 |
| `weight` | kg | 0.0 - 500.0 |
| `ammonia` | ppm | 0.0 - 50.0 |
| `co2` | ppm | 300.0 - 2000.0 |
| `light_intensity` | lux | 0.0 - 10000.0 |
| `water_consumption` | liters | 0.0 - 100.0 |

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html
```

## Development

### Adding New Sensors

1. Create a new sensor class inheriting from `Sensor` in [`sensors.py`](app/sensors.py):
   ```python
   class MySensor(Sensor):
       def __init__(self, min_value: float, max_value: float):
           super().__init__("my_metric", "my_unit")
           # Initialize sensor
       
       def read(self) -> SensorReading:
           # Read sensor value
           return SensorReading(self.metric, value, self.unit, time.time())
   ```

2. Add to `SensorManager._init_sensors()`:
   ```python
   all_sensors = {
       # ... existing sensors
       "my_metric": MySensor(min_value, max_value),
   }
   ```

3. Add tests in [`test_sensors.py`](tests/test_sensors.py).

## License

See project root LICENSE file.

## Related Documentation

- [Architecture Overview](../../docs/01-architecture.md)
- [IoT Layer Implementation](../../docs/02-IOT-LAYER-IMPL.md)
- [API Standards](../../docs/shared/01-api-standards.md)
