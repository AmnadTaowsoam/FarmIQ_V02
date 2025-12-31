# Edge Services

**Purpose:** Comprehensive service inventory for the FarmIQ edge layer.
**Scope:** Service table with ports, dependencies, endpoints, and implementation details.
**Owner:** FarmIQ Edge Team
**Last updated:** 2025-12-31

---

## Service Overview Table

| Service | Type | Internal Port | Host Port (Dev) | Purpose | Depends On |
|----------|-------|---------------|------------------|---------|------------|
| **edge-mqtt-broker** | Mosquitto | 1883 | 5100 | MQTT message bus for IoT devices | - |
| **edge-ingress-gateway** | Node.js | 3000 | 5103 | MQTT normalizer and router | edge-mqtt-broker, edge-telemetry-timeseries, edge-weighvision-session |
| **edge-telemetry-timeseries** | Node.js | 3000 | 5104 | Telemetry persistence and aggregation | postgres |
| **edge-weighvision-session** | Node.js | 3000 | 5105 | Session lifecycle owner | postgres |
| **edge-media-store** | Node.js | 3000 | 5106 | Media owner (S3-compatible storage) | postgres, minio |
| **edge-vision-inference** | Python (FastAPI) | 8000 | 5107 | ML inference owner | postgres, edge-media-store |
| **edge-sync-forwarder** | Node.js | 3000 | 5108 | Sync owner (outbox → cloud) | postgres, edge-cloud-ingestion-mock |
| **edge-policy-sync** | Node.js | 3000 | 5109 | Cache cloud config offline | postgres, cloud-api-gateway-bff |
| **edge-observability-agent** | Node.js | 3000 | 5111 | Aggregate health/status for ops | edge-ingress-gateway, edge-telemetry-timeseries, edge-weighvision-session, edge-vision-inference, edge-media-store, edge-sync-forwarder |
| **edge-feed-intake** | Node.js | 5109 | 5112 | Local feed intake management | postgres, edge-mqtt-broker, edge-sync-forwarder |
| **edge-retention-janitor** | Node.js | 3000 | 5114 | Enforce media retention policies | postgres |
| **edge-ops-web** | Static (nginx) | 80 | 5113 | UI for edge operations | All core services |

### Development Infrastructure

| Component | Type | Host Port | Internal Port | Purpose |
|-----------|-------|-----------|---------------|---------|
| **postgres** | PostgreSQL 16-alpine | 5141 | 5432 | Single relational DB for all edge services |
| **minio** | MinIO | 9000, 9001 | 9000, 9001 | S3-compatible object storage (API + Console) |
| **edge-cloud-ingestion-mock** | Node.js | - | 3000 | Mock cloud ingestion endpoint (internal only) |

---

## Service Detail Pages

### Business Services

#### edge-mqtt-broker

**Purpose:** MQTT message broker receiving telemetry and events from IoT devices.

**Type:** Mosquitto
**Implementation:** Off-the-shelf broker

**Ports:**
- Internal: 1883 (plain MQTT), 8883 (TLS MQTT in production)
- Host: 5100 → 1883 (development)

**Security (Production):**
- TLS 1.2+ REQUIRED on port 8883
- Device authentication: per-device username/password + ACL OR mTLS certificates
- ACL rules restrict devices to tenant-scoped topics only
- See `edge-mqtt-broker/mosquitto.conf` for production configuration

**Health Check:**
```bash
mosquitto_sub -h localhost -t $SYS/health -C 1
```

**Dependencies:** None
**Data Ownership:** None (stateless message bus)
**PVC Usage:** Optional (broker persistence), minimal retention

---

#### edge-ingress-gateway

**Purpose:** Single device-facing MQTT normalizer; validates and routes device data to internal edge services.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5103 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (DB + MQTT connectivity) |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| GET | `/api/v1/ingress/stats` | Ingress processing counters |
| POST | `/api/v1/devices/config/publish` | Optional: Publish device config to MQTT |

**MQTT Topics Consumed:**
- Telemetry: `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`
- Events: `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`
- WeighVision: `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`
- Status (retained): `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`

**Internal Calls:**
- Writes telemetry to `edge-telemetry-timeseries` (HTTP)
- Creates/finalizes sessions via `edge-weighvision-session` (HTTP)
- Does NOT proxy media uploads (devices call `edge-media-store` directly)

**Validation & Deduplication:**
- Validates MQTT envelope: `event_id`, `trace_id`, `tenant_id`, `device_id`, `event_type`, `ts`, `payload`
- Deduplicates by `(tenant_id, event_id)` using `ingress_dedupe` TTL cache (24-72 hours)
- Generates `trace_id` if missing
- Never logs full payloads (only event_type, ids, trace_id, payload size)

**Dependencies:**
- edge-mqtt-broker
- edge-telemetry-timeseries
- edge-weighvision-session

**Data Ownership:** None (stateless gateway, uses `ingress_dedupe` table for dedupe)
**Outbox Events:** None (routes to owners who emit events)
**PVC Usage:** None
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi

---

#### edge-telemetry-timeseries

**Purpose:** Own telemetry persistence and aggregation on edge; provide local telemetry query APIs.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5104 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (DB connectivity) |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| GET | `/api/v1/telemetry/readings` | Query individual readings |
| GET | `/api/v1/telemetry/aggregates` | Query aggregated telemetry |
| GET | `/api/v1/telemetry/metrics` | Get telemetry metrics (ingestion rate) |
| GET | `/api/v1/telemetry/stats` | Tenant-scoped stats for ops dashboard |

**Stats Endpoint Response:**
```json
{
  "total_readings": 1247,
  "total_aggregates": 234,
  "last_reading_at": "2025-12-31T08:45:23.456Z",
  "tenant_id": "t-001"
}
```

**Dependencies:**
- postgres

**Data Ownership:**
- `telemetry_raw` - Raw telemetry readings
- `telemetry_agg` - Aggregated telemetry

**Outbox Events Written:**
- `telemetry.ingested` - When telemetry is stored
- `telemetry.aggregated` - Optional (cloud can also aggregate)

**PVC Usage:** Uses DB storage on `edge-db-volume` (if DB is local)
**Resource Requirements:** CPU 500m/2, Memory 512Mi/2Gi

---

#### edge-weighvision-session

**Purpose:** Session owner; manages WeighVision session lifecycle and binds weights, media, and inference results.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5105 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (DB connectivity) |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| POST | `/api/v1/weighvision/sessions` | Internal: Create session from MQTT events |
| GET | `/api/v1/weighvision/sessions/{sessionId}` | Internal: Get session details |
| POST | `/api/v1/weighvision/sessions/{sessionId}/attach` | Internal: Bind media/inference |
| POST | `/api/v1/weighvision/sessions/{sessionId}/finalize` | Internal: Finalize session |

**Dependencies:**
- postgres

**Data Ownership:**
- `weight_sessions` - Session lifecycle and metadata

**Outbox Events Written:**
- `weighvision.session.created` - When session is created
- `weighvision.session.finalized` - When session is finalized

**PVC Usage:** None directly (media stored via `edge-media-store`)
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi

---

#### edge-media-store

**Purpose:** Store images in S3-compatible object storage (MinIO/S3) and maintain metadata; expose presigned upload URLs.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5106 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (S3 bucket configuration) |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| POST | `/api/v1/media/images/presign` | Get presigned upload URL (device-facing) |
| PUT | `{upload_url}` | Upload image to S3 (presigned, no auth) |
| POST | `/api/v1/media/images/complete` | Confirm upload, store metadata, emit `media.stored` |
| GET | `/api/v1/media/objects/{mediaId}` | Internal: Get file bytes from S3 |
| GET | `/api/v1/media/objects/{mediaId}/meta` | Internal: Get metadata JSON |
| GET | `/api/v1/media/stats` | Tenant-scoped stats for ops dashboard |

**Stats Endpoint Response:**
```json
{
  "total_objects": 89,
  "total_size_mb": 234.5,
  "last_created_at": "2025-12-31T09:15:12.789Z",
  "tenant_id": "t-001"
}
```

**Environment Variables:**
- `MEDIA_ENDPOINT` (required): S3 endpoint URL (e.g., `http://minio:9000`)
- `MEDIA_ACCESS_KEY` (required): S3 access key
- `MEDIA_SECRET_KEY` (required): S3 secret key
- `MEDIA_BUCKET` (required): Bucket name (default: `farmiq-media`)
- `MEDIA_REGION` (optional, default: `us-east-1`)
- `MEDIA_PRESIGN_EXPIRES_IN` (optional, default: 900): Presign URL expiration (seconds)
- `MEDIA_MAX_UPLOAD_BYTES` (optional, default: 10MB): Max upload size

**Storage Path:**
```
tenants/{tenant_id}/farms/{farm_id}/barns/{barn_id}/devices/{device_id}/images/{year}/{month}/{day}/{id}.{ext}
```

**Dependencies:**
- postgres
- minio

**Data Ownership:**
- `media_objects` - Metadata only (actual files stored in S3/MinIO)

**Outbox Events Written:**
- `media.stored` - When media is confirmed uploaded

**Storage:** S3-compatible object storage (MinIO for edge, AWS S3 for cloud)
**Resource Requirements:** CPU 500m/2, Memory 512Mi/1Gi

---

#### edge-vision-inference

**Purpose:** Run ML inference on images and write results to edge DB.

**Type:** Python (FastAPI)
**Implementation:** `boilerplates/Backend-python`

**Ports:**
- Internal: 8000
- Host: 5107 → 8000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (DB + optional RabbitMQ) |
| GET | `/api-docs` | FastAPI Swagger UI |
| GET | `/api/v1/inference/jobs/{jobId}` | Get job status |
| GET | `/api/v1/inference/results` | Query inference results |
| GET | `/api/v1/inference/models` | List available models |
| POST | `/api/v1/inference/jobs` | Submit inference job (synchronous) |
| GET | `/api/v1/inference/stats` | Tenant-scoped stats for ops dashboard |

**Stats Endpoint Response:**
```json
{
  "total_results": 42,
  "last_result_at": "2025-12-31T10:30:45.123Z",
  "tenant_id": "t-001"
}
```

**Current Implementation:**
- **Mode B (Synchronous HTTP):** `edge-media-store` calls `POST /api/v1/inference/jobs` synchronously after storing media
- Service processes job inline and returns result
- Fetches media from `edge-media-store` via internal HTTP
- Writes results to DB

**Future Enhancement:**
- **Mode A (RabbitMQ):** Consume inference jobs from Edge RabbitMQ queue
- Not currently implemented
- Would be enabled via environment variable (`EDGE_RABBITMQ_ENABLED=true`)

**Dependencies:**
- postgres
- edge-media-store

**Data Ownership:**
- `inference_results` - ML inference outcomes

**Outbox Events Written:**
- `inference.completed` - When inference is complete

**PVC Usage:** None directly (reads images via `edge-media-store`)
**Resource Requirements:** CPU 1/4 (or GPU if enabled), Memory 1Gi/4Gi, Node affinity for GPU nodes

---

#### edge-sync-forwarder

**Purpose:** Reliably send outbox events to cloud using HTTPS with idempotency; supports horizontal scaling.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5108 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (DB + cloud endpoint) |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| GET | `/api/v1/sync/state` | Get sync state (pending/claimed/DLQ counts) |
| GET | `/api/v1/sync/outbox` | Query outbox entries by status |
| GET | `/api/v1/sync/dlq` | Get DLQ entries (requires `INTERNAL_ADMIN_ENABLED=true`) |
| POST | `/api/v1/sync/trigger` | Admin/debug: Trigger immediate sync |
| POST | `/api/v1/sync/dlq/redrive` | Admin/debug: Re-drive failed events |
| GET | `/api/v1/sync/diagnostics/cloud` | Validate cloud ingestion auth/handshake |

**Sync State Response:**
```json
{
  "pending": 45,
  "claimed": 10,
  "sending": 5,
  "acked": 12345,
  "failed": 2,
  "dlq_count": 8,
  "last_success_at": "2025-12-31T11:20:15.789Z",
  "last_error": null,
  "oldest_pending_at": "2025-12-31T10:15:30.000Z"
}
```

**Environment Variables:**
- `CLOUD_INGESTION_URL` (required): Cloud ingestion endpoint
- `CLOUD_INGESTION_URL_REQUIRED` (default: `true`): Fail if cloud unreachable
- `CLOUD_AUTH_MODE` (default: `api_key`): `api_key`, `hmac`, or `none`
- `CLOUD_API_KEY` (optional): API key for cloud auth
- `CLOUD_HMAC_SECRET` (optional): HMAC signing secret
- `OUTBOX_MAX_ATTEMPTS` (default: 10): Max retry attempts
- `INTERNAL_ADMIN_ENABLED` (default: `true`): Enable admin/debug endpoints

**Claim/Lease Strategy (Horizontal Scaling):**
- Uses `SELECT ... FOR UPDATE SKIP LOCKED` (PostgreSQL)
- Claims rows with `status = 'pending'` and unexpired leases
- Updates `claimed_by`, `claimed_at`, `lease_expires_at`
- Renews lease if processing takes > 5 minutes
- Orders events per-tenant by `occurred_at` (best-effort ordering)

**Failure Policy:**
- Max 10 attempts per event (exponential backoff with jitter)
- After max attempts: `status = 'failed'`, log alert
- Admin can manually retry: set `status = 'pending'`, clear `claimed_by`

**Dependencies:**
- postgres
- edge-cloud-ingestion-mock (development) or cloud-ingestion (production)

**Data Ownership:**
- `sync_outbox` - Read/claim/update (sync events)
- `sync_state` - Last sync timestamps

**Outbox Events Written:**
- `sync.batch.sent` - Batch sent to cloud
- `sync.batch.acked` - Batch acknowledged by cloud

**PVC Usage:** Uses DB storage on `edge-db-volume` (if DB is local)
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi, HPA: 2-10 replicas

---

#### edge-feed-intake

**Purpose:** Edge feed intake owner for SILO_AUTO and local manual/import entries; writes local intake + outbox events.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 5109
- Host: 5112 → 5109

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe (DB connectivity) |
| GET | `/api-docs` | OpenAPI/Swagger documentation |

**Primary Interface:**
- Consumes feed events from edge pipeline (normalized ingestion from MQTT/ingress)
- Supports SILO_AUTO intake by processing telemetry/event deltas
- Emits/records outbox entries for `edge-sync-forwarder`

**Dependencies:**
- postgres
- edge-mqtt-broker
- edge-sync-forwarder

**Data Ownership:**
- `feed_intake_local` - Local feed intake records
- `feed_intake_dedupe` - Duplicate prevention
- `sync_outbox` - Appends feed events for sync

**Outbox Events Written:**
- Feed intake events (appended to sync outbox)

**PVC Usage:** Uses DB storage on `edge-db-volume`
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi

---

### Ops/Support Services

#### edge-policy-sync

**Purpose:** Cache effective config from cloud BFF for offline-first edge operation.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5109 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| GET | `/api/v1/edge-config/effective` | Get effective config for context |
| GET | `/api/v1/edge-config/state` | Get config sync state |

**Environment Variables:**
- `BFF_BASE_URL` (default: `http://cloud-api-gateway-bff:3000`): Cloud BFF endpoint
- `EDGE_CLOUD_TOKEN` (optional): Auth token for cloud calls
- `POLICY_SYNC_INTERVAL_SECONDS` (default: 60): Sync interval
- `POLICY_SYNC_BACKOFF_CAP_SECONDS` (default: 600): Max backoff
- `POLICY_SYNC_TIMEOUT_SECONDS` (default: 10): Request timeout
- `EDGE_CONTEXTS` (default: `[]`): Edge contexts to sync

**Dependencies:**
- postgres
- cloud-api-gateway-bff

**Data Ownership:**
- `edge_config_cache` - Cached cloud configuration
- `edge_config_sync_state` - Sync state tracking

**Outbox Events:** None (read-only from cloud)
**PVC Usage:** Uses DB storage on `edge-db-volume`
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi

---

#### edge-retention-janitor

**Purpose:** Enforce media retention policies and free-disk safeguards.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5114 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| POST | `/api/v1/janitor/run` | Trigger janitor run |
| GET | `/api/v1/janitor/state` | Get janitor state |

**Environment Variables:**
- `MEDIA_BASE_PATH` (default: `/data/media`): Path to media files
- `MEDIA_RETENTION_DAYS` (default: 7): Retention period
- `MIN_FREE_DISK_GB` (default: 5): Minimum free disk required
- `JANITOR_INTERVAL_SECONDS` (default: 21600): Run interval (6 hours)
- `JANITOR_DRY_RUN` (default: `true`): Dry-run mode (no deletions)

**Dependencies:**
- postgres
- edge-media-store (for metadata lookup)

**Data Ownership:** None (acts on S3 objects via `edge-media-store`)

**Outbox Events:** None
**PVC Usage:** None directly (acts via edge-media-store)
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi

---

#### edge-observability-agent

**Purpose:** Aggregate edge health, resources, and sync backlog into a single ops view.

**Type:** Node.js (Express)
**Implementation:** `boilerplates/Backend-node`

**Ports:**
- Internal: 3000
- Host: 5111 → 3000

**API Endpoints:**

| Method | Path | Description |
|---------|-------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/ready` | Readiness probe |
| GET | `/api-docs` | OpenAPI/Swagger documentation |
| GET | `/api/v1/ops/edge/status` | Aggregated edge status |

**Status Response:**
```json
{
  "health": {
    "status": "healthy",
    "uptime": 86400,
    "version": "1.0.0"
  },
  "resources": {
    "cpuUsage": 45.2,
    "memoryUsage": 62.5,
    "diskUsage": {
      "usedPercent": 35.8,
      "freeGb": 125.5
    }
  },
  "sync": {
    "pendingCount": 45,
    "dlqCount": 8,
    "lastSyncAt": "2025-12-31T11:20:15.789Z"
  }
}
```

**Environment Variables:**
- `OBS_POLL_INTERVAL_SECONDS` (default: 30): Polling interval
- `DISK_PATH` (default: `/data`): Path to monitor
- Service URLs for polling downstream services

**Dependencies:**
- edge-ingress-gateway
- edge-telemetry-timeseries
- edge-weighvision-session
- edge-vision-inference
- edge-media-store
- edge-sync-forwarder

**Data Ownership:** None (aggregator only)
**Outbox Events:** None
**PVC Usage:** None
**Resource Requirements:** CPU 200m/1, Memory 256Mi/512Mi

---

#### edge-ops-web

**Purpose:** UI for edge operations with service proxy to avoid CORS issues.

**Type:** Static (nginx) + Node.js proxy server
**Implementation:** Custom

**Ports:**
- Internal: 80
- Host: 5113 → 80

**Access URLs:**
- UI: `http://localhost:5113/` (local) or `http://<edge-ip>:5113/` (edge device)

**Service Proxy (`/svc/*`):**
Browser can call internal services via proxy without CORS issues:

| Proxy Path | Target Service |
|------------|----------------|
| `/svc/ingress/*` | edge-ingress-gateway |
| `/svc/telemetry/*` | edge-telemetry-timeseries |
| `/svc/weighvision/*` | edge-weighvision-session |
| `/svc/media/*` | edge-media-store |
| `/svc/vision/*` | edge-vision-inference |
| `/svc/sync/*` | edge-sync-forwarder |
| `/svc/ops/*` | edge-observability-agent |
| `/svc/policy/*` | edge-policy-sync |
| `/svc/janitor/*` | edge-retention-janitor |
| `/svc/feed/*` | edge-feed-intake |

**Connection Profiles:**

| Profile | Base URL Pattern | Use Case |
|---------|-------------------|-----------|
| **local** | `http://localhost:5xxx` | Development on local machine |
| **cluster** | `/svc/xxx` (relative) | Running within docker compose network |
| **edge-device** | `http://<edge-ip>:5xxx` | Running on remote edge device |

**Environment Variables:**
- `VITE_TENANT_ID` (default: `t-001`): Tenant ID for API calls
- `VITE_CONNECTION_PROFILE` (default: `local`): Connection profile (local/cluster/edge-device)
- `VITE_EDGE_HOST` (default: `192.168.1.50`): Edge device IP
- `VITE_AUTH_MODE` (default: `none`): Auth mode (none, api-key, hmac)
- `VITE_API_KEY` (optional): API key for auth
- `VITE_HMAC_SECRET` (optional): HMAC signing secret
- Service base URLs for all edge services

**Dependencies:** All core services (for proxy and data)
**Data Ownership:** None (UI/proxy only)
**Outbox Events:** None
**PVC Usage:** None
**Resource Requirements:** CPU 100m/500m, Memory 128Mi/256Mi

**See:** [03-edge-ops-web.md](03-edge-ops-web.md) for detailed usage instructions

---

## Links

- [00-overview.md](00-overview.md) - Architecture overview and data flows
- [02-setup-run.md](02-setup-run.md) - How to run compose, env vars, troubleshooting
- [03-edge-ops-web.md](03-edge-ops-web.md) - UI usage guide
- [Evidence](../progress/edge-compose-verify.md) - Verified compose run results
- [Evidence](../progress/edge-ops-realdata.md) - Real data integration details

