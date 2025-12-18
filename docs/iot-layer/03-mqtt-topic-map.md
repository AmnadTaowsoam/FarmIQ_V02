Purpose: Provide the authoritative MQTT topic map, envelope schema, QoS/retained rules, and offline replay rules for FarmIQ devices.  
Scope: Canonical topic patterns, event types, standard envelope, QoS/LWT policy, offline buffering + replay, and examples.  
Owner: FarmIQ Edge + IoT Team  
Last updated: 2025-12-17  

---

## A) Canonical MQTT topic patterns (authoritative)

- **Telemetry**  
  `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`

- **Generic events**  
  `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`

- **WeighVision session events**  
  `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`

- **Status (retained)**  
  `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`

---

## B) Event types list (authoritative)

- **`telemetry.reading`**: One telemetry sample for a specific metric.
- **`sensor.heartbeat`** (optional): Device heartbeat event (in addition to retained status).
- **`device.status`**: Latest device status payload (retained on `iot/status/...`).
- **`weighvision.session.created`**: WeighVision session started.
- **`weighvision.weight.recorded`**: A scale weight measurement associated with a session.
- **`weighvision.image.captured`**: Image capture notification (image is uploaded via HTTP presigned URL).
- **`weighvision.inference.completed`**: Inference result computed (usually produced by edge inference, may be forwarded to cloud).
- **`weighvision.session.finalized`**: Session ended/finalized.

---

## C) Standard MQTT envelope schema (JSON)

All MQTT messages MUST use this envelope (fields are required unless marked optional):

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

Notes:
- Topic segments carry routing context (e.g., `farmId`, `barnId`, `stationId`, `sessionId`) and MUST match what the device is provisioned for.
- Devices MUST NOT rely on HTTP fallback for telemetry/events; all device → edge ingestion is MQTT-only.
- **`content_hash`** (optional): hash of `payload` for integrity/debugging (do not treat as security control).
- **`retry_count`** (optional): number of local publish retries (for diagnostics only).
- **`produced_at`** (optional): timestamp the agent produced the message (useful when replaying buffered events); if omitted, `ts` is used.

---

## D) QoS + retained + LWT rules (copy-paste ready)

### Telemetry

- QoS: **1** (at-least-once)
- Retained: **NO**

### WeighVision events

- QoS: **1**
- Retained: **NO**

### Status topic

- Topic: `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`
- QoS: **1**
- Retained: **YES**
- LWT (Last Will and Testament): publish an “offline” status when the device disconnects unexpectedly.

Status payload must include:
- `last_seen_at`
- `firmware_version`
- `ip` (optional)
- `signal_strength` (optional)
- health flags (e.g., `camera_ok`, `scale_ok`, `disk_ok`)

---

## E) Offline rules

### Local buffering (store-and-forward; must persist across reboot)

If MQTT is disconnected, buffer locally (file queue JSONL or SQLite):
- **Telemetry**: up to configurable limits (guidance: 6 hours OR 360 messages; drop oldest first).
- **WeighVision events**: up to configurable limits (guidance: 72 hours OR 10,000 events; preserve created/finalized, drop non-critical first).

### Replay strategy (when connection restored)

- Publish buffered messages in chronological order by `ts`.
- Backoff + retry with jitter (0–200ms) to prevent thundering herd.
- Preserve ordering per device/session.

### Dedup strategy

- `event_id` is mandatory.
- `edge-ingress-gateway` dedupes by `(tenant_id, event_id)` using a TTL cache in the **edge DB** (no in-memory cache store).
- Cloud also dedupes by `(tenant_id, event_id)` for defense in depth.

---

## F) Examples

### Example 1: Telemetry temperature

Topic:
`iot/telemetry/t-001/f-001/b-001/d-001/temperature`

Message:

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "trace_id": "trace-abc",
  "event_type": "telemetry.reading",
  "tenant_id": "t-001",
  "device_id": "d-001",
  "ts": "2025-12-17T01:00:00Z",
  "payload": { "value": 26.4, "unit": "C" }
}
```

### Example 2: WeighVision session created

Topic:
`iot/weighvision/t-001/f-001/b-001/st-01/session/s-123/weighvision.session.created`

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0200",
  "trace_id": "trace-wv",
  "event_type": "weighvision.session.created",
  "tenant_id": "t-001",
  "device_id": "wv-001",
  "ts": "2025-12-17T01:05:00Z",
  "payload": { "batch_id": "batch-001" }
}
```

### Example 3: Retained device status

Topic:
`iot/status/t-001/f-001/b-001/d-001`

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0900",
  "trace_id": "trace-status",
  "event_type": "device.status",
  "tenant_id": "t-001",
  "device_id": "d-001",
  "ts": "2025-12-17T01:00:30Z",
  "payload": {
    "last_seen_at": "2025-12-17T01:00:30Z",
    "firmware_version": "1.2.3",
    "ip": "192.168.1.10",
    "signal_strength": -67,
    "health": { "camera_ok": true, "scale_ok": true, "disk_ok": true }
  }
}
```

---

## Implementation Notes

- `edge-ingress-gateway` is responsible for topic validation, envelope validation, trace enrichment, dedupe, and routing.
- Do not log full payloads; log only IDs, `event_type`, `trace_id`, and payload sizes.




