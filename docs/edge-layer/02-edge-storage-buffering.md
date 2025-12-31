Purpose: Define the edge persistence model for buffering telemetry, sessions, media, inference results, and sync state.  
Scope: Edge DB tables, PVC path conventions, retention/cleanup jobs, and outbox state machine for offline-first operation.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-31  

---

## Edge storage and buffering goals

The edge layer must keep operating when cloud connectivity is intermittent. Storage is implemented via:
- **Relational DB** for structured data (telemetry, sessions, outbox).
- **S3-compatible object storage** for media files (images) — MinIO recommended for local/edge, AWS S3 for cloud.

Non-negotiable constraints:
- No external in-memory cache/session store for cache/session/streams.
- Persistent storage is via **S3-compatible object storage** (for media) and **DB volumes** (for structured data).
- Media files are stored in S3 buckets, not on PVC filesystem.

---

## Edge DB schema summary (MVP)

Recommended DB: PostgreSQL (local to edge cluster or managed externally).

### `telemetry_raw`

- **Purpose**: Store raw, device-level telemetry samples.
- **Key columns**:
  - `id (uuid, pk)`
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
  - `id (uuid, pk)`
  - `tenant_id`, `device_id`
  - `window` (e.g., `1m`, `1h`, `1d`)
  - `bucket_start_at`, `bucket_end_at`
  - `metric_type`, `avg_value`, `min_value`, `max_value`, `count`
- **Indexes**:
  - `(tenant_id, device_id, window, bucket_start_at DESC)`

### `weight_sessions`

- **Purpose**: Session owner table for WeighVision session lifecycle.
- **Key columns**:
  - `id (uuid, pk)` (session_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `batch_id (nullable)`
  - `status` (created, finalized, cancelled)
  - `start_at`, `end_at`
  - `initial_weight_kg`, `final_weight_kg`
- **Indexes**:
  - `(tenant_id, device_id, start_at DESC)`
  - `(tenant_id, status, start_at DESC)`

### `media_objects`

- **Purpose**: Metadata for images stored in S3-compatible object storage.
- **Key columns**:
  - `id (uuid, pk)` (media_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `session_id (nullable)`
  - `bucket` (S3 bucket name)
  - `object_key` (S3 object key)
  - `etag` (optional)
  - `mime_type`, `size_bytes`
  - `captured_at`
  - `created_at`
- **Indexes**:
  - `(tenant_id, session_id)`
  - `(tenant_id, device_id, captured_at DESC)`

### `inference_results`

- **Purpose**: Store inference outputs produced by `edge-vision-inference`.
- **Key columns**:
  - `id (uuid, pk)` (inference_result_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `session_id (nullable)`
  - `media_id (nullable)` (if result is per-frame)
  - `predicted_weight_kg`, `predicted_size` (optional)
  - `confidence`, `model_version`
  - `occurred_at`
- **Indexes**:
  - `(tenant_id, session_id)`
  - `(tenant_id, device_id, occurred_at DESC)`

### `sync_outbox`

- **Purpose**: Append-only durable event log for cloud synchronization. Supports horizontal scaling of `edge-sync-forwarder` via claim/lease mechanism with retry scheduling and DLQ.
- **Ownership**: Written by each edge service for its domain; consumed by `edge-sync-forwarder`.
- **Key columns**:
  - `id (uuid, pk)` (event_id; used as cloud idempotency key with tenant_id)
  - `tenant_id`, `farm_id`, `barn_id`, `device_id`, `session_id (nullable)`
  - `event_type`
  - `occurred_at` (timestamptz, nullable)
  - `trace_id` (text, nullable; for observability)
  - `payload_json` (JSONB; immutable after creation)
  - `payload_size_bytes` (int, nullable; optional size tracking)
  - `status` (text: pending, claimed, sending, acked, dlq, failed)
  - `priority` (int, default: 0; higher priority processed first)
  - `attempt_count` (int, default: 0)
  - `last_attempt_at` (timestamptz, nullable)
  - `next_attempt_at` (timestamptz, NOT NULL, default: NOW(); critical for retry scheduling)
  - `claimed_by` (text, nullable; pod/instance identifier for lease tracking)
  - `claimed_at` (timestamptz, nullable)
  - `lease_expires_at` (timestamptz, nullable; default: claimed_at + lease_seconds)
  - `last_error_code` (text, nullable; e.g., HTTP_500, NETWORK_ERROR)
  - `last_error_message` (text, nullable; error details)
  - `failed_at` (timestamptz, nullable; timestamp when moved to DLQ)
  - `dlq_reason` (text, nullable; e.g., max_attempts_exceeded)
  - `created_at` (timestamptz, default: NOW())
  - `updated_at` (timestamptz, default: NOW(), on update: NOW())
- **Indexes**:
  - `(status, next_attempt_at, occurred_at)` for forwarder picking work (with `FOR UPDATE SKIP LOCKED`)
  - `(tenant_id, occurred_at DESC)` for ordering and audit
  - `(tenant_id, id)` unique constraint (cloud idempotency key)
  - `(claimed_by, lease_expires_at)` for lease expiry cleanup

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

## sync_outbox State Machine + Retry/DLQ

### State Transitions

The `sync_outbox` table uses an explicit state machine with the following valid transitions:

| From State | To State | Condition |
|------------|----------|-----------|
| `pending` | `claimed` | Row is claimed by a forwarder instance |
| `pending` | `pending` | Retry after failure (attempt_count < max) |
| `pending` | `dlq` | Max attempts exceeded (attempt_count >= max) |
| `claimed` | `sending` | Optional intermediate state during HTTP send |
| `claimed` | `acked` | Cloud acknowledged batch successfully |
| `claimed` | `pending` | Retry after failure (attempt_count < max) |
| `claimed` | `dlq` | Max attempts exceeded |
| `sending` | `acked` | Cloud acknowledged batch successfully |
| `sending` | `pending` | Retry after failure (attempt_count < max) |
| `sending` | `dlq` | Max attempts exceeded |

**Terminal States**: `acked`, `dlq`, `failed` (no transitions out).

### Eligibility Predicate

A row is eligible for claiming if **ALL** of the following are true:

```sql
status IN ('pending', 'claimed')
AND next_attempt_at <= NOW()
AND (claimed_by IS NULL OR lease_expires_at < NOW())
```

**Processing Order**: Rows are processed in `(priority DESC, occurred_at ASC)` order.

**Per-Tenant Ordering**: Best-effort ordering within each tenant (global ordering not guaranteed).

### Retry & Backoff Policy

**Backoff Calculation**:
```
delay_ms = min(2^attempt_count * base_seconds * 1000 + jitter(0..1s), max_seconds * 1000)
next_attempt_at = NOW() + delay_ms
```

Default: `base_seconds = 1`, `max_seconds = 300` (5 minutes).

**On Send Failure**:
1. `attempt_count += 1`
2. `last_attempt_at = NOW()`
3. `next_attempt_at = NOW() + backoff(attempt_count)`
4. `last_error_code` and `last_error_message` set
5. If `attempt_count < max_attempts` (default: 10):
   - `status = 'pending'` (eligible for retry)
   - Clear lease fields (`claimed_by`, `claimed_at`, `lease_expires_at`)
6. If `attempt_count >= max_attempts`:
   - `status = 'dlq'`
   - `failed_at = NOW()`
   - `dlq_reason = 'max_attempts_exceeded'`
   - Clear lease fields

**DLQ Recovery**: Admin can redrive DLQ entries back to `pending` via `POST /api/v1/sync/redrive` (resets `attempt_count`, clears error fields).

### Claim/Lease Algorithm (Multi-Replica Safe)

The forwarder uses PostgreSQL `FOR UPDATE SKIP LOCKED` for safe concurrent claiming:

```sql
WITH candidates AS (
  SELECT id
  FROM sync_outbox
  WHERE
    status IN ('pending', 'claimed')
    AND next_attempt_at <= NOW()
    AND (claimed_by IS NULL OR lease_expires_at < NOW())
  ORDER BY priority DESC, occurred_at ASC
  LIMIT $batchSize
  FOR UPDATE SKIP LOCKED
)
UPDATE sync_outbox o
SET
  status = 'claimed',
  claimed_by = $instanceId,
  claimed_at = NOW(),
  lease_expires_at = NOW() + ($leaseSeconds || ' seconds')::interval
FROM candidates c
WHERE o.id = c.id
RETURNING o.*;
```

**Lease Renewal**: If processing a batch takes longer than 60% of lease time, renew lease to prevent expiry during processing.

**Stuck Lease Recovery**: Admin can unclaim stuck rows (lease expired) via `POST /api/v1/sync/unclaim-stuck`.

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
- **TTL and cleanup**:
  - Cleanup job (CronJob) deletes rows older than a configurable TTL (guidance: 24–72 hours).
  - This table is not an audit log; it is a bounded operational dedupe cache.

---

## Object storage conventions (media)

Edge media is stored in S3-compatible object storage (MinIO or AWS S3).

### Required object key pattern

`tenants/{tenant_id}/farms/{farm_id}/barns/{barn_id}/devices/{device_id}/images/{year}/{month}/{day}/{media_id}.{ext}`

Where:
- `{media_id}` is a UUID v7 generated by the service
- `{ext}` is the file extension (e.g., `.jpg`, `.png`, `.webp`)
- `{year}`, `{month}`, `{day}` are UTC date components for organization

### Operational notes

- Objects are stored via S3 PUT operations using presigned URLs.
- Metadata (`size_bytes`, `mime_type`, `sha256` optional) is stored in `media_objects` DB table.
- S3 bucket should have lifecycle policies for retention (e.g., delete objects older than 90 days).
- MinIO can be deployed locally in the edge cluster for offline-first operation.

---

## Retention and cleanup jobs

### Telemetry retention (edge)

- `telemetry_raw`: default **30–90 days** retention (configurable).
- `telemetry_agg`: default **6–12 months** retention (configurable).

Cleanup approach:
- Prefer time-based partitioning (monthly partitions) then drop partitions past retention.
- Ensure cloud sync is healthy before dropping raw data if business requires cloud persistence.

### Media retention (edge)

- Default retention: **30–90 days** (configurable via S3 lifecycle policies or cleanup job).
- Cleanup approach:
  - **Option A (Recommended)**: Use S3 lifecycle policies to automatically delete objects after retention period.
  - **Option B**: Periodic cleanup job:
    - Identify expired rows in `media_objects` by `captured_at`.
    - Delete S3 object via S3 API (or mark missing if already removed).
    - Delete metadata row from DB.
    - Do not delete if linked to a non-finalized session unless explicitly configured.

### Outbox retention

- Keep `sync_outbox` rows for at least **7–30 days** after ack for audit/troubleshooting.
- Periodically archive or delete acked events beyond retention.
- Cleanup job MUST NOT delete rows with `status = 'pending'` or `status = 'claimed'` (active work items).

### Ingress dedupe retention

- Retain `ingress_dedupe` entries only for the dedupe TTL window.
- Cleanup job should run frequently (e.g., every 15–60 minutes) to keep the table bounded.

---

## Configuration

Retention policies are configurable via environment variables. Each service should read these variables and implement cleanup jobs accordingly.

### Environment Variables

| Variable | Default | Service(s) | Description |
|----------|---------|------------|-------------|
| `TELEMETRY_RAW_RETENTION_DAYS` | `90` | `edge-telemetry-timeseries` | Retention period for `telemetry_raw` table (days). Cleanup job should delete rows older than this. |
| `TELEMETRY_AGG_RETENTION_DAYS` | `365` | `edge-telemetry-timeseries` | Retention period for `telemetry_agg` table (days). Cleanup job should delete rows older than this. |
| `MEDIA_RETENTION_DAYS` | `90` | `edge-media-store` | Retention period for media objects (days). Used for S3 lifecycle policies or cleanup job. |
| `OUTBOX_RETENTION_DAYS` | `30` | `edge-sync-forwarder` | Retention period for acked/failed rows in `sync_outbox` (days). Cleanup job should NOT delete pending/claimed rows. |
| `INGRESS_DEDUPE_TTL_HOURS` | `72` | `edge-ingress-gateway` | TTL for `ingress_dedupe` entries (hours). Cleanup job should delete rows older than this. |

**Notes**:
- All retention values are in days unless specified otherwise (hours for `INGRESS_DEDUPE_TTL_HOURS`).
- Cleanup jobs should run periodically (e.g., daily cron or Kubernetes CronJob) to enforce retention policies.
- For `sync_outbox`, only delete rows with `status IN ('acked', 'dlq', 'failed')` and `updated_at < NOW() - INTERVAL 'N days'`.
- Never delete `sync_outbox` rows with `status IN ('pending', 'claimed')` as these are active work items.

---

## Backup & Restore

### Database Backup

**Snapshot Frequency**:
- **Production**: Daily full backups (via PostgreSQL native tools or K8s volume snapshots) + continuous WAL archiving if available.
- **Development/Staging**: Weekly snapshots sufficient.

**Backup Storage**:
- Store backups in external durable storage (S3-compatible, NFS, or cloud-provider storage) separate from edge cluster.
- Retain backups for **30 days** (minimum), **90 days** (recommended) for production.

**Restore Drill**:
- **Requirement**: Test restore procedure quarterly to validate backup integrity.
- Process: Restore from backup to test environment, verify data integrity, document restore time (RTO target: ≤ 5.4 hours per GT&D standards).

**Recovery Scenarios**:
- **Single node failure**: Restore from most recent backup, replay WAL if available.
- **Full cluster failure**: Restore DB from backup, restore object storage (e.g., MinIO volume snapshot/replication) if available, restart services.

### Media Object Storage Backup

**Snapshot Strategy**:
- **Option A (Recommended)**: Snapshot/backup the object storage backend (e.g., MinIO PV snapshots) daily or on-demand before major operations.
- **Option B**: File-level backup to external storage (rsync, tar) if volume snapshots unavailable.

**Retention**: **7-30 days** of snapshots (media has shorter retention than DB).

**Restore Process**:
1. Restore the object storage backend (e.g., MinIO volume) from snapshot/backup.
2. Verify `media_objects` table matches object storage contents (run integrity check).
3. Restart `edge-media-store` service.

### Multi-day Cloud Outage Recovery

**What is Recoverable**:
- **Telemetry data**: Fully recoverable (stored in edge DB, synced to cloud when connectivity restored).
- **WeighVision sessions**: Fully recoverable (sessions in DB, images in object storage, synced to cloud).
- **Media files**: Fully recoverable (in object storage, synced to cloud via outbox events).

**Recovery Process**:
1. When cloud connectivity restored, `edge-sync-forwarder` automatically resumes batching and sending events.
2. Cloud deduplicates by `(tenant_id, event_id)` so duplicate sends are safe.
3. Monitor outbox backlog reduction and sync success rate.
4. Alert if backlog does not decrease after connectivity restored (indicates sync issues).

**Data Loss Scenarios**:
- **Edge cluster destroyed without backup**: Data loss occurs (edge is not permanent storage; cloud is source of truth for long-term retention).
- **Object storage corruption**: Restore from snapshot if available; otherwise data loss for affected media files.
- **DB corruption**: Restore from backup; may lose data since last backup.

---

## Upgrade & Migration

### Schema Migrations

**Prisma Migrations** (Node services):
- Apply migrations in order (Prisma enforces this).
- Run migrations as init container or separate migration job before service deployment.
- **Safe Rollout**: Deploy schema migration first (additive changes only), then deploy application code that uses new schema.
- **Breaking Changes**: Require coordinated deployment: migrate schema + deploy code in same rollout window, or use feature flags to support both old/new schema during transition.

**Python Migrations** (inference service):
- Use Alembic or similar migration tool.
- Same principles: additive first, then code, then cleanup old columns (separate migration).

### Safe Rollout Strategy

1. **Pre-deployment**: Backup DB and object storage/DB volume snapshots.
2. **Schema Migration**: Apply additive migrations (new columns, indexes) first.
3. **Code Deployment**: Deploy new application code (blue/green or rolling update).
4. **Verification**: Monitor health endpoints, error rates, and sync success.
5. **Cleanup**: After verification period (e.g., 24 hours), apply cleanup migrations (drop unused columns) if needed.

### Zero-Downtime Upgrades

- Use Kubernetes rolling updates with proper readiness probes.
- Ensure new code version is backward-compatible with existing data during transition.
- Test upgrade procedure in staging environment before production.

---

## Implementation Notes

- All services must use UUID v7 for high-write tables in line with GT&D standards.
- Avoid storing sensitive PII in telemetry, media metadata, or logs.
- Edge storage sizing must account for offline windows (e.g., worst-case days without cloud connectivity) and be reflected in Kubernetes capacity planning (DB PVs + object storage backend volumes).
