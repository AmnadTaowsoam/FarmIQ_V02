Purpose: Provide an overview of the FarmIQ IoT-layer agents and their responsibilities.  
Scope: IoT-agent roles, communication patterns with edge, and implementation starting points.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## IoT-layer overview

The IoT-layer consists of **lightweight agents** that run on or near physical devices and gateways:

- **`iot-sensor-agent`**
  - Periodically reads sensor data (weight, temperature, humidity, etc.).
  - Publishes telemetry every minute to `edge-ingress-gateway` via MQTT.

- **`iot-weighvision-agent`**
  - Runs on WeighVision devices (camera + scale).
  - Manages session-based image + weight capture, then sends results to the edge.

Key characteristics:
- Stateless where possible; no long-term persistence at device level.
- Resilient to brief connectivity loss (buffer in memory/disk only if needed).
- Use authenticated connections (e.g., mutual TLS or token-based auth) to the edge.

---

## Device identity and provisioning (basics)

Each IoT agent/device must be provisioned with:
- `tenant_id`, `farm_id`, `barn_id`, `device_id`
- Edge connection settings (MQTT broker host/port, HTTP base URL)
- Credentials (recommended: per-device certificate for mTLS, or signed device token)

Provisioning principles:
- Unique identity per device (no shared credentials across devices).
- Rotation and revocation supported operationally.
- Time sync (NTP) recommended to keep timestamps consistent (UTC at the payload level).

---

## Communication with edge

- Primary protocols:
  - **MQTT (100%)** via `edge-mqtt-broker` for all telemetry and device events.
  - **HTTP (only for media upload)**: multipart image upload directly to `edge-media-store`.

API expectations:
- Base path: `/api`.
- Health: `GET /api/health`.
- Error format: `{"error": {"code": "...", "message": "...", "traceId": "..."}}`.
- Request correlation: send/propagate `x-request-id` and `x-trace-id` headers when available.

---

## Standard MQTT topics (authoritative)

- **Telemetry**  
  `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`

- **Generic events**  
  `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`

- **WeighVision (Weight AI)**  
  `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`

- **Status (retained)**  
  `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`

---

## MQTT message envelope (authoritative)

```json
{
  "event_id": "uuid",
  "event_type": "string",
  "tenant_id": "uuid-v7",
  "farm_id": "uuid-v7",
  "barn_id": "uuid-v7",
  "device_id": "string",
  "station_id": "string",
  "session_id": "uuid-v7",
  "occurred_at": "ISO-8601",
  "trace_id": "string",
  "payload": {}
}
```

Notes:
- `station_id` and `session_id` are optional unless required by the topic type.
- `trace_id` must be present; if missing, `edge-ingress-gateway` enriches it.

---

## MQTT QoS policy and offline rules (MVP defaults)

### QoS and retain policy (authoritative)

- **Telemetry readings** (every ~1 minute)
  - **QoS**: 0 (default) OR 1 if business requires guaranteed delivery
  - **Retain**: false
  - **Reason**: avoid backlog storms; telemetry can tolerate occasional loss if aggregation is used.

- **WeighVision session events** (must not be lost)
  - **QoS**: 1
  - **Retain**: false
  - **Events**:
    - `weighvision.session.created`
    - `weighvision.weight.read`
    - `weighvision.capture.triggered`
    - `weighvision.session.finalized`

- **Device status/heartbeat** (latest state only)
  - **QoS**: 1
  - **Retain**: true
  - **Topic**: `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`
  - **Payload must include**: `last_seen_at`, `firmware_version`, `ip` (optional), `signal_strength` (optional), health flags

### Duplicate delivery and idempotency (mandatory)

- Every MQTT message MUST include: `event_id` (UUID), `occurred_at`, `trace_id`.
- Edge must treat MQTT delivery as **at-least-once**.
- Edge must dedupe on `(tenant_id, event_id)` using an **Edge DB TTL cache**.
- Cloud ingestion must also dedupe on `(tenant_id, event_id)` for safety.

### Device offline buffering (store-and-forward, must persist across reboot)

If MQTT cannot publish, agents must buffer locally:
- **Telemetry**: buffer up to **6 hours** OR **360 messages** (whichever smaller); drop oldest telemetry first when full.
- **WeighVision events**: buffer up to **72 hours** OR **10,000 events** (whichever smaller);
  - Do not drop `session.created` / `session.finalized` if possible.
  - Drop non-critical `capture.triggered` first under pressure.

Storage options (device dependent):
- Append-only JSONL file queue, or
- Embedded DB (SQLite).

### Replay strategy (when connection restored)

- Publish buffered messages in chronological order by `occurred_at`.
- Throttle + jitter:
  - **Telemetry**: max **5 msgs/sec** per device
  - **WeighVision**: max **20 msgs/sec** per station
  - Add jitter: random delay **0–200ms**
- On successful publish, mark as ACKed locally and safely delete/compact.

---

## Implementation starting points

- Agents are not built from the backend boilerplates, but should align with:
  - JSON logging conventions (where feasible) for device logs.
  - Request/response formats defined by `shared/01-api-standards.md`.
- Codebases may be embedded (C/C++/Rust) or lightweight Python/Node, but must **not** introduce object storage systems or external in-memory cache/session stores.

---

## Implementation Notes

- Keep IoT-agent logic simple: perform local data collection and minimal validation, delegate heavy logic to the edge.
- Ensure secure provisioning of credentials/keys for connecting to the edge.
- Implement backoff and local queueing only for very small windows (e.g., a few minutes) to avoid hidden long-term buffers at device-level.  

## Links

- `iot-layer/01-iot-sensor-agent.md`
- `iot-layer/02-iot-weighvision-agent.md`
- `iot-layer/03-mqtt-topic-map.md`
- `shared/01-api-standards.md`


