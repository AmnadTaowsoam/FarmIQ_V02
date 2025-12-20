Purpose: Define the canonical FarmIQ edge services, their responsibilities, and ownership boundaries.  
Scope: Per-service purpose, APIs, owned tables, outbox events, PVC usage, and boilerplate mapping.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-20  

---

## Canonical edge services (MVP)

Edge runs on Kubernetes/k3s. The canonical MVP services are:
- `edge-mqtt-broker` (EMQX/Mosquitto)
- `edge-ingress-gateway` (Node)
- `edge-telemetry-timeseries` (Node)
- `edge-weighvision-session` (Node)
- `edge-media-store` (Node)
- `edge-vision-inference` (Python)
- `edge-sync-forwarder` (Node)
- `edge-policy-sync` (Node)
- `edge-retention-janitor` (Node)
- `edge-observability-agent` (Node)

### Required edge infrastructure components (not business microservices)

Edge RabbitMQ is **optional** (cloud RabbitMQ is mandatory). If used, the edge cluster can run:
- **RabbitMQ (Edge, optional)**: internal broker for async processing (e.g., inference job queue).  
  This is a platform component and is not part of the "canonical service list" above.

Edge still uses the **DB-based outbox** (`sync_outbox`) as the authoritative mechanism for cloud sync.

---

## Ownership guards (non-negotiable)

- **Session owner (Edge)**: `edge-weighvision-session`
- **Media owner (Edge)**: `edge-media-store` (files on PVC)
- **Inference owner (Edge)**: `edge-vision-inference` (results)
- **Sync owner (Edge)**: `edge-sync-forwarder` ONLY (single path to cloud)

---

## Security & Provisioning (Cross-reference)

See `edge-layer/00-overview.md` "Security & Provisioning" section for:
- MQTT TLS and device authentication requirements
- HTTP media upload authentication and rate limiting
- Secrets storage and rotation policies

---

## Service-by-service design

### `edge-mqtt-broker` (EMQX/Mosquitto)

- **Purpose**: Receive MQTT telemetry from IoT devices (`iot-sensor-agent`) and forward to `edge-ingress-gateway`.
- **APIs**:
  - MQTT TCP/TLS ports as per cluster configuration.
- **Security**:
  - TLS 1.2+ REQUIRED in production (see `00-overview.md` Security section).
  - Device authentication: per-device username/password + ACL OR mTLS client certificates.
- **DB tables owned**: None.
- **Outbox events**: None.
- **PVC usage**: Optional (broker persistence), but avoid heavy retention; edge DB is the primary durable store.
- **Boilerplate**: N/A (off-the-shelf broker).
- **Resource Requirements** (K8s):
  - CPU: requests 200m, limits 500m
  - Memory: requests 256Mi, limits 512Mi
- **Ops Requirements**:
  - Health: Broker-native health check (e.g., `mosquitto_sub` test).
  - Alerts: Connection count, message throughput, TLS handshake failures.

### `edge-ingress-gateway` (Node)

- **Purpose**: Single device-facing MQTT normalizer; validates and routes device data to internal edge services. **Does NOT proxy media uploads** (devices upload directly to `edge-media-store`).
- **Does / does not**
  - **Does**: Consume MQTT topics (telemetry + events), validate the standard MQTT envelope, enrich `trace_id` if missing, and route to internal edge services.
  - **Does**: Expose operational and admin HTTP endpoints only (no telemetry ingestion, no media upload proxy).
  - **Does not**: Own domain tables (routes to owners).
  - **Does not**: Receive or proxy image bytes (devices upload directly via presigned URLs to `edge-media-store`).
- **MQTT topics consumed (authoritative patterns)**:
  - Telemetry: `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`
  - Generic events: `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`
  - WeighVision: `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`
  - Status (retained): `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`
- **Idempotency / duplicate handling (mandatory)**:
  - Treat MQTT as at-least-once delivery.
  - Dedupe by `(tenant_id, event_id)` using an Edge DB TTL cache:
    - Table: `ingress_dedupe(event_id, tenant_id, first_seen_at)`
    - Cleanup job drops rows older than TTL (configurable, guidance: 24-72 hours).
  - If duplicate detected: skip downstream processing and log a lightweight dedupe message (no sensitive payload logging).
- **Validation and security**:
  - Validate envelope contains `event_id`, `trace_id`, `tenant_id`, `device_id`, `event_type`, `ts`, `payload` (see `iot-layer/03-mqtt-topic-map.md`).
  - Validate required topic segments are present (e.g., `farmId`, `barnId`, `stationId`, `sessionId`) and consistent with provisioning.
  - If `trace_id` missing, generate and attach before routing.
  - Never log full payload; log `event_type`, ids, `trace_id`, and payload size only.
- **Public APIs (device-facing)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended; checks DB connectivity for dedupe)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
- **Business/ops APIs**:
  - `GET /api/v1/ingress/stats`
  - `POST /api/v1/devices/config/publish` (optional admin; publish config to MQTT)
- **Internal calls**:
  - Writes telemetry to `edge-telemetry-timeseries` (HTTP/gRPC).
  - Creates/finalizes sessions via `edge-weighvision-session`.
  - Does NOT upload media (devices call `edge-media-store` directly).
- **DB tables owned**: None (stateless gateway, but uses `ingress_dedupe` table for dedupe cache).
- **Outbox events**: None (do not emit business events here; route to owners).
- **PVC usage**: None.
- **Boilerplate**: `boilerplates/Backend-node`
- **Resource Requirements** (K8s):
  - CPU: requests 200m, limits 1 CPU
  - Memory: requests 256Mi, limits 512Mi
- **Ops Requirements**:
  - Health: `/api/health` returns 200 if process alive.
  - Ready: `/api/ready` checks DB connectivity for dedupe table access.
  - Alerts: Message processing rate, dedupe hit rate, validation error rate.

### `edge-telemetry-timeseries` (Node)

- **Purpose**: Own telemetry persistence and aggregation on edge; provide local telemetry query endpoints.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended; checks DB connectivity)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/aggregates`
  - `GET /api/v1/telemetry/metrics`
- **DB tables owned**:
  - `telemetry_raw`
  - `telemetry_agg`
- **Outbox events written**:
  - `telemetry.ingested`
  - `telemetry.aggregated` (optional on edge; cloud can also aggregate)
- **PVC usage**:
  - Uses DB storage on `edge-db-volume` (if DB is hosted locally on PVC).
- **Boilerplate**: `boilerplates/Backend-node`
- **Resource Requirements** (K8s):
  - CPU: requests 500m, limits 2 CPU
  - Memory: requests 512Mi, limits 2Gi
- **Ops Requirements**:
  - Health: `/api/health` returns 200 if process alive.
  - Ready: `/api/ready` checks DB connectivity.
  - Alerts: Ingestion rate, aggregation job failures, DB write errors.

### `edge-weighvision-session` (Node) — Session owner

- **Purpose**: Own the WeighVision session lifecycle and binding between weights, media, and inference results.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended; checks DB connectivity)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/weighvision/sessions` (internal; created from MQTT events)
  - `GET /api/v1/weighvision/sessions/{sessionId}` (internal)
  - `POST /api/v1/weighvision/sessions/{sessionId}/finalize` (internal)
- **DB tables owned**:
  - `weight_sessions`
- **Outbox events written**:
  - `weighvision.session.created`
  - `weighvision.session.finalized`
- **PVC usage**: None directly (media stored via `edge-media-store`).
- **Boilerplate**: `boilerplates/Backend-node`
- **Resource Requirements** (K8s):
  - CPU: requests 200m, limits 1 CPU
  - Memory: requests 256Mi, limits 512Mi
- **Ops Requirements**:
  - Health: `/api/health` returns 200 if process alive.
  - Ready: `/api/ready` checks DB connectivity.
  - Alerts: Session creation failures, finalization errors, outbox write failures.

### `edge-media-store` (Node) — Media owner

- **Purpose**: Store images in S3-compatible object storage (MinIO or AWS S3) and maintain metadata; expose presigned upload URLs for devices and read APIs for internal services.
- **Storage**: Uses S3-compatible storage (MinIO recommended for local/edge deployments, AWS S3 for cloud). Objects stored with path structure: `tenants/{tenant_id}/farms/{farm_id}/barns/{barn_id}/devices/{device_id}/images/{year}/{month}/{day}/{id}.{ext}`
- **APIs (device-facing for upload, internal for read)**:
  - `GET /api/health`
  - `GET /api/ready` (checks S3 bucket configuration)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/media/images/presign` (device-facing; authenticated)
    - Request body: `tenant_id`, `farm_id`, `barn_id`, `device_id`, `content_type`, `filename`
    - Response: `{ object_key: string, upload_url: string, expires_in: number, method: "PUT", headers: { "Content-Type": string } }`
    - Auth: Validates `x-tenant-id` header matches request body tenant_id (JWT/mTLS validation should be added for production)
  - `PUT {upload_url}` (device-facing; S3 presigned URL, no auth header needed)
    - Binary JPEG/PNG/WebP body
    - Rate limit: 10 MB per upload, 10 presign requests per device per minute (configurable via `MEDIA_MAX_UPLOAD_BYTES`)
  - `GET /api/v1/media/objects/{objectId}` (internal; returns file bytes from S3)
  - `GET /api/v1/media/objects/{objectId}/meta` (internal; returns metadata JSON)
- **Environment Variables**:
  - `MEDIA_BUCKET` (required): S3 bucket name
  - `MEDIA_ENDPOINT` (required): S3 endpoint URL (e.g., `http://minio:9000` for MinIO)
  - `MEDIA_ACCESS_KEY` (required): S3 access key
  - `MEDIA_SECRET_KEY` (required): S3 secret key
  - `MEDIA_REGION` (optional, default: `us-east-1`): S3 region
  - `MEDIA_PRESIGN_EXPIRES_IN` (optional, default: 900): Presign URL expiration in seconds
  - `MEDIA_MAX_UPLOAD_BYTES` (optional, default: 10485760): Max upload size in bytes (10 MB)
- **DB tables owned**:
  - `media_objects` (metadata only; actual files stored in S3)
- **Outbox events written**:
  - `media.stored`
- **Storage**: S3-compatible object storage (not PVC filesystem)
- **Boilerplate**: `boilerplates/Backend-node`
- **Resource Requirements** (K8s):
  - CPU: requests 500m, limits 2 CPU
  - Memory: requests 512Mi, limits 1Gi
- **Ops Requirements**:
  - Health: `/api/health` returns 200 if process alive.
  - Ready: `/api/ready` checks S3 bucket configuration (returns 503 if `MEDIA_BUCKET` not set).
  - Alerts: Upload failures, S3 storage quota > 75% (warning) / > 90% (critical), presign rate limit violations.

### `edge-vision-inference` (Python) — Inference owner

- **Purpose**: Run ML inference on images and write results to the edge DB.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended; checks DB connectivity)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/inference/jobs` ✅ **Currently implemented** - Synchronous inference via HTTP POST
  - `GET /api/v1/inference/jobs/{jobId}`
  - `GET /api/v1/inference/results`
  - `GET /api/v1/inference/models`
- **Current Implementation (Mode B - Synchronous HTTP POST)**:
  - ✅ **IMPLEMENTED**: `edge-media-store` calls `POST /api/v1/inference/jobs` synchronously after storing media.
  - Service processes job inline and returns result.
  - Fetches media from `edge-media-store` (internal HTTP) and writes results to DB.
- **Future Enhancement (Mode A - RabbitMQ)**:
  - **Not currently implemented** - Planned for future enhancement.
  - When implemented, will consume inference jobs from **Edge RabbitMQ** queue (e.g., `farmiq.edge-vision-inference.jobs.queue`).
  - Mode selection would be via environment variable (e.g., `EDGE_RABBITMQ_ENABLED=true/false`).
- **DB tables owned**:
  - `inference_results`
- **Outbox events written**:
  - `inference.completed`
- **PVC usage**: None directly (reads images via `edge-media-store`).
- **Boilerplate**: `boilerplates/Backend-python`
- **Resource Requirements** (K8s):
  - CPU: requests 1 CPU, limits 4 CPU (or GPU requests if GPU inference enabled)
  - Memory: requests 1Gi, limits 4Gi (model-dependent)
  - Node affinity: MUST schedule to GPU nodes if GPU inference enabled
- **Ops Requirements**:
  - Health: `/api/health` returns 200 if process alive.
  - Ready: `/api/ready` checks DB connectivity and (if RabbitMQ enabled) queue connectivity.
  - Alerts: Inference job failures, queue depth > 1000 (warning) / > 10000 (critical), model load errors, inference latency > 15s (p95).

### `edge-sync-forwarder` (Node) — Sync owner

- **Purpose**: Reliably send outbox events to cloud using HTTPS with idempotency. Supports horizontal scaling via claim/lease strategy.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended; checks DB connectivity and cloud endpoint reachability)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/sync/state`
  - `POST /api/v1/sync/trigger` (admin/debug)
  - `GET /api/v1/sync/outbox` (admin/debug)
- **DB tables owned**:
  - `sync_outbox` (read/claim/update)
  - `sync_state`
- **Outbox events written**:
  - `sync.batch.sent`
  - `sync.batch.acked`
- **Claim/Lease Strategy (for horizontal scaling)**:
  - Use `SELECT ... FOR UPDATE SKIP LOCKED` (PostgreSQL) or equivalent when claiming pending rows.
  - Add columns to `sync_outbox` if needed:
    - `claimed_by` (pod/instance identifier, e.g., hostname or UUID)
    - `claimed_at` (timestamp)
    - `lease_expires_at` (timestamp; default: claimed_at + 5 minutes)
  - **Claiming process**:
    1. Select rows with `status = 'pending'` AND (`claimed_at IS NULL` OR `lease_expires_at < NOW()`) using `FOR UPDATE SKIP LOCKED`.
    2. Update selected rows: set `status = 'claimed'`, `claimed_by = <instance_id>`, `claimed_at = NOW()`, `lease_expires_at = NOW() + 5 minutes`.
    3. Process batch and send to cloud.
    4. On success: update `status = 'sent'` (or `acked` after cloud confirms).
    5. On failure: update `status = 'pending'`, clear `claimed_by`, increment `attempt_count`.
  - **Lease renewal**: If processing takes longer than lease (e.g., > 5 minutes), renew lease by updating `lease_expires_at` before it expires.
- **Ordering Rule**:
  - **Per-tenant ordering** (best-effort): Process events in `occurred_at` order within each tenant.
  - Global ordering not required (cross-tenant events may be sent out of order).
- **Failure Policy**:
  - **Max attempts**: 10 retries per event (configurable).
  - **Backoff**: Exponential backoff with jitter: `min(2^attempt_count * 1s + jitter(0-1s), 300s)`.
  - **Mark failed**: After max attempts, set `status = 'failed'` and log alert.
  - **Re-drive failed rows**: Admin can manually set `status = 'pending'` and clear `claimed_by` to retry failed events.
- **Cloud Idempotency Key**:
  - Cloud deduplicates by `(tenant_id, event_id)` (where `event_id` is the `sync_outbox.id`).
  - Frontend MUST include `event_id` in batch payload sent to `cloud-ingestion`.
  - Cloud MUST reject duplicates and return success (idempotent operation).
- **PVC usage**:
  - Uses DB storage on `edge-db-volume` (if DB is hosted locally on PVC).
- **Boilerplate**: `boilerplates/Backend-node`
- **Resource Requirements** (K8s):
  - CPU: requests 200m, limits 1 CPU
  - Memory: requests 256Mi, limits 512Mi
  - HPA: Can scale horizontally (2-10 replicas recommended based on backlog)
- **Ops Requirements**:
  - Health: `/api/health` returns 200 if process alive.
  - Ready: `/api/ready` checks DB connectivity AND cloud endpoint reachability (timeout: 5s).
  - Alerts: 
    - Outbox backlog > 1000 pending rows (warning) / > 10000 (critical)
    - Oldest pending age > 1 hour (warning) / > 24 hours (critical)
    - Last successful sync > 5 minutes ago (warning) / > 1 hour ago (critical)
    - Consecutive failures > 5 (warning) / > 10 (critical)

---

## Implementation Notes

- All Node edge services MUST:
  - Use Winston JSON logging to stdout (collected by Datadog agent).
  - Use `dd-trace` and propagate `x-request-id` and `x-trace-id`.
  - Serve APIs under `/api` with `GET /api/health` and `/api-docs`.
- No external in-memory cache/session store and no object storage are permitted. Durable media storage is via PVC filesystem only.

