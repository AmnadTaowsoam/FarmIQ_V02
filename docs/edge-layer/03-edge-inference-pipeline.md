Purpose: Describe the end-to-end WeighVision inference pipeline on the edge, including offline behavior and failure handling.  
Scope: Pipeline steps from media storage to inference and session finalization, with latency targets and retry strategy.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-17  

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
  A["edge-media-store"]
  B["edge-rabbitmq optional"]
  C["edge-vision-inference"]
  D["edge-weighvision-session"]
  E["sync_outbox"]
  F["edge-sync-forwarder"]
  G["cloud-ingestion"]

  A -->|["publish inference job"]| B
  B -->|["deliver job"]| C
  C -->|["write inference_results"]| D
  D -->|["append events"]| E
  E -->|["batch + send"]| F
  F -->|["HTTPS"]| G
```

---

## Detailed steps

### 1) Media storage (PVC)

- `edge-ingress-gateway` receives image uploads from `iot-weighvision-agent`.
- `edge-ingress-gateway` forwards the upload to `edge-media-store`.
- `edge-media-store`:
  - Writes the file under `/data/media/...` on PVC.
  - Creates a `media_objects` row.
  - Writes a `media.stored` event to `sync_outbox`.

### 2) Inference job dispatch (Edge RabbitMQ)

To satisfy “RabbitMQ as message broker (Edge + Cloud)” without breaking the outbox design:
- `edge-media-store` publishes an `inference.requested` job message to Edge RabbitMQ.
- Queue example: `farmiq.edge-vision-inference.jobs.queue`.
- The message should include:
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

### 3) Inference execution

- `edge-vision-inference` consumes jobs from Edge RabbitMQ.
- It fetches the media file through `edge-media-store` internal API (preferred) or directly via shared mount if configured.
- It runs the ML model and stores outputs into `inference_results`.
- It writes `inference.completed` to `sync_outbox`.

### 4) Session update and finalization

`edge-weighvision-session`:
- Associates `inference_results` to `weight_sessions`.
- On explicit finalize from device (Phase 1) or policy-based finalize (Phase 2):
  - Updates session status and final weight.
  - Writes `weighvision.session.finalized` to `sync_outbox`.

### 5) Sync to cloud (Outbox → HTTPS)

- `edge-sync-forwarder` batches `sync_outbox` rows and posts to `cloud-ingestion`.
- Cloud side dedupes using `event_id + tenant_id`.
- Cloud publishes into `cloud-rabbitmq`.

---

## Offline mode behavior

When cloud connectivity is down:
- Media continues to be stored on PVC.
- Telemetry and session state continues to be stored in the edge DB.
- Inference continues to run locally using Edge RabbitMQ queues.
- `edge-sync-forwarder` pauses cloud sync but continues retrying with backoff and retains events in `sync_outbox`.

When connectivity returns:
- `edge-sync-forwarder` resumes batching and sends events in order (or by priority).

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

- **Media disk full (PVC)**
  - Symptom: upload failures, `edge-media-store` errors.
  - Mitigation:
    - Alert on PVC usage via Datadog.
    - Enforce retention cleanup jobs.
    - Backpressure image capture (agent-side) if needed.

- **Inference queue backlog (Edge RabbitMQ)**
  - Symptom: increasing queue depth, increased latency.
  - Mitigation:
    - Horizontal scale inference workers (more replicas).
    - Implement per-tenant rate limits / priority queues.

- **Inference failures (model/runtime)**
  - Symptom: repeated job failures, DLQ growth.
  - Mitigation:
    - Use DLQ on Edge RabbitMQ for poisoned messages.
    - Include job idempotency and safe retries.
    - Alert on error rate spikes.

- **Sync stuck (outbox)**
  - Symptom: `sync_outbox` pending rows increasing; no acks.
  - Mitigation:
    - Alert on pending backlog and consecutive failures.
    - Provide `/api/v1/sync/state` and `/api/v1/sync/trigger` for manual recovery.

---

## Implementation Notes

- Keep Edge RabbitMQ usage focused on internal async tasks (like inference), while cloud sync remains outbox-driven for auditability and deterministic retries.
- All services must emit structured JSON logs and include `trace_id`/`x-request-id` to enable Datadog correlation.


