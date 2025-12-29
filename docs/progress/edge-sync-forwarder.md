# Service Progress: edge-sync-forwarder

**Service**: `edge-sync-forwarder`  
**Layer**: `edge`  
**Status**: `done`  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Service for syncing edge telemetry and events to the cloud. It monitors the `outbox` table, batches items, and forwards them to `cloud-ingestion` with retry logic.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 {"status":"healthy"}`
- `GET /api/ready` → `200 {"status":"ready"}`
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `GET /api/v1/sync/state` → Returns the current state of synchronization (last success, last attempt, backlog size, last error).
- `POST /api/v1/sync/trigger` → Manually triggers a synchronization process.

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
CLOUD_INGESTION_URL=http://cloud-ingestion:3000/api/v1/edge/batch
CLOUD_INGESTION_URL_REQUIRED=true
CLOUD_AUTH_MODE=api_key  # none|api_key|hmac
CLOUD_API_KEY=edge-local-key
DD_SERVICE=edge-sync-forwarder
DD_ENV=development

# Service-specific
SYNC_INTERVAL_MS=60000
OUTBOX_BATCH_SIZE=100
```

---

## Docker Build & Run

```bash
# Build
docker compose -f edge-layer/docker-compose.yml build edge-sync-forwarder

# Run
docker compose -f edge-layer/docker-compose.yml up edge-sync-forwarder
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5108/api/health
# Expected: {"status":"healthy"}
```

### Sync State
```powershell
curl http://localhost:5108/api/v1/sync/state
```

### Manual Trigger
```powershell
curl -X POST http://localhost:5108/api/v1/sync/trigger
```

### Cloud Auth Handshake
```powershell
curl http://localhost:5108/api/v1/sync/diagnostics/cloud
```

### P3 End-to-End Evidence (edge -> cloud)
```bash
# 1) Start cloud ingestion + rabbitmq + postgres (cloud layer)
docker compose -f cloud-layer/docker-compose.yml up -d --build postgres rabbitmq cloud-ingestion

# 2) Start edge stack (edge layer + dev infra override)
docker compose -f edge-layer/docker-compose.yml -f edge-layer/docker-compose.dev.yml \
  up -d --build postgres minio edge-media-store edge-vision-inference \
  edge-weighvision-session edge-sync-forwarder

# 3) Run smoke with real cloud ingestion target + auth
CLOUD_INGESTION_URL=http://cloud-ingestion:3000/api/v1/edge/batch \
CLOUD_AUTH_MODE=api_key \
CLOUD_API_KEY=edge-local-key \
  bash edge-layer/scripts/edge-smoke-http.sh

# 4) Verify cloud stored events (diagnostics endpoint)
TENANT_ID=t-001
curl -sS "http://localhost:5122/api/v1/edge/diagnostics/dedupe?tenant_id=$TENANT_ID&limit=5" \
  -H "x-api-key: edge-local-key"

# 5) Rerun smoke: duplicates should remain stable
CLOUD_INGESTION_URL=http://cloud-ingestion:3000/api/v1/edge/batch \
CLOUD_AUTH_MODE=api_key \
CLOUD_API_KEY=edge-local-key \
  bash edge-layer/scripts/edge-smoke-http.sh

# 6) Verify no new duplicates (count unchanged for tenant)
curl -sS "http://localhost:5122/api/v1/edge/diagnostics/dedupe?tenant_id=$TENANT_ID" \
  -H "x-api-key: edge-local-key"
```

### P3 Verification Checklist
- handshake ok (`/api/v1/sync/diagnostics/cloud` returns 200)
- auth fail cases (missing/invalid `x-api-key` or `x-edge-signature` returns 401)
- batch ok (200 with accepted > 0)
- dedupe ok (diagnostics count stable across retries)
- rerun smoke ok (no new dedupe rows)

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200
- [x] `/api-docs` accessible
- [x] Winston/JSON logging configured
- [x] Database schema defined (sync_state, reads outbox)
- [x] Environment variables documented
- [x] Docker build succeeds
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] Sync logic implemented with batching and state tracking
- [x] Progress documented in this file

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings
- `docs/shared/01-api-standards.md` - API standards
- `docs/STATUS.md` - Overall project status
