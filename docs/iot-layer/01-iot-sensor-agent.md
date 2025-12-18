Purpose: Describe the behavior and integration contract for the `iot-sensor-agent`.  
Scope: Data collection, payload schema, and communication with `edge-ingress-gateway`.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## Role and responsibilities

- Run on sensor gateways or devices located in barns.
- Collect telemetry every minute (configurable).
- Push telemetry to the edge using MQTT (preferred) or HTTP, following the defined API standards.
- Avoid long-term storage; rely on the edge for buffering and persistence.

---

## Data collection and scheduling

- Sampling interval: default **60 seconds** per device, overridable by configuration.
- Typical metrics:
  - `temperature_c`
  - `humidity_percent`
  - `weight_kg` (if scale data is available separate from WeighVision).
  - `co2_ppm` or other environmental metrics (extensible).

Agent should:
- Read from attached sensors (driver-level details are device-specific).
- Validate data ranges locally (e.g., drop obviously invalid readings).
- Tag each reading with:
  - `tenant_id`, `farm_id`, `barn_id`, `device_id` (from configuration).
  - `occurred_at` (device or gateway UTC timestamp).

---

## MQTT publishing (preferred)

- Broker: `edge-mqtt-broker` on the edge cluster.
- Topic convention (authoritative): `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`.
- QoS/retain (authoritative):
  - **QoS**: 0 (default) OR 1 if business requires guaranteed delivery
  - **Retain**: false

Example payload:

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "event_type": "telemetry.reading",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "device-sensor-001",
  "station_id": null,
  "session_id": null,
  "occurred_at": "2025-01-01T10:00:00Z",
  "trace_id": "trace-id-123",
  "payload": {
    "metric": "temperature",
    "value": 26.4,
    "unit": "C"
  }
}
```

`edge-ingress-gateway` subscribes (directly or via a bridge) and converts this into HTTP calls to downstream edge services.

---

## Failure handling

- Implement basic retry with exponential backoff for network failures.
- Implement **offline buffering (must persist across reboot)**:
  - Buffer up to **6 hours** OR **360 messages** (whichever smaller).
  - If buffer is full, drop oldest telemetry first.
  - Store as JSONL (append-only) or SQLite depending on device capability.
- Replay when MQTT connection is restored:
  - Publish in chronological order by `occurred_at`.
  - Throttle: max **5 msgs/sec** per device.
  - Add jitter: random delay **0–200ms**.
- Do not introduce additional message brokers or external in-memory cache/session stores at the device level.

---

## Implementation Notes

- Keep configuration in a simple file (e.g., YAML/JSON) specifying IDs, endpoints, and credentials.
- Ensure TLS is used for all HTTP calls and secure MQTT is used where available.
- Agent logging should be lightweight but structured where possible to allow troubleshooting on the device.  


