Purpose: Describe the `iot-weighvision-agent` behavior and its integration with the edge layer.  
Scope: Phase 1 and Phase 2 session flows, MQTT event schemas, and the single HTTP multipart upload contract to `edge-media-store`.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## Role and responsibilities

The `iot-weighvision-agent` runs on WeighVision devices (camera + scale) and is responsible for:
- Managing weigh sessions that bind **image frames** with **scale weights**.
- Performing local validation and packaging of capture data.
- Publishing all session events to edge via **MQTT only**.
- Uploading images via **HTTP multipart only** to `edge-media-store`.

Two phases are defined:
- **Phase 1**: Session-based capture (image + weight at the same time).
- **Phase 2**: Scheduled image capture (for continuous monitoring) with optional weights.

---

## Connectivity and protocol choices

FarmIQ enforces **MQTT-only** device→edge ingestion:
- **MQTT (100%)** for all telemetry and session events to the edge broker.
- **HTTP (only)** for **image upload** (multipart) directly to `edge-media-store`.

Authoritative topic:
- `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`

All MQTT messages MUST use the standard MQTT envelope documented in `iot-layer/00-overview.md`.

---

## Phase 1: Session-based capture

### Flow

1. Agent starts a session when an animal is detected on the scale.
2. Capture a reference image and a stable weight from the scale.
3. Publish a **session created** event to MQTT.
4. Upload associated images (one or more frames) to `edge-media-store` via HTTP multipart, including `sessionId` and `traceId`.
5. Publish a **weight recorded** event to MQTT (one or more times).
6. Publish a **session finalized** event to MQTT (including image count).

### MQTT event examples (authoritative envelope)

Broker: `edge-mqtt-broker`  
Topic: `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`

Session created (`eventType=session.created`):

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0200",
  "event_type": "weighvision.session.created",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "weighvision-device-001",
  "station_id": "station-01",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:05:00Z",
  "trace_id": "trace-id-789",
  "payload": {
    "batch_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0400"
  }
}
```

Weight recorded (`eventType=weight.recorded`):

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0201",
  "event_type": "weighvision.session.weight.recorded",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "weighvision-device-001",
  "station_id": "station-01",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:05:10Z",
  "trace_id": "trace-id-789",
  "payload": {
    "weight_kg": 120.5
  }
}
```

Session finalized (`eventType=session.finalized`):

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0202",
  "event_type": "weighvision.session.finalized",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "weighvision-device-001",
  "station_id": "station-01",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:07:00Z",
  "trace_id": "trace-id-789",
  "payload": {
    "image_count": 3
  }
}
```

### Image upload (only HTTP call)

- **Endpoint**: `POST /api/v1/media/images` on `edge-media-store`
- **Content-Type**: `multipart/form-data`
  - **Required fields**:
    - `tenantId`, `farmId`, `barnId`
    - `deviceId`, `stationId` (if applicable)
    - `sessionId` (if applicable)
    - `traceId`
    - `capturedAt`
    - `image` (binary JPEG/PNG)

Example:

```http
POST /api/v1/media/images HTTP/1.1
Content-Type: multipart/form-data; boundary=---XYZ

---XYZ
Content-Disposition: form-data; name="tenantId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002
---XYZ
Content-Disposition: form-data; name="farmId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003
---XYZ
Content-Disposition: form-data; name="barnId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004
---XYZ
Content-Disposition: form-data; name="sessionId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300
---XYZ
Content-Disposition: form-data; name="traceId"

trace-id-789
---XYZ
Content-Disposition: form-data; name="capturedAt"

2025-01-01T10:05:30Z
---XYZ
Content-Disposition: form-data; name="image"; filename="frame-001.jpg"
Content-Type: image/jpeg

...binary...
---XYZ--
```

`edge-media-store` stores the file on PVC and records metadata. `edge-ingress-gateway` consumes MQTT events to drive routing and downstream processing.

---

## Phase 2: Scheduled images and monitoring

In Phase 2, the device captures images on a **fixed schedule** (e.g., every 5–10 minutes) to support group behavior analysis and continuous monitoring.

### Flow

1. Agent captures images on schedule (with or without scale readings).
2. Publish any relevant events via MQTT (e.g., `weighvision.frame.captured`) using the standard envelope.
3. Upload images via `POST /api/v1/media/images` (multipart), optionally without `sessionId` for monitoring captures.

### Scheduled monitoring upload

- **Endpoint**: `POST /api/v1/media/images`
- **Content-Type**: `multipart/form-data`.

Form fields:
- `tenantId`, `farmId`, `barnId`, `deviceId`, `stationId` (optional), `sessionId` (optional), `traceId`.
- `capturedAt`.
- `image`.

Example:

```http
POST /api/v1/media/images HTTP/1.1
Content-Type: multipart/form-data; boundary=---XYZ

---XYZ
Content-Disposition: form-data; name="tenantId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002
---XYZ
Content-Disposition: form-data; name="farmId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003
---XYZ
Content-Disposition: form-data; name="barnId"

018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004
---XYZ
Content-Disposition: form-data; name="deviceId"

weighvision-device-001
---XYZ
Content-Disposition: form-data; name="capturedAt"

2025-01-01T12:00:00Z
---XYZ
Content-Disposition: form-data; name="image"; filename="monitor-1200.jpg"
Content-Type: image/jpeg

...binary...
---XYZ--
```

`edge-media-store` writes the file to PVC and records `media_objects` entries; `edge-vision-inference` may be scheduled to process these images asynchronously.

---

## Offline buffering and replay (mandatory)

When MQTT cannot publish, the device MUST buffer WeighVision session events locally and persist across reboot:
- Buffer up to **72 hours** OR **10,000 events** (whichever smaller).
- Under buffer pressure:
  - Never drop `weighvision.session.created` / `weighvision.session.finalized` if possible.
  - Drop non-critical `weighvision.capture.triggered` first.

Replay strategy:
- Publish buffered events in chronological order by `occurred_at`.
- Throttle: max **20 msgs/sec** per station.
- Add jitter: random delay **0–200ms**.
- On successful publish, mark ACKed locally and safely compact the queue.

---

## Session consistency rules (Phase 1)

Minimum required event set for a valid Phase 1 session:
- `weighvision.session.created`
- `weighvision.weight.read`
- At least 1 image uploaded (HTTP multipart) and referenced by `session_id` (or trace-correlated metadata)
- `weighvision.session.finalized`

Reconciliation rules at edge:
- If an image arrives before `session.created`:
  - Store as **unbound media** and bind later by `session_id`.
- If session events arrive without images for > configurable timeout (default guidance: **10 minutes**):
  - Mark session as **INCOMPLETE** and raise an ops alert.

If images are uploaded while MQTT is offline:
- Device may still upload images via HTTP if network allows.
- Session events must be replayed later with the same `session_id` and `event_id` integrity.

---

## Error handling and retries

- All HTTP requests:
  - Send `x-request-id` (UUID) and `x-trace-id` if the agent is trace-aware (in addition to `traceId` as a multipart field).
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


