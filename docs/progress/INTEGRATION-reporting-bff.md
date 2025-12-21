# BFF Reporting Export Service Integration

**Date**: 2025-12-21  
**Status**: ✅ **COMPLETE**  
**Owner**: CursorAI

---

## Summary

Added BFF proxy routes for `cloud-reporting-export-service` to enable frontend to call reporting endpoints through BFF only (no direct service calls).

---

## Implementation Checklist

- [x] BFF service client created (`src/services/reportingExportService.ts`)
- [x] BFF controller created (`src/controllers/reportingController.ts`)
- [x] BFF routes created (`src/routes/reportingRoutes.ts`)
- [x] Routes registered in `src/routes/index.ts`
- [x] Docker Compose env vars verified (REPORTING_EXPORT_BASE_URL)
- [x] Unit tests added (service client + controller)
- [x] Verification documentation created

---

## Proxy Endpoints Implemented

### POST /api/v1/reports/jobs
- **Purpose**: Create a new report job
- **Proxy to**: `cloud-reporting-export-service` POST `/api/v1/reports/jobs`
- **Auth**: JWT required
- **Headers propagated**: Authorization, x-tenant-id, x-request-id, x-trace-id, Idempotency-Key

### GET /api/v1/reports/jobs
- **Purpose**: List report jobs
- **Proxy to**: `cloud-reporting-export-service` GET `/api/v1/reports/jobs`
- **Auth**: JWT required
- **Query params**: tenantId (required), farmId, barnId, batchId, jobType, status, limit, cursor

### GET /api/v1/reports/jobs/:jobId
- **Purpose**: Get report job by ID
- **Proxy to**: `cloud-reporting-export-service` GET `/api/v1/reports/jobs/:jobId`
- **Auth**: JWT required
- **Query params**: tenantId (required)

### GET /api/v1/reports/jobs/:jobId/download
- **Purpose**: Get download URL for report job
- **Proxy to**: `cloud-reporting-export-service` GET `/api/v1/reports/jobs/:jobId/download`
- **Auth**: JWT required
- **Response**: May return redirect or JSON with `download_url`

### GET /api/v1/reports/jobs/:jobId/file
- **Purpose**: Stream report file (token-based download)
- **Proxy to**: `cloud-reporting-export-service` GET `/api/v1/reports/jobs/:jobId/file`
- **Auth**: Token-based (no JWT required, but token query param must be valid)
- **Query params**: token (required)

---

## Environment Variables

**BFF Environment** (already set in docker-compose):
```bash
REPORTING_EXPORT_BASE_URL=http://cloud-reporting-export-service:3000
```

**Verification**:
- ✅ `docker-compose.dev.yml`: Line 236
- ✅ `docker-compose.yml`: Line 444

---

## Verification Commands

### 1. Health Check
```powershell
# BFF health
curl http://localhost:5125/api/health

# Reporting service health (direct)
curl http://localhost:5129/api/health
```

### 2. Create Report Job
```powershell
curl -X POST http://localhost:5125/api/v1/reports/jobs `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <token>" `
  -H "x-tenant-id: <tenant-uuid>" `
  -H "Idempotency-Key: <unique-key>" `
  -d '{
    "job_type": "FEED_INTAKE_EXPORT",
    "format": "CSV",
    "tenantId": "<tenant-uuid>",
    "farm_id": "<farm-uuid>",
    "barn_id": "<barn-uuid>",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "job-uuid",
  "tenant_id": "tenant-uuid",
  "job_type": "FEED_INTAKE_EXPORT",
  "format": "CSV",
  "status": "queued",
  "created_at": "2025-12-21T10:00:00Z"
}
```

### 3. List Report Jobs
```powershell
curl -X GET "http://localhost:5125/api/v1/reports/jobs?tenantId=<tenant-uuid>&status=succeeded" `
  -H "Authorization: Bearer <token>" `
  -H "x-tenant-id: <tenant-uuid>"
```

**Expected Response** (200 OK):
```json
{
  "items": [
    {
      "id": "job-uuid",
      "tenant_id": "tenant-uuid",
      "job_type": "FEED_INTAKE_EXPORT",
      "status": "succeeded",
      "file_name": "feed_intake_2025-01.csv",
      "created_at": "2025-12-21T10:00:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

### 4. Get Report Job by ID
```powershell
curl -X GET "http://localhost:5125/api/v1/reports/jobs/<job-uuid>?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>" `
  -H "x-tenant-id: <tenant-uuid>"
```

**Expected Response** (200 OK):
```json
{
  "id": "job-uuid",
  "tenant_id": "tenant-uuid",
  "job_type": "FEED_INTAKE_EXPORT",
  "format": "CSV",
  "status": "succeeded",
  "progress_pct": 100,
  "file_path": "/data/exports/job-uuid.csv",
  "file_name": "feed_intake_2025-01.csv",
  "size_bytes": 102400,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T10:05:00Z"
}
```

### 5. Get Download URL
```powershell
curl -X GET "http://localhost:5125/api/v1/reports/jobs/<job-uuid>/download?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>" `
  -H "x-tenant-id: <tenant-uuid>"
```

**Expected Response** (200 OK with redirect or JSON):
```json
{
  "download_url": "http://localhost:5125/api/v1/reports/jobs/<job-uuid>/file?token=<signed-token>"
}
```

### 6. Stream Report File (Token-based)
```powershell
curl -X GET "http://localhost:5125/api/v1/reports/jobs/<job-uuid>/file?token=<signed-token>"
```

**Expected Response**: File download (CSV/Excel/PDF based on format)

---

## Error Handling

### Validation Error (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "tenantId is required",
    "traceId": "trace-123"
  }
}
```

### Not Found (404)
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Downstream service error",
    "traceId": "trace-123"
  }
}
```

### Service Unavailable (502)
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Downstream service error",
    "traceId": "trace-123"
  }
}
```

---

## Structured Logging

All reporting routes log:
- `route`: e.g., "POST /api/v1/reports/jobs"
- `downstreamService`: "reporting-export"
- `duration_ms`: Request duration in milliseconds
- `status_code`: HTTP status code
- `requestId`: Request ID for correlation
- `traceId`: Trace ID for distributed tracing

**Example log entry**:
```json
{
  "level": "info",
  "message": "Reporting service call succeeded",
  "route": "POST /api/v1/reports/jobs",
  "downstreamService": "reporting-export",
  "duration_ms": 245,
  "status_code": 201,
  "requestId": "req-456",
  "traceId": "trace-789"
}
```

---

## Tenant Scoping

- All endpoints require `tenantId` (from JWT `res.locals.tenantId` or query/body param)
- Tenant ID is propagated to downstream service via `x-tenant-id` header
- If JWT tenantId and request tenantId mismatch, request tenantId is used (with warning log in dev mode)

---

## Files Changed

1. **New Files**:
   - `cloud-layer/cloud-api-gateway-bff/src/services/reportingExportService.ts`
   - `cloud-layer/cloud-api-gateway-bff/src/controllers/reportingController.ts`
   - `cloud-layer/cloud-api-gateway-bff/src/routes/reportingRoutes.ts`
   - `cloud-layer/cloud-api-gateway-bff/tests/services/reportingExportService.spec.ts`
   - `cloud-layer/cloud-api-gateway-bff/tests/controllers/reportingController.spec.ts`
   - `docs/progress/INTEGRATION-reporting-bff.md`

2. **Modified Files**:
   - `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (added reporting routes)

3. **Verified Files**:
   - `cloud-layer/docker-compose.dev.yml` (REPORTING_EXPORT_BASE_URL already set)
   - `cloud-layer/docker-compose.yml` (REPORTING_EXPORT_BASE_URL already set)

---

## Evidence Files

- `cloud-layer/evidence/compose.dev.resolved.yml` - Resolved dev compose config
- `cloud-layer/evidence/compose.prod.resolved.yml` - Resolved prod compose config

---

## Tests

### Unit Tests
- ✅ Service client URL building + header propagation
- ✅ Controller error mapping (400, 404)

### Run Tests
```powershell
cd cloud-layer/cloud-api-gateway-bff
npm test -- reportingExportService.spec.ts
npm test -- reportingController.spec.ts
```

---

## Next Steps

- [ ] Add integration tests (end-to-end with mock reporting service)
- [ ] Add OpenAPI spec update (if required by contract)
- [ ] Frontend integration (update FE to use BFF routes)

---

**Last Updated**: 2025-12-21

