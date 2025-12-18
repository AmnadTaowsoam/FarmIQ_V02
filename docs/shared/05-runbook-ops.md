Purpose: Provide practical incident playbooks and operational checks for FarmIQ (edge + cloud).  
Scope: Common incidents (edge offline, RabbitMQ backlog, sync stuck, inference failures, disk full, DB issues) and Datadog triage steps.  
Owner: FarmIQ Operations  
Last updated: 2025-12-17  

---

## Runbook principles

- Prefer reversible mitigations first (scale out, pause ingestion, reduce workload).
- Use Datadog as the primary source for logs, traces, and metrics.
- Always correlate using `requestId` (`x-request-id`) and `traceId`.
- Avoid exposing or logging sensitive data during incident response.

---

## Incident: Edge offline (no sync to cloud)

### Symptoms

- `cloud-ingestion` batch traffic drops for one or more edge clusters.
- `edge-sync-forwarder` cannot reach cloud; `sync_outbox` backlog grows.
- Tenant dashboards show stale telemetry.

### Immediate actions

- Confirm whether the issue is isolated (single edge cluster) or systemic (cloud ingress outage).
- If isolated:
  - Check edge cluster connectivity (VPN/WAN link).
  - Confirm `edge-sync-forwarder` pods are running and healthy.
- If systemic:
  - Check `cloud-ingestion` and load balancer health.

### Datadog checks

- **Metrics**
  - `cloud-ingestion` request rate and 5xx errors
  - `sync_outbox` pending count / oldest pending age (edge)
  - Last successful sync timestamp (edge) by tenant/cluster
  - Kubernetes node/pod health for edge cluster
- **Logs**
  - `edge-sync-forwarder` logs: connection errors, retries, batch IDs
  - `cloud-ingestion` logs: auth failures, payload validation errors
- **Traces**
  - Search by `traceId` from `edge-sync-forwarder` failed requests

### Verification steps

- Trigger a controlled sync:
  - `POST /api/v1/sync/trigger` (edge, admin-only)
- Confirm cloud ack response and that pending backlog decreases.

---

## Incident: RabbitMQ backlog (cloud or edge)

### Symptoms

- Increasing queue depth and delayed processing (telemetry, analytics, media).
- Increased end-to-end latency (ingest to dashboard).

### Immediate actions

- Identify which broker:
  - Cloud RabbitMQ (`cloud-rabbitmq`) affects downstream processing.
  - Edge RabbitMQ (if used) affects inference latency.
- Scale consumers:
  - Increase replicas for `cloud-telemetry-service` and/or `cloud-analytics-service`.
  - Increase `edge-vision-inference` worker replicas (edge).
- If backlog is due to poisoned messages:
  - Enable/inspect DLQ; temporarily stop auto-retry if it amplifies load.

### Datadog checks

- **RabbitMQ metrics**
  - Queue depth, unacked messages, publish/ack rate
  - DLQ message count
- **Consumer metrics**
  - Pod CPU/memory saturation, restarts
- **Logs**
  - Consumer errors and retry loops

### Verification steps

- Confirm queue depth trend is decreasing.
- Confirm consumer throughput (ack rate) exceeds publish rate for sustained period.

---

## Incident: Sync stuck (edge outbox not draining)

### Symptoms

- `sync_outbox` pending rows increase.
- `edge-sync-forwarder` shows repeated failures or no progress.

### Immediate actions

- Check if cloud ingress is reachable and auth is valid.
- Confirm DB health on edge (connection pool, disk).
- If backpressure is intentional:
  - Validate `sync_state.paused_until`.

### Datadog checks

- **Metrics**
  - Outbox backlog size + oldest pending age
  - Last successful sync timestamp too old
  - `edge-sync-forwarder` error rate and retries
- **Logs**
  - Look for validation errors (schema mismatch) and auth errors (401/403).

### Verification steps

- Confirm `cloud-ingestion` dedupe is working:
  - Dedupe hit rate may rise after retries; should not cause failures.
- After fix, confirm pending backlog drains steadily.

---

## Incident: Inference failing (edge)

### Symptoms

- Inference job failures increase.
- Sessions remain unfinalized or missing predictions.
- Edge inference DLQ grows (if DLQ configured).

### Immediate actions

- Confirm `edge-vision-inference` pods are running and have required hardware access (GPU if needed).
- Check model files and version compatibility.
- If failures are due to corrupted media:
  - Validate `edge-media-store` file integrity and permissions.

### Datadog checks

- **Metrics**
  - Inference job runtime, failure rate
  - Edge inference queue depth (if using edge RabbitMQ)
- **Logs**
  - `edge-vision-inference` stack traces
  - `edge-media-store` file read errors

### Verification steps

- Re-run one inference job via debug endpoint (if enabled):
  - `POST /api/inference/run`
- Confirm `inference_results` written and `inference.completed` outbox event created.

---

## Incident: Media disk full (PVC near-full)

### Symptoms

- Image uploads fail at `edge-media-store` (or cloud-media-store).
- PVC usage alert triggers (>85% / >95%).

### Immediate actions

- Stop or slow image ingestion (device-side backpressure) if necessary.
- Run/force cleanup job for expired media.
- Consider increasing PVC size if supported.

### Datadog checks

- **Metrics**
  - PVC usage % for `edge-media-volume` / `cloud-media-volume`
- **Logs**
  - `edge-media-store` write errors, `ENOSPC`

### Verification steps

- Confirm free space recovered and new uploads succeed.
- Confirm cleanup job does not remove non-expired or non-finalized session media unintentionally.

---

## Incident: Database connection failures (edge or cloud)

### Symptoms

- API 5xx spikes.
- Timeouts and connection pool exhaustion.
- Increased pod restarts due to failing readiness probes.

### Immediate actions

- Confirm DB process health and disk availability.
- Reduce load:
  - Scale down high-throughput producers temporarily (ingress/ingestion).
  - Scale out consumers carefully only if DB is stable.
- Validate migrations/schema compatibility after deployments.

### Datadog checks

- **Metrics**
  - DB CPU/memory, connections, locks
  - Application error rate and latency
- **Logs**
  - Prisma errors / connection errors
  - Slow query warnings (if enabled)

### Verification steps

- Confirm health endpoints recover: `GET /api/health`
- Confirm write paths work:
  - Edge: telemetry ingest + media store
  - Cloud: ingestion batch + telemetry consume

---

## Implementation Notes

- Runbooks assume each service implements `/api/health` and emits JSON logs with `requestId` and `traceId`.
- Keep a lightweight “replay from DLQ” process for RabbitMQ to recover from transient failures safely.


