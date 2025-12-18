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
- Stateless where possible; no long-term persistence beyond the required offline outbox/buffer.
- Resilient to extended connectivity loss via **store-and-forward buffering that persists across reboot** (multi-hour windows; see offline rules).
- Use authenticated connections (e.g., mutual TLS or token-based auth) to the edge.

---

## Device identity and provisioning (basics)

Each IoT agent/device must be provisioned with:
- `tenant_id`, `farm_id`, `barn_id`, `device_id`
- Edge connection settings (MQTT broker host/port, and `edge-media-store` base URL for presign/upload)
- Credentials (recommended: per-device certificate for mTLS, or signed device token)

Provisioning principles:
- Unique identity per device (no shared credentials across devices).
- Rotation and revocation supported operationally.
- Time sync (NTP) recommended to keep timestamps consistent (UTC at the payload level).

---

## Communication with edge

FarmIQ enforces **MQTT-only** device→edge ingestion:
- **MQTT (100%)** for all telemetry and session events to the edge broker.
- **HTTP (only)** for **media upload** via **presigned URL** issued by `edge-media-store`.

**No HTTP fallback** for telemetry or events; devices must use MQTT with offline buffering.

API expectations (for HTTP media upload only):
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

All MQTT messages MUST use this envelope (fields are required unless marked optional). See `iot-layer/03-mqtt-topic-map.md` for the complete schema.

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

Required fields:
- `event_id`, `trace_id`, `tenant_id`, `device_id`, `event_type`, `ts`, `payload`

Optional fields:
- `schema_version`: defaults to `"1.0"` if omitted by the device (edge may add/normalize).
- `content_hash`: optional hash of `payload` for integrity/debugging (do not treat as security control).
- `retry_count`: optional number of local publish retries (for diagnostics only).
- `produced_at`: optional timestamp when message was produced (if different from `ts`).

Notes:
- `trace_id` must be present; if missing, `edge-ingress-gateway` enriches it.
- Topic segments carry routing context (e.g., `farmId`, `barnId`, `stationId`, `sessionId`) and MUST match what the device is provisioned for.

---

## MQTT QoS policy and offline rules (authoritative)

See `iot-layer/03-mqtt-topic-map.md` for the complete QoS/retained/LWT rules.

### QoS and retain policy (authoritative)

- **Telemetry readings** (every ~1 minute)
  - **QoS**: **1** (at-least-once)
  - **Retain**: **NO**
  - **Event type**: `telemetry.reading`

- **WeighVision session events** (must not be lost)
  - **QoS**: **1**
  - **Retain**: **NO**
  - **Events**:
    - `weighvision.session.created`
    - `weighvision.weight.recorded`
    - `weighvision.image.captured`
    - `weighvision.inference.completed`
    - `weighvision.session.finalized`

- **Device status/heartbeat** (latest state only)
  - **QoS**: **1**
  - **Retain**: **YES**
  - **Topic**: `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`
  - **LWT (Last Will and Testament)**: publish an "offline" status when the device disconnects unexpectedly.
  - **Payload must include**: `last_seen_at`, `firmware_version`, `ip` (optional), `signal_strength` (optional), health flags (e.g., `camera_ok`, `scale_ok`, `disk_ok`)

### Duplicate delivery and idempotency (mandatory)

- Every MQTT message MUST include: `event_id` (UUID), `ts`, `trace_id`.
- Edge must treat MQTT delivery as **at-least-once**.
- Edge must dedupe on `(tenant_id, event_id)` using an **Edge DB TTL cache**.
- Cloud ingestion must also dedupe on `(tenant_id, event_id)` for safety.

### Device offline buffering (store-and-forward; must persist across reboot)

If MQTT is disconnected, buffer locally (file queue JSONL or SQLite):
- **Telemetry**: up to configurable limits (guidance: **6 hours** OR **360 messages**; drop oldest first).
- **WeighVision events**: up to configurable limits (guidance: **72 hours** OR **10,000 events**; preserve created/finalized, drop non-critical first).

Storage options (device dependent):
- Append-only JSONL file queue, or
- Embedded DB (SQLite).

### Replay strategy (when connection restored)

- Publish buffered messages in chronological order by `ts`.
- Backoff + retry with jitter (**0–200ms**) to prevent thundering herd.
- Preserve ordering per device/session.
- Throttle guidance:
  - **Telemetry**: max **5 msgs/sec** per device
  - **WeighVision**: max **20 msgs/sec** per station
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
- Offline buffering supports multi-hour windows (6 hours for telemetry, 72 hours for WeighVision events) to handle extended connectivity loss.
- All MQTT topics, event types, envelope schema, and QoS rules are defined in `iot-layer/03-mqtt-topic-map.md` (single source of truth).  

## Links

- `iot-layer/01-iot-sensor-agent.md`
- `iot-layer/02-iot-weighvision-agent.md`
- `iot-layer/03-mqtt-topic-map.md`
- `shared/01-api-standards.md`
