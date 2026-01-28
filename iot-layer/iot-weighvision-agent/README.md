# IoT WeighVision Agent

A Python agent for WeighVision devices that manages weigh sessions, captures images from cameras, reads scale weights, and publishes events to the FarmIQ edge layer via MQTT.

## Overview

The `iot-weighvision-agent` runs on WeighVision devices (camera + scale) and is responsible for:

- Managing weigh sessions that bind **image frames** with **scale weights**
- Performing local validation and packaging of capture data
- Publishing all session events to edge via **MQTT only**
- Uploading images via **HTTP presigned URL** to `edge-media-store`

## Features

### Phase 1: Session-based Capture
- Session creation with batch ID tracking
- Synchronized image capture and weight reading
- Image upload via presigned URLs
- Event publishing for session lifecycle
- Offline buffering and replay

### Phase 2: Scheduled Capture (Future)
- Scheduled image capture for continuous monitoring
- Optional weight readings
- Same presign+upload flow as Phase 1

## Architecture

```
iot-weighvision-agent/
├── app/
│   ├── __init__.py          # Package initialization
│   ├── main.py              # Entry point and CLI
│   ├── mqtt_client.py       # MQTT client with offline buffering
│   ├── session.py           # Session state machine
│   ├── camera.py            # Camera capture (OpenCV/mock)
│   ├── scale.py             # Scale reading (serial/mock)
│   ├── media_upload.py      # Presign + upload to edge-media-store
│   ├── events.py            # Event envelope schema
│   ├── config.py            # Configuration management
│   └── exceptions.py        # Custom exception hierarchy
├── tests/
│   ├── test_session.py      # Session and event tests
│   └── mocks/               # Mock implementations
├── Dockerfile
├── pyproject.toml          # Modern Python project configuration
├── requirements.txt
├── pytest.ini
└── README.md
```

## MQTT Topics

### WeighVision Session Events
```
iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}
```

### Event Types
- `weighvision.session.created` - Session started
- `weighvision.weight.recorded` - Weight measurement
- `weighvision.image.captured` - Image uploaded
- `weighvision.session.finalized` - Session ended
- `device.status` - Device health status (retained)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MQTT_HOST` | MQTT broker hostname | `edge-mqtt-broker` |
| `MQTT_PORT` | MQTT broker port | `1883` |
| `MQTT_QOS` | MQTT QoS level | `1` |
| `MEDIA_STORE_URL` | Edge media store URL | `http://edge-media-store:3000` |
| `TENANT_ID` | Tenant ID (required) | - |
| `FARM_ID` | Farm ID (required) | - |
| `BARN_ID` | Barn ID (required) | - |
| `STATION_ID` | Station ID (required) | - |
| `DEVICE_ID` | Device ID | `weighvision-device-001` |
| `CAMERA_DEVICE` | Camera device path | `/dev/video0` |
| `SCALE_PORT` | Scale serial port | `/dev/ttyUSB0` |
| `MOCK_HARDWARE` | Use mock hardware for testing | `false` |
| `BUFFER_ENABLED` | Enable offline buffering | `true` |
| `BUFFER_DIR` | Buffer directory | `/tmp/weighvision/buffer` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Installation

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export TENANT_ID=t-001
export FARM_ID=f-001
export BARN_ID=b-001
export STATION_ID=st-001

# Run agent
python -m app.main --mode single --mock-hardware
```

### Docker

```bash
# Build image
docker build -t farmiq/iot-weighvision-agent:latest .

# Run with environment variables
docker run -d \
  -e TENANT_ID=t-001 \
  -e FARM_ID=f-001 \
  -e BARN_ID=b-001 \
  -e STATION_ID=st-001 \
  -e MQTT_HOST=mosquitto \
  -e MEDIA_STORE_URL=http://edge-media-store:3000 \
  farmiq/iot-weighvision-agent:latest
```

## Usage

### Command Line Interface

```bash
# Run a single session
python -m app.main --mode single --batch-id batch-001

# Run in continuous mode with 60 second intervals
python -m app.main --mode continuous --interval 60

# Run with mock hardware for testing
python -m app.main --mode single --mock-hardware

# Show agent status
python -m app.main --mode status
```

### Python API

```python
from app.session import WeighSession, SessionManager
from app.config import get_config

# Create a session
session = WeighSession(
    batch_id="batch-001",
    trace_id="trace-001",
)

# Start the session
session.start()

# Capture image and record weight
session.capture_and_record()

# Finalize the session
session.finalize()

# Cleanup
session.cleanup()
```

## Event Envelope

All MQTT messages use the standard FarmIQ event envelope:

```json
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "trace_id": "string",
  "tenant_id": "uuid-v7",
  "device_id": "string",
  "event_type": "string",
  "ts": "ISO-8601",
  "payload": {},
  "content_hash": "string",
  "retry_count": 0,
  "produced_at": "ISO-8601"
}
```

## Offline Buffering

When MQTT is disconnected, events are buffered locally:

- **Buffer location**: `/tmp/weighvision/buffer/events.jsonl`
- **Max age**: 72 hours (configurable)
- **Max events**: 10,000 (configurable)
- **Replay strategy**: Chronological order with jitter and throttling

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_session.py

# Run with mock hardware
pytest -m "not integration"
```

## Development

### Adding New Event Types

1. Add event type constant to `app/events.py`
2. Create payload dataclass
3. Add factory function

```python
# Example
EVENT_CUSTOM = "weighvision.custom.event"

@dataclass
class CustomPayload(EventPayload):
    custom_field: str

def create_custom_event(...) -> EventEnvelope:
    event = EventEnvelope(...)
    return event.with_payload(CustomPayload(...))
```

### Mock Hardware for Testing

Set `MOCK_HARDWARE=true` to use mock camera and scale:

```bash
export MOCK_HARDWARE=true
python -m app.main --mode single
```

## Troubleshooting

### Camera Issues

```bash
# Check camera device
ls -l /dev/video*

# Test with OpenCV
python -c "import cv2; cap = cv2.VideoCapture(0); print(cap.isOpened())"
```

### Scale Issues

```bash
# Check serial port
ls -l /dev/ttyUSB*

# Test with pyserial
python -c "import serial; s = serial.Serial('/dev/ttyUSB0'); print(s.is_open)"
```

### MQTT Connection Issues

```bash
# Test MQTT connection
mosquitto_sub -h edge-mqtt-broker -t "iot/+/+/+/+/+"

# Check logs
docker logs <container-id>
```

## License

Copyright (c) 2025 FarmIQ. All rights reserved.

## References

- [IoT Layer Spec](../../docs/iot-layer/00-overview.md)
- [WeighVision Agent Spec](../../docs/iot-layer/02-iot-weighvision-agent.md)
- [MQTT Topic Map](../../docs/iot-layer/03-mqtt-topic-map.md)
- [FarmIQ Architecture](../../docs/01-architecture.md)
