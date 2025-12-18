Purpose: Describe the behavior and integration contract for the `iot-sensor-agent`.  
Scope: Data collection, payload schema, and communication with `edge-ingress-gateway`.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## Role and responsibilities

- Run on sensor gateways or devices located in barns.
- Collect telemetry every minute (configurable).
- Push telemetry to the edge using **MQTT only** (no HTTP fallback), following the defined MQTT standards.
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
  - `ts` (device or gateway UTC timestamp).

---

## MQTT publishing (mandatory)

- Broker: `edge-mqtt-broker` on the edge cluster.
- Topic convention (authoritative): `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`.
- QoS/retain (authoritative): See `iot-layer/03-mqtt-topic-map.md` for complete rules.
  - **QoS**: **1** (at-least-once)
  - **Retain**: **NO**

Example payload (must match envelope schema from `iot-layer/03-mqtt-topic-map.md`):

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "trace_id": "trace-id-123",
  "event_type": "telemetry.reading",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "device-sensor-001",
  "ts": "2025-01-01T10:00:00Z",
  "payload": {
    "metric": "temperature",
    "value": 26.4,
    "unit": "C"
  }
}
```

Optional envelope fields: `content_hash`, `retry_count`, `produced_at` (see `iot-layer/03-mqtt-topic-map.md`).

`edge-ingress-gateway` subscribes (directly or via a bridge) and routes to downstream edge services.

---

## Failure handling

- Implement basic retry with exponential backoff for network failures.
- Implement **offline buffering (must persist across reboot)**:
  - Buffer up to configurable limits (guidance: **6 hours** OR **360 messages**; drop oldest first).
  - Store as JSONL (append-only) or SQLite depending on device capability.
- Replay when MQTT connection is restored:
  - Publish buffered messages in chronological order by `ts`.
  - Backoff + retry with jitter (**0–200ms**) to prevent thundering herd.
  - Throttle: max **5 msgs/sec** per device.
- Do not introduce additional message brokers or external in-memory cache/session stores at the device level.

---

## Implementation Notes

- Keep configuration in a simple file (e.g., YAML/JSON) specifying IDs, endpoints, and credentials.
- Ensure TLS is used for all HTTP calls and secure MQTT is used where available.
- Agent logging should be lightweight but structured where possible to allow troubleshooting on the device.  
