Purpose: Define the edge persistence model for buffering telemetry, sessions, media, inference results, and sync state.  
Scope: Edge DB tables, PVC path conventions, and retention/cleanup jobs for offline-first operation.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-17  

---

## Edge storage and buffering goals

The edge layer must keep operating when cloud connectivity is intermittent. Storage is implemented via:
- **Relational DB** for structured data (telemetry, sessions, outbox).
- **Kubernetes PVC filesystem** for media files (images).

Non-negotiable constraints:
- No object storage design.
- No external in-memory cache/session store for cache/session/streams.
- Persistent storage is via **PVC filesystem** (regular read/write) and DB volumes.

---

## Edge DB schema summary (MVP)

Recommended DB: PostgreSQL (local to edge cluster or managed externally).

### `telemetry_raw`

- **Purpose**: Store raw, device-level telemetry samples.
- **Key columns**:
  - `id (uuidv7, pk)`
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`
  - `occurred_at (timestamptz)`
  - `metric_type`, `metric_value`, `unit`
  - `ingested_at (timestamptz)`
- **Indexes**:
  - `(tenant_id, device_id, occurred_at DESC)`
  - `(tenant_id, occurred_at DESC)`

### `telemetry_agg`

- **Purpose**: Store aggregates for faster queries and reduced cloud sync volume.
- **Key columns**:
  - `id (uuidv7, pk)`
  - `tenant_id`, `device_id`
  - `window` (e.g., `1m`, `1h`, `1d`)
  - `bucket_start_at`, `bucket_end_at`
  - `metric_type`, `avg_value`, `min_value`, `max_value`, `count`
- **Indexes**:
  - `(tenant_id, device_id, window, bucket_start_at DESC)`

### `weight_sessions`

- **Purpose**: Session owner table for WeighVision session lifecycle.
- **Key columns**:
  - `id (uuidv7, pk)` (session_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `batch_id (nullable)`
  - `status` (created, finalized, cancelled)
  - `start_at`, `end_at`
  - `initial_weight_kg`, `final_weight_kg`
- **Indexes**:
  - `(tenant_id, device_id, start_at DESC)`
  - `(tenant_id, status, start_at DESC)`

### `media_objects`

- **Purpose**: Metadata for images persisted on PVC.
- **Key columns**:
  - `id (uuidv7, pk)` (media_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `session_id (nullable)`
  - `path` (absolute or mount-relative filesystem path)
  - `mime_type`, `size_bytes`
  - `captured_at`
  - `created_at`
- **Indexes**:
  - `(tenant_id, session_id)`
  - `(tenant_id, device_id, captured_at DESC)`

### `inference_results`

- **Purpose**: Store inference outputs produced by `edge-vision-inference`.
- **Key columns**:
  - `id (uuidv7, pk)` (inference_result_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `session_id (nullable)`
  - `media_id (nullable)` (if result is per-frame)
  - `predicted_weight_kg`, `predicted_size` (optional)
  - `confidence`, `model_version`
  - `occurred_at`
- **Indexes**:
  - `(tenant_id, session_id)`
  - `(tenant_id, device_id, occurred_at DESC)`

### `sync_outbox`

- **Purpose**: Append-only durable event log for cloud synchronization.
- **Ownership**: Written by each edge service for its domain; consumed by `edge-sync-forwarder`.
- **Key columns**:
  - `id (uuidv7, pk)` (event_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `session_id (nullable)`
  - `event_type`
  - `occurred_at`
  - `trace_id` (for observability)
  - `payload_json` (JSONB)
  - `status` (pending, claimed, sent, acked, failed)
  - `attempt_count`, `last_attempt_at`
- **Indexes**:
  - `(status, last_attempt_at ASC)` for forwarder picking work
  - `(tenant_id, occurred_at DESC)`
  - Unique constraint on `(tenant_id, id)` (idempotency key)

### `sync_state`

- **Purpose**: Track edge-to-cloud sync checkpoints and backpressure status.
- **Key columns**:
  - `tenant_id (pk)`
  - `last_acked_event_id`
  - `last_acked_at`
  - `last_sent_batch_id`
  - `consecutive_failures`
  - `paused_until (nullable)`

---

## Ingress dedupe (mandatory, DB TTL cache)

To support MQTT at-least-once delivery and prevent duplicate processing storms, `edge-ingress-gateway` MUST dedupe MQTT messages using an Edge DB TTL cache.

### `ingress_dedupe`

- **Purpose**: Record first-seen event IDs for a short TTL window to dedupe re-deliveries.
- **Key columns**:
  - `tenant_id`
  - `event_id`
  - `first_seen_at`
- **Indexes/constraints**:
  - Unique: `(tenant_id, event_id)`
  - Index: `(first_seen_at ASC)` for cleanup
- **TTL and cleanup**
  - Cleanup job (CronJob) deletes rows older than a configurable TTL (guidance: 24–72 hours).
  - This table is not an audit log; it is a bounded operational dedupe cache.

---

## PVC path conventions (media)

Edge media MUST be stored on a Kubernetes PVC mounted to `/data/media`.

### Required path pattern

`/data/media/{tenant_id}/{farm_id}/{barn_id}/{session_id}/{captured_at}_{media_id}.jpg`

If `session_id` is not applicable (Phase 2 monitoring images), use:

`/data/media/{tenant_id}/{farm_id}/{barn_id}/monitoring/{device_id}/{captured_at}_{media_id}.jpg`

### Operational notes

- Directory creation must be idempotent.
- File writes should be atomic:
  - Write to a temp file then rename.
- Store `size_bytes`, `mime_type`, and `sha256` (optional) in `media_objects` to support integrity checks.

---

## Retention and cleanup jobs

### Telemetry retention (edge)

- `telemetry_raw`: default **30–90 days** retention (configurable).
- `telemetry_agg`: default **6–12 months** retention (configurable).

Cleanup approach:
- Prefer time-based partitioning (monthly partitions) then drop partitions past retention.
- Ensure cloud sync is healthy before dropping raw data if business requires cloud persistence.

### Media retention (edge)

- Default retention: **30–90 days** (configurable).
- Cleanup job:
  - Identify expired rows in `media_objects` by `captured_at`.
  - Delete filesystem file first (or mark missing if already removed).
  - Delete metadata row.
  - Do not delete if linked to a non-finalized session unless explicitly configured.

### Outbox retention

- Keep `sync_outbox` rows for at least **7–30 days** after ack for audit/troubleshooting.
- Periodically archive or delete acked events beyond retention.

### Ingress dedupe retention

- Retain `ingress_dedupe` entries only for the dedupe TTL window.
- Cleanup job should run frequently (e.g., every 15–60 minutes) to keep the table bounded.

---

## Implementation Notes

- All services must use UUID v7 for high-write tables in line with GT&D standards.
- Avoid storing sensitive PII in telemetry, media metadata, or logs.
- Edge storage sizing must account for offline windows (e.g., worst-case days without cloud connectivity) and be reflected in Kubernetes PVC capacity planning.


