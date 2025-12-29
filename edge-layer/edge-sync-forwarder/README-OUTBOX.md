# Edge Sync Forwarder - Outbox Implementation

## Overview

Production-grade scalable outbox with claim/lease for multi-replica deployment. Uses PostgreSQL `FOR UPDATE SKIP LOCKED` for safe concurrent processing.

## Key Features

- **Horizontal Scaling**: Multiple replicas can safely claim and process rows concurrently
- **Retry Scheduling**: Uses `next_attempt_at` to prevent hot loops, exponential backoff with jitter
- **DLQ Support**: Failed rows (max attempts exceeded) moved to DLQ for manual inspection
- **Lease Management**: Automatic lease expiry and recovery of stuck claims
- **Idempotency**: Cloud deduplicates by `(tenant_id, event_id)` where `event_id = sync_outbox.id`

## Architecture

### State Machine

States: `pending` → `claimed` → `sending` (optional) → `acked`
Alternative paths: `pending/claimed` → `pending` (retry) or `dlq` (max attempts)

See `docs/edge-layer/02-edge-storage-buffering.md` for complete state machine documentation.

### Claim/Lease Algorithm

Uses PostgreSQL CTE with `FOR UPDATE SKIP LOCKED`:

```sql
WITH candidates AS (
  SELECT id FROM sync_outbox
  WHERE status IN ('pending', 'claimed')
    AND next_attempt_at <= NOW()
    AND (claimed_by IS NULL OR lease_expires_at < NOW())
  ORDER BY priority DESC, occurred_at ASC
  LIMIT $batchSize
  FOR UPDATE SKIP LOCKED
)
UPDATE sync_outbox o
SET status = 'claimed', claimed_by = $instanceId, ...
FROM candidates c WHERE o.id = c.id
RETURNING o.*;
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CLOUD_INGESTION_URL=http://cloud-ingestion:3000/api/v1/edge/batch

# Outbox Configuration
OUTBOX_BATCH_SIZE=100              # Rows to claim per cycle
OUTBOX_LEASE_SECONDS=120           # Lease duration (seconds)
OUTBOX_MAX_ATTEMPTS=10             # Max retries before DLQ
OUTBOX_BACKOFF_CAP_SECONDS=300     # Max backoff delay (5 minutes)
SYNC_INTERVAL_MS=60000             # Sync cycle interval (1 minute)

# Admin Endpoints (optional)
INTERNAL_ADMIN_ENABLED=true        # Enable DLQ/redrive endpoints

# Instance ID (optional, auto-generated if not set)
INSTANCE_ID=forwarder-pod-1
HOSTNAME=forwarder-pod-1           # Used as instance_id if available
```

## API Endpoints

### Health & Ready

- `GET /api/health` - Liveness probe
- `GET /api/ready` - Readiness probe (checks DB connectivity)

### Sync State

- `GET /api/v1/sync/state` - Get backlog statistics
  ```json
  {
    "pending_count": 150,
    "claimed_count": 25,
    "dlq_count": 5,
    "oldest_pending_age_seconds": 3600,
    "last_success_at": "2025-12-20T10:00:00Z",
    "last_error_at": null
  }
  ```

- `GET /api/v1/sync/outbox?status=pending&limit=100` - Query outbox entries
- `POST /api/v1/sync/trigger` - Manually trigger sync cycle

### Admin Endpoints (require INTERNAL_ADMIN_ENABLED=true)

- `GET /api/v1/sync/dlq?limit=100` - List DLQ entries
- `POST /api/v1/sync/redrive` - Redrive DLQ entries
  ```json
  {
    "ids": ["uuid1", "uuid2"],  // Optional: specific IDs
    "allDlq": true              // Or: redrive all DLQ
  }
  ```
- `POST /api/v1/sync/unclaim-stuck` - Unclaim stuck rows (lease expired)
  ```json
  {
    "olderThanSeconds": 300
  }
  ```

## Database Migration

Run migration to add required columns:

```bash
# TypeORM migration
npm run migration:run

# Or manually with psql
psql $DATABASE_URL -f src/db/migrations/1724155200000-AddOutboxClaimLeaseFields.ts
```

Required columns added:
- `next_attempt_at` (NOT NULL, default NOW())
- `claimed_by`, `claimed_at`, `lease_expires_at`
- `attempt_count`, `last_attempt_at`
- `last_error_code`, `last_error_message`
- `failed_at`, `dlq_reason`
- `priority` (default: 0)
- `payload_size_bytes` (optional)

## Running Tests

### Unit Tests

```bash
npm test
```

Tests cover:
- Backoff calculation
- State machine transitions
- Eligibility checks

### Integration Tests

Requires PostgreSQL (use docker-compose or testcontainers):

```bash
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/testdb npm test -- multiReplica.test.ts
```

Integration tests verify:
- Multi-replica concurrent claiming (no duplicates)
- Lease expiry and reclaiming
- Retry and DLQ behavior
- Crash recovery

## How to Verify

### 1. Basic Functionality

```bash
# Check health
curl http://localhost:3000/api/health

# Check sync state
curl http://localhost:3000/api/v1/sync/state

# Trigger manual sync
curl -X POST http://localhost:3000/api/v1/sync/trigger
```

### 2. Multi-Replica Safety

1. Deploy 3 replicas:
   ```yaml
   replicas: 3
   ```

2. Seed test data (via SQL or service that writes to outbox):
   ```sql
   INSERT INTO sync_outbox (id, tenant_id, event_type, status, next_attempt_at, payload_json)
   VALUES 
     (gen_random_uuid(), 'tenant-1', 'test.event', 'pending', NOW(), '{"test": 1}'),
     ... -- 200 rows
   ```

3. Monitor logs from all 3 pods:
   ```bash
   kubectl logs -l app=edge-sync-forwarder --tail=100 -f
   ```

4. Verify:
   - Each row is claimed by exactly one replica
   - No duplicate "acked" transitions
   - Backlog drains steadily

### 3. Retry Behavior

1. Temporarily break cloud endpoint (return 500):
   ```bash
   # Mock cloud-ingestion to return 500
   ```

2. Monitor outbox:
   ```sql
   SELECT status, attempt_count, next_attempt_at, last_error_code
   FROM sync_outbox
   WHERE status IN ('pending', 'dlq')
   ORDER BY attempt_count DESC;
   ```

3. Verify:
   - `attempt_count` increments on each failure
   - `next_attempt_at` increases with exponential backoff
   - After 10 attempts, status becomes `dlq`

### 4. DLQ Recovery

1. Check DLQ:
   ```bash
   curl http://localhost:3000/api/v1/sync/dlq
   ```

2. Fix root cause (e.g., cloud endpoint restored)

3. Redrive DLQ:
   ```bash
   curl -X POST http://localhost:3000/api/v1/sync/redrive \
     -H "Content-Type: application/json" \
     -d '{"allDlq": true}'
   ```

4. Verify:
   - DLQ entries moved back to `pending`
   - `attempt_count` reset to 0
   - Rows processed successfully

### 5. Stuck Lease Recovery

1. Simulate stuck lease (claim then kill pod before processing):
   ```sql
   -- Manually set lease_expires_at in past
   UPDATE sync_outbox 
   SET lease_expires_at = NOW() - INTERVAL '1 minute'
   WHERE claimed_by = 'dead-pod-1';
   ```

2. Run unclaim-stuck:
   ```bash
   curl -X POST http://localhost:3000/api/v1/sync/unclaim-stuck \
     -H "Content-Type: application/json" \
     -d '{"olderThanSeconds": 300}'
   ```

3. Verify:
   - Stuck rows reset to `pending`
   - Another replica can claim and process

## Monitoring & Alerts

### Key Metrics

- `outbox_pending_total` - Gauge of pending rows
- `outbox_claimed_total` - Gauge of claimed rows
- `outbox_dlq_total` - Gauge of DLQ entries
- `sync_send_success_total` - Counter of successful batches
- `sync_send_failure_total` - Counter of failed batches
- `sync_batch_latency_ms` - Histogram of batch processing time
- `oldest_pending_age_seconds` - Gauge of oldest pending row age

### Alert Thresholds

- **Warning**: `pending_count > 1000` OR `oldest_pending_age_seconds > 3600`
- **Critical**: `pending_count > 10000` OR `oldest_pending_age_seconds > 86400`
- **DLQ**: `dlq_count > 0` (investigate immediately)

## Troubleshooting

See `docs/shared/05-runbook-ops.md` for detailed incident playbooks.

### Common Issues

1. **Backlog not draining**: Check cloud endpoint health, DB connectivity, lease expiry
2. **High DLQ count**: Investigate error patterns, fix root cause, redrive
3. **Stuck claims**: Use `unclaim-stuck` endpoint or query for expired leases
4. **Duplicate processing**: Should not happen due to `FOR UPDATE SKIP LOCKED`, but verify with unique constraint on `(tenant_id, id)`

## Related Documentation

- `docs/edge-layer/02-edge-storage-buffering.md` - Schema and state machine
- `docs/edge-layer/01-edge-services.md` - Service architecture
- `docs/shared/05-runbook-ops.md` - Operational runbooks

