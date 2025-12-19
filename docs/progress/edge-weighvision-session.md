# Service Progress: edge-weighvision-session

**Service**: `edge-weighvision-session`  
**Layer**: `edge`  
**Status**: `done`  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Service for managing the lifecycle of WeighVision sessions at the edge. It binds weights and media objects to sessions and emits outbox events for cloud synchronization.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 {"status":"healthy"}`
- `GET /api/ready` → `200 {"status":"ready"}`
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `POST /api/v1/weighvision/sessions` → Create or upsert a session (idempotent).
- `GET /api/v1/weighvision/sessions/{sessionId}` → Get session details with bound weights.
- `POST /api/v1/weighvision/sessions/{sessionId}/bind-weight` → Bind a weight record to a session (idempotent).
- `POST /api/v1/weighvision/sessions/{sessionId}/bind-media` → Bind a media object to a session (supports reconciliation).
- `POST /api/v1/weighvision/sessions/{sessionId}/finalize` → Finalize a session and compute results.

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=3000
DD_SERVICE=edge-weighvision-session
DD_ENV=development
```

---

## Docker Build & Run

```bash
# Build
docker compose -f edge-layer/docker-compose.yml build edge-weighvision-session

# Run
docker compose -f edge-layer/docker-compose.yml up edge-weighvision-session
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5105/api/health
# Expected: {"status":"healthy"}
```

### Sample Flow Verification

#### 1. Bind Media before Session exists (Reconciliation Test)
```powershell
curl -X POST http://localhost:5105/api/v1/weighvision/sessions/sess-123/bind-media `
  -H "Content-Type: application/json" `
  -d '{
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "mediaObjectId": "media-456",
    "occurredAt": "2025-12-18T10:00:00Z",
    "eventId": "event-m-1"
  }'
```

#### 2. Create Session (Should reconcile media-456)
```powershell
curl -X POST http://localhost:5105/api/v1/weighvision/sessions `
  -H "Content-Type: application/json" `
  -d '{
    "sessionId": "sess-123",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "farmId": "00000000-0000-0000-0000-000000000002",
    "barnId": "00000000-0000-0000-0000-000000000003",
    "deviceId": "00000000-0000-0000-0000-000000000004",
    "stationId": "00000000-0000-0000-0000-000000000005",
    "startAt": "2025-12-18T10:00:00Z"
  }'
# Check imageCount in response should be 1
```

#### 3. Bind Weight
```powershell
curl -X POST http://localhost:5105/api/v1/weighvision/sessions/sess-123/bind-weight `
  -H "Content-Type: application/json" `
  -d '{
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "weightKg": 25.5,
    "occurredAt": "2025-12-18T10:05:00Z",
    "eventId": "event-w-1"
  }'
```

#### 4. Finalize
```powershell
curl -X POST http://localhost:5105/api/v1/weighvision/sessions/sess-123/finalize
```

#### 5. Verify Outbox Rows
```sql
-- Connect to Postgres
SELECT * FROM outbox WHERE event_type LIKE 'weighvision.session.%';
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] Prisma schema defined (weight_sessions, session_weights, session_media_bindings, outbox)
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200
- [x] `/api-docs` accessible
- [x] POST /api/v1/weighvision/sessions (idempotent + reconciliation)
- [x] POST /api/v1/weighvision/sessions/{sessionId}/bind-weight (idempotent)
- [x] POST /api/v1/weighvision/sessions/{sessionId}/bind-media (reconciliation)
- [x] POST /api/v1/weighvision/sessions/{sessionId}/finalize (idempotent)
- [x] Outbox events emitted correctly
- [x] Docker build succeeds
- [x] Progress documented in this file

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings (5105)
- `docs/shared/01-api-standards.md` - API standards
- `docs/STATUS.md` - Overall project status
