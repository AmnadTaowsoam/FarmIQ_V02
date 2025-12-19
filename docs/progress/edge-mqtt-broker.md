# Service Progress: edge-mqtt-broker

**Service**: `edge-mqtt-broker`  
**Layer**: `edge`  
**Status**: `done` (configured & verified)  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Infrastructure service providing an MQTT broker for the edge layer. Uses Mosquitto v2 to handle all device telemetry and events. Devices connect to this broker on port 1883 (mapped to 5100 on the host).

---

## Ports & Connectivity

- **Container Port**: `1883`
- **Host Port**: `5100`
- **Internal URL**: `edge-mqtt-broker:1883`

---

## Environment Variables / Config

Service configured via `mosquitto.conf` mounted from `./edge-mqtt-broker/mosquitto.conf`.

```bash
# Core topics
iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}
iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}
iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}
iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}
```

---

## Docker Compose Snippet

```yaml
  edge-mqtt-broker:
    image: eclipse-mosquitto:2.0
    container_name: farmiq-edge-mqtt
    ports:
      - "5100:1883"
    volumes:
      - ./edge-mqtt-broker/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - mqtt_data:/mosquitto/data
      - mqtt_log:/mosquitto/log
    networks:
      - farmiq-net
```

---

## Auth & ACL (Dev vs Prod)

### Development (Current)
- `allow_anonymous true`
- No password or ACL files enforced by the broker by default to ease development.

### Production (Plan)
- `allow_anonymous false`
- Enable `password_file` and `acl_file` in `mosquitto.conf`.
- Example files provided in `./edge-mqtt-broker/aclfile.example` and `passwordfile.example`.

---

## Evidence Commands

### Start Service
```bash
docker compose up -d edge-mqtt-broker
```

### Subscribe to Telemetry
```bash
# Listen for all telemetry
mosquitto_sub -h localhost -p 5100 -t 'iot/telemetry/#'
```

### Publish Sample Telemetry
```bash
mosquitto_pub -h localhost -p 5100 -t 'iot/telemetry/t1/f1/b1/d1/temp' -m '{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "event_type": "telemetry.reading",
  "occurred_at": "2025-12-18T00:00:00Z",
  "trace_id": "trace-abc-123",
  "schema_version": "1.0",
  "tenant_id": "t1",
  "farm_id": "f1",
  "barn_id": "b1",
  "device_id": "d1",
  "payload": {
    "metric": "temperature",
    "value": 26.4,
    "unit": "C"
  }
}'
```

---

## Progress Checklist

- [x] Service folder created
- [x] `mosquitto.conf` created for local dev
- [x] `aclfile.example` and `passwordfile.example` created
- [x] Integrated into `edge-layer/docker-compose.yml`
- [x] Device → Edge MQTT-only policy enforced
- [x] Progress documented in this file
