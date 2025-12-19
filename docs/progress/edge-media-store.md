# Service Progress: edge-media-store

**Service**: `edge-media-store`  
**Layer**: `edge`  
**Status**: `done`  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Owner of media storage at the edge. Handles binary image uploads, metadata management, and triggers vision inference jobs.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 {"status":"healthy"}`
- `GET /api/ready` → `200 {"status":"ready"}`
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `POST /api/v1/media/images/presign` → Pre-registers an image upload. Returns `mediaId` and `uploadUrl`.
- `PUT /api/v1/media/upload/{mediaId}` → Accepts raw binary body and saves to disk.
- `GET /api/v1/media/objects/{mediaId}/meta` → Retrieves metadata for a media object.

---

## Implementation Details

### Storage Strategy
Files are stored locally in the path defined by `MEDIA_STORAGE_PATH` (default `/data/media`).
Structure: `/{tenantId}/{farmId}/{barnId}/{sessionId}/{timestamp}_{stationId}.{ext}`

### Workflow
1. Camera/Device calls `presign`.
2. Camera/Device `PUT` binary to the returned URL.
3. Service saves file, writes `media.stored` outbox event, and notifies `edge-vision-inference`.

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5106/api/health
# Expected: {"status":"healthy"}
```

### Flow Verification
```powershell
# 1. Presign
curl -X POST http://localhost:5106/api/v1/media/images/presign `
  -H "Content-Type: application/json" `
  -d '{
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "farmId": "00000000-0000-0000-0000-000000000002",
    "barnId": "00000000-0000-0000-0000-000000000003",
    "stationId": "00000000-0000-0000-0000-000000000005",
    "sessionId": "00000000-0000-0000-0000-000000000006",
    "mediaType": "image/jpeg",
    "originalName": "pig_123.jpg"
  }'

# 2. Upload (using returned mediaId)
# curl -X PUT http://localhost:5106/api/v1/media/upload/{mediaId} --data-binary @path/to/image.jpg
```

---

## Progress Checklist

- [x] Scaffold from Backend-node boilerplate
- [x] Own DB tables: media_objects
- [x] PVC filesystem management
- [x] POST /api/v1/media/images/presign
- [x] PUT /api/v1/media/upload/{mediaId} (Raw binary handling)
- [x] GET /api/v1/media/objects/{mediaId}/meta
- [x] Emit outbox event: media.stored
- [x] Trigger vision inference call
- [x] Tests + Evidence + docs/progress/edge-media-store.md

---

## Related Documentation

- `docs/shared/00-api-catalog.md` - API details
- `edge-layer/docker-compose.yml` - Deployment config
