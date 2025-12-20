Purpose: Describe the end-to-end WeighVision inference pipeline on the edge, including offline behavior and failure handling.  
Scope: Pipeline steps from media storage to inference and session finalization, with latency targets and retry strategy.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-20  

---

## Pipeline overview

The edge inference pipeline connects these owners:
- **Media owner**: `edge-media-store`
- **Inference owner**: `edge-vision-inference`
- **Session owner**: `edge-weighvision-session`
- **Sync owner**: `edge-sync-forwarder`

High-level flow:
- Media stored on PVC → inference job queued → inference result persisted → session finalized → outbox event → synced to cloud.

---

## Mermaid flow (compilable)

```mermaid
flowchart LR
  A["iot-weighvision-agent"]
  B["edge-media-store"]
  C["edge-rabbitmq optional"]
  D["edge-vision-inference"]
  E["edge-weighvision-session"]
  F["sync_outbox"]
  G["edge-sync-forwarder"]
  H["cloud-ingestion"]

  A -->|["HTTP presign + PUT"]| B
  A -->|["MQTT events"]| I["edge-ingress-gateway"]
  B -->|["publish inference job"]| C
  B -->|["OR synchronous POST"]| D
  C -->|["deliver job"]| D
  D -->|["write inference_results"]| E
  E -->|["append events"]| F
  F -->|["batch + send"]| G
  G -->|["HTTPS"]| H
  I -->|["route events"]| E
```

---

## Detailed steps

### 1) Media storage (S3)

- `iot-weighvision-agent` uploads images directly to `edge-media-store` via presigned URL flow:
  1. Device calls `POST /api/v1/media/images/presign` on `edge-media-store` (authenticated via `x-tenant-id` header).
  2. `edge-media-store` returns S3 presigned `upload_url` and `object_key`.
  3. Device uploads binary image via `PUT {upload_url}` directly to S3.
- `edge-media-store`:
  - Stores the file in S3-compatible object storage (MinIO or AWS S3) at the object key.
  - Creates a `media_objects` row in DB with metadata.
  - Writes a `media.stored` event to `sync_outbox`.
  - Triggers inference job dispatch (see step 2).

**Note**: `edge-ingress-gateway` does NOT receive or proxy image bytes. Devices bypass the gateway for media uploads to avoid bottleneck and scale better.

### 2) Inference job dispatch

**Current Implementation Status**: Only **Mode B (Synchronous HTTP POST)** is currently implemented. Mode A (RabbitMQ) is planned for future enhancement.

**Decision**: Edge RabbitMQ is **optional**. Two modes are planned:

#### Mode A: RabbitMQ (Future/Optional - Not Currently Implemented)

- `edge-media-store` publishes an `inference.requested` job message to Edge RabbitMQ.
- Queue: `farmiq.edge-vision-inference.jobs.queue`.
- Exchange: `farmiq.edge-vision-inference.exchange` (topic or direct).
- Routing key: `inference.requested`.

**Queue Configuration (Production Requirements)**:
- **Prefetch**: Set consumer prefetch to **10 jobs** per worker (prevents worker overload).
- **Durability**: Queue MUST be durable (survive broker restarts).
- **DLQ (Dead Letter Queue)**:
  - DLQ name: `farmiq.edge-vision-inference.jobs.dlq`
  - Behavior: After **3 retries** (configurable), message moves to DLQ.
  - Retry policy: Exponential backoff with max delay 5 minutes.
  - Manual inspection required for DLQ messages (poisoned jobs).
- **Idempotency**: Job messages MUST include `event_id` (UUID) to prevent duplicate processing. Consumer checks `inference_results` table for existing `event_id` before processing.

**Message Payload**:
- The message should include:
  - `event_id` (UUID; idempotency key)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`
  - `media_id`
  - `session_id` (optional for Phase 2 monitoring images)
  - `trace_id`

Example job payload:

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0a00",
  "event_type": "inference.requested",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "weighvision-device-001",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:05:30Z",
  "trace_id": "trace-id-131415",
  "payload": {
    "media_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0601"
  }
}
```

#### Mode B: Synchronous HTTP POST (Currently Implemented)

- `edge-media-store` calls `POST /api/v1/inference/jobs` on `edge-vision-inference` synchronously after storing media.
- Request body: Same payload structure as RabbitMQ message above.
- Response: `{ job_id: string, status: "processing" | "completed" }` (or async response with job_id for polling).
- **Use Case**: Current production implementation. Suitable for development environments, small deployments, or when RabbitMQ is unavailable.
- **Current Status**: ✅ **IMPLEMENTED** - This is the only mode currently available.

**Trade-offs**:
- **Pros**: Simpler deployment (no RabbitMQ), synchronous feedback, fully functional.
- **Cons**: Blocks media-store request, no natural backpressure, harder to scale inference workers horizontally.
- **Future Enhancement**: RabbitMQ mode (Mode A) can be added later for better scalability and decoupling.

### 3) Inference execution

- `edge-vision-inference`:
- **Mode A (RabbitMQ)**: (Future) Would consume jobs from Edge RabbitMQ queue.
- **Mode B (HTTP POST)**: ✅ **Currently implemented** - Receives jobs via `POST /api/v1/inference/jobs` HTTP endpoint.
- Fetches the media file through `edge-media-store` internal API (`GET /api/v1/media/objects/{objectId}`).
- Runs the ML model and stores outputs into `inference_results` table.
- Checks for duplicate `event_id` before processing (idempotency).
- Writes `inference.completed` event to `sync_outbox`.

### 4) Session update and finalization

`edge-weighvision-session`:
- Associates `inference_results` to `weight_sessions` (via `session_id` foreign key).
- On explicit finalize from device (Phase 1) or policy-based finalize (Phase 2):
  - Updates session status and final weight.
  - Writes `weighvision.session.finalized` event to `sync_outbox`.

### 5) Sync to cloud (Outbox → HTTPS)

- `edge-sync-forwarder` batches `sync_outbox` rows and posts to `cloud-ingestion`.
- Cloud side dedupes using `event_id + tenant_id` (where `event_id` is `sync_outbox.id`).
- Cloud publishes into `cloud-rabbitmq`.

---

## Offline mode behavior

When cloud connectivity is down:
- Media continues to be stored on PVC.
- Telemetry and session state continues to be stored in the edge DB.
- Inference continues to run locally (using Edge RabbitMQ queues if enabled, or synchronous mode).
- `edge-sync-forwarder` pauses cloud sync but continues retrying with backoff and retains events in `sync_outbox`.

When connectivity returns:
- `edge-sync-forwarder` resumes batching and sends events in order (or by priority, per-tenant ordering).

---

## Latency targets (guidance)

Targets are implementation-dependent but typical goals:
- **Phase 1 (interactive)**:
  - End-to-end from image upload to inference complete: **≤ 5–15 seconds** (depending on hardware).
  - Session finalize acknowledgement to device: **≤ 1–3 seconds** (finalization may be decoupled from inference if needed).
- **Phase 2 (scheduled)**:
  - Inference completion: **≤ 1–5 minutes** acceptable.

---

## Retry strategy and failure modes

### Failures and mitigations

- **Media storage quota exceeded (S3)**
  - Symptom: upload failures, `edge-media-store` S3 errors (403/507).
  - Mitigation:
    - Alert on S3 storage quota via Datadog (warning > 75%, critical > 90%).
    - Enforce retention cleanup jobs or S3 lifecycle policies.
    - Backpressure image capture (agent-side) if needed.

- **Inference queue backlog (Edge RabbitMQ)** (Mode A only - Future)
  - Symptom: increasing queue depth, increased latency.
  - Mitigation: (When Mode A is implemented)
    - Horizontal scale inference workers (more replicas).
    - Implement per-tenant rate limits / priority queues.
    - Alert on queue depth > 1000 (warning) / > 10000 (critical).

- **Inference failures (model/runtime)**
  - Symptom: repeated job failures, HTTP 500 errors (Mode B - current).
  - Mitigation:
    - **Mode A (Future)**: Would use DLQ on Edge RabbitMQ for poisoned messages (3 retries then DLQ).
    - **Mode B (Current)**: Return HTTP error, let caller retry (with exponential backoff).
    - Include job `event_id` in error logs for idempotency tracking.
    - Alert on error rate spikes (> 1% failure rate).
    - Manual inspection of DLQ messages required.

- **Sync stuck (outbox)**
  - Symptom: `sync_outbox` pending rows increasing; no acks.
  - Mitigation:
    - Alert on pending backlog > 1000 (warning) / > 10000 (critical) and oldest pending age > 1 hour (warning) / > 24 hours (critical).
    - Provide `/api/v1/sync/state` and `/api/v1/sync/trigger` for manual recovery.

---

## Implementation Notes

- **Current Implementation**: Only Mode B (HTTP POST) is implemented. RabbitMQ mode is planned for future enhancement.
- Keep Edge RabbitMQ usage (when implemented) focused on internal async tasks (like inference), while cloud sync remains outbox-driven for auditability and deterministic retries.
- All services must emit structured JSON logs and include `trace_id`/`x-request-id` to enable Datadog correlation.
- **RabbitMQ Mode Selection (Future)**: When Mode A is implemented, configure via environment variable (e.g., `EDGE_RABBITMQ_ENABLED=true/false`). Default to RabbitMQ mode for production, synchronous mode for development.

