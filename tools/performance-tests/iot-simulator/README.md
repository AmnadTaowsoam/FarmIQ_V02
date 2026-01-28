# IoT Device Simulator

Simulates 1000+ virtual devices sending MQTT messages for load testing.

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
# Default: 1000 devices, 12 messages per minute per device
node index.js

# Custom device count
node index.js --devices=5000

# Custom message rate
node index.js --devices=1000 --messages-per-minute=12

# Reconnection storm scenario
node index.js --devices=1000 --scenario=reconnection-storm
```

### Environment Variables

```bash
MQTT_BROKER=mqtt://localhost:1883 \
DEVICES=5000 \
MESSAGES_PER_MINUTE=12 \
SCENARIO=peak \
node index.js
```

## Scenarios

### Normal Operation
```bash
node index.js --devices=1000 --messages-per-minute=12 --scenario=normal
```
- 1000 devices
- 12 messages per device per minute
- Total: 12,000 messages/minute

### Peak Load
```bash
node index.js --devices=5000 --messages-per-minute=12 --scenario=peak
```
- 5000 devices
- 12 messages per device per minute
- Total: 60,000 messages/minute

### Reconnection Storm
```bash
node index.js --devices=1000 --scenario=reconnection-storm
```
- 1000 devices
- After 1 minute: All devices disconnect and reconnect simultaneously
- Tests broker's ability to handle reconnection storms

### Scale Test (10K Devices)
```bash
node index.js --devices=10000 --messages-per-minute=12 --scenario=scale
```
- 10,000 devices (target capacity)
- 12 messages per device per minute
- Total: 120,000 messages/minute

## Device Types

- **ENV_SENSOR**: Temperature, humidity, ammonia
- **SCALE**: Weight
- **CAMERA**: Image

## Message Format

```json
{
  "event_id": "uuid",
  "trace_id": "uuid",
  "tenant_id": "00000000-0000-4000-8000-000000000001",
  "farm_id": "00000000-0000-4000-8000-000000000101",
  "barn_id": "00000000-0000-4000-8000-000000001101",
  "device_id": "device-000001",
  "metric": "temperature",
  "value": 25.5,
  "unit": "C",
  "ts": "2025-01-26T10:00:00Z"
}
```

## MQTT Topics

Format: `iot/telemetry/{tenant_id}/{farm_id}/{barn_id}/{device_id}/{metric}`

Example: `iot/telemetry/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000001101/device-000001/temperature`

## Statistics

The simulator prints statistics every 10 seconds:
- Connected devices count
- Total messages sent
- Messages per second

## Shutdown

Press `Ctrl+C` to gracefully shutdown:
- Stops all message transmission
- Disconnects all devices
- Prints final statistics

## Performance Targets

- **10,000 devices** supported
- **10,000 msg/sec** throughput
- **Graceful handling** of reconnection storms
