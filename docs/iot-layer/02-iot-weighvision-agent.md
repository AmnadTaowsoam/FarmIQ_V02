Purpose: Describe the `iot-weighvision-agent` behavior and its integration with the edge layer.  
Scope: Phase 1 and Phase 2 session flows, MQTT event schemas, and the single HTTP presigned upload contract to `edge-media-store`.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## Role and responsibilities

The `iot-weighvision-agent` runs on WeighVision devices (camera + scale) and is responsible for:
- Managing weigh sessions that bind **image frames** with **scale weights**.
- Performing local validation and packaging of capture data.
- Publishing all session events to edge via **MQTT only**.
- Uploading images via **HTTP presigned URL only** to `edge-media-store`.

Two phases are defined:
- **Phase 1**: Session-based capture (image + weight at the same time).
- **Phase 2**: Scheduled image capture (for continuous monitoring) with optional weights.

---

## Connectivity and protocol choices

FarmIQ enforces **MQTT-only** device→edge ingestion:
- **MQTT (100%)** for all telemetry and session events to the edge broker.
- **HTTP (only)** for **media upload** via **presigned URL** issued by `edge-media-store`.

Authoritative topic:
- `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`

All MQTT messages MUST use the standard MQTT envelope documented in `iot-layer/03-mqtt-topic-map.md` (single source of truth).

---

## Phase 1: Session-based capture

### Flow

1. Agent starts a session when an animal is detected on the scale.
2. Capture a reference image and a stable weight from the scale.
3. Publish a **session created** event to MQTT.
4. Upload associated images (one or more frames) to `edge-media-store` via presigned URL (presign request + `PUT` upload), including `sessionId` and `traceId`.
5. Publish a **weight recorded** event to MQTT (one or more times).
6. Publish a **session finalized** event to MQTT (including image count).

### MQTT event examples (authoritative envelope)

Broker: `edge-mqtt-broker`  
Topic: `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`

Session created (`eventType=weighvision.session.created`):

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0200",
  "trace_id": "trace-id-789",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "weighvision-device-001",
  "event_type": "weighvision.session.created",
  "ts": "2025-01-01T10:05:00Z",
  "payload": {
    "batch_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0400"
  }
}
```

Weight recorded (`eventType=weighvision.weight.recorded`):

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0201",
  "trace_id": "trace-id-789",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "weighvision-device-001",
  "event_type": "weighvision.weight.recorded",
  "ts": "2025-01-01T10:05:10Z",
  "payload": {
    "weight_kg": 120.5
  }
}
```

Session finalized (`eventType=weighvision.session.finalized`):

```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0202",
  "trace_id": "trace-id-789",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "weighvision-device-001",
  "event_type": "weighvision.session.finalized",
  "ts": "2025-01-01T10:07:00Z",
  "payload": {
    "image_count": 3
  }
}
```

### Image upload (only HTTP call)

- **Step 1 (presign)**: `POST /api/v1/media/images/presign` on `edge-media-store`
  - Request body (JSON): `tenantId`, `farmId`, `barnId`, `deviceId`, `stationId` (optional), `sessionId` (optional), `traceId`, `capturedAt`, `contentType`, `contentLength` (optional)
  - Response: `upload_url`, `media_id`, `expires_at` (+ optional required headers)

- **Step 2 (upload)**: `PUT {upload_url}` (binary JPEG/PNG)
  - Use the returned URL until `expires_at`.

- **Step 3 (notify)**: publish `weighvision.image.captured` via MQTT with a `payload` that includes `media_id` (and optional `content_type`, `size_bytes`, `sha256`).

`edge-media-store` stores the file on PVC and records metadata. `edge-ingress-gateway` consumes MQTT events to drive routing and downstream processing.

---

## Phase 2: Scheduled images and monitoring

In Phase 2, the device captures images on a **fixed schedule** (e.g., every 5–10 minutes) to support group behavior analysis and continuous monitoring.

### Flow

1. Agent captures images on schedule (with or without scale readings).
2. Upload images via presigned URL (presign request + `PUT` upload), optionally without `sessionId` for monitoring captures.
3. Publish any relevant events via MQTT (e.g., `weighvision.image.captured`) using the standard envelope.

### Scheduled monitoring upload

- Use the same presign+upload flow as Phase 1, but omit `sessionId` when the capture is not part of a session.
- Publish `weighvision.image.captured` on the generic events topic or a WeighVision topic depending on whether a `sessionId` exists (see `iot-layer/03-mqtt-topic-map.md`).

`edge-media-store` writes the file to PVC and records `media_objects` entries; `edge-vision-inference` may be scheduled to process these images asynchronously.

---

## Offline buffering and replay (mandatory)

When MQTT is disconnected, buffer locally (file queue JSONL or SQLite):
- Buffer up to configurable limits (guidance: **72 hours** OR **10,000 events**; preserve created/finalized, drop non-critical first).

Replay strategy (when connection restored):
- Publish buffered messages in chronological order by `ts`.
- Backoff + retry with jitter (**0–200ms**) to prevent thundering herd.
- Preserve ordering per device/session.
- Throttle: max **20 msgs/sec** per station.
- On successful publish, mark ACKed locally and safely compact the queue.

---

## Session consistency rules (Phase 1)

Minimum required event set for a valid Phase 1 session:
- `weighvision.session.created`
- `weighvision.weight.recorded`
- At least 1 image uploaded (HTTP presigned URL) and referenced by `media_id` (correlated to the session via the topic `sessionId` and media metadata)
- `weighvision.session.finalized`

Reconciliation rules at edge:
- If an image arrives before `session.created`:
  - Store as **unbound media** and bind later by the `sessionId` from media metadata + the MQTT topic.
- If session events arrive without images for > configurable timeout (default guidance: **10 minutes**):
  - Mark session as **INCOMPLETE** and raise an ops alert.

If images are uploaded while MQTT is offline:
- Device may still upload images via HTTP if network allows.
- Session events must be replayed later with the same topic `sessionId` and `event_id` integrity.

---

## Error handling and retries

- All HTTP requests:
  - Send `x-request-id` (UUID) and `x-trace-id` if the agent is trace-aware (and include `traceId` in the presign request body).
  - Expect the standard error format on failure.
- MQTT events:
  - Must include `trace_id` in the envelope.
  - Use QoS 1 for at-least-once delivery (idempotency is handled on edge/cloud).
- The agent should:
  - Retry MQTT publishes and image uploads with exponential backoff on network errors.
  - Avoid infinite retries; after a configurable limit, fail the local session and surface the error in device logs / UI.

---

## Implementation Notes

- Ensure timestamps are in UTC and synchronized (NTP where possible) to reduce clock skew with the edge.
- Compression and downscaling of images should be applied conservatively to balance quality and bandwidth.
- The agent must not introduce object storage systems or external in-memory cache/session stores; all durable storage is handled at the edge via PVCs.  
