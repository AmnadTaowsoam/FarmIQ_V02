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
DD_SERVICE=edge-sync-forwarder
DD_ENV=development

# Service-specific
SYNC_INTERVAL_MS=60000
SYNC_BATCH_SIZE=100
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
