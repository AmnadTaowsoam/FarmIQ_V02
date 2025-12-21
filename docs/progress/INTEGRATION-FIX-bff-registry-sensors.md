# BFF Integration Fix: Tenant Registry & Sensor Module

**Date**: 2025-02-04  
**Scope**: `cloud-layer/cloud-api-gateway-bff`  
**Goal**: Add BFF proxy routes for tenant-registry endpoints and sensor module endpoints so FE can call BFF only.

## Summary

Implemented BFF proxy routes for:
- Tenant Registry endpoints: 
  - GET `/api/v1/tenants`, `/api/v1/farms`, `/api/v1/barns`, `/api/v1/batches`, `/api/v1/devices`, `/api/v1/stations`
  - POST `/api/v1/farms`, `/api/v1/barns`, `/api/v1/batches`, `/api/v1/devices`
  - PATCH `/api/v1/farms/:id`, `/api/v1/barns/:id`, `/api/v1/batches/:id`, `/api/v1/devices/:id`
- Sensor Module endpoints: `/api/v1/sensors`, `/api/v1/sensors/{sensorId}`, `/api/v1/sensors/{sensorId}/bindings`, `/api/v1/sensors/{sensorId}/calibrations`

All routes enforce:
- JWT authentication
- Tenant scoping (via `getTenantIdFromRequest`)
- Request/trace ID propagation
- Idempotency-Key support (for POST routes)
- Standard error envelope mapping

## Files Changed

### Service Clients
- `src/services/tenantRegistryService.ts` - Client for tenant registry endpoints (GET/POST/PATCH for farms, barns, batches, devices)
- `src/services/sensorsService.ts` - Client for sensor module endpoints
- `src/services/dashboardService.ts` - Added PATCH support to `DownstreamOptions`

### Controllers
- `src/controllers/tenantRegistryController.ts` - Handlers for tenant registry routes (GET/POST/PATCH handlers for farms, barns, batches, devices)
- `src/controllers/sensorsController.ts` - Handlers for sensor module routes

### Routes
- `src/routes/tenantRegistryRoutes.ts` - Route definitions for tenant registry (GET/POST/PATCH routes)
- `src/routes/sensorsRoutes.ts` - Route definitions for sensor module
- `src/routes/index.ts` - Registered new routes

### Docker Compose
- `docker-compose.yml` - Added `FEED_SERVICE_URL` and `BARN_RECORDS_SERVICE_URL` env vars, added dependencies
- `docker-compose.dev.yml` - Added all service URL env vars for BFF

## Verification Commands

### 1. Build and Start Services

```powershell
# Navigate to cloud-layer
cd cloud-layer

# Build and start services
docker compose -f docker-compose.dev.yml up -d --build

# Wait for services to be healthy
docker compose -f docker-compose.dev.yml ps
```

### 2. Health Check

```powershell
# Check BFF health
curl http://localhost:5125/api/health

# Expected: 200 OK with health status
```

### 3. Tenant Registry Endpoints

```powershell
# Get tenants (requires tenantId query param or JWT with tenant claim)
curl -X GET "http://localhost:5125/api/v1/tenants?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>" `
  -H "x-request-id: test-request-001"

# Get farms
curl -X GET "http://localhost:5125/api/v1/farms?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create farm
curl -X POST "http://localhost:5125/api/v1/farms" `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: farm-create-001" `
  -d '{
    "tenantId": "<tenant-uuid>",
    "name": "Farm A",
    "location": "Location A",
    "status": "active"
  }'

# Update farm
curl -X PATCH "http://localhost:5125/api/v1/farms/<farm-id>" `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d '{
    "tenantId": "<tenant-uuid>",
    "name": "Updated Farm A"
  }'

# Get barns
curl -X GET "http://localhost:5125/api/v1/barns?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create barn
curl -X POST "http://localhost:5125/api/v1/barns" `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: barn-create-001" `
  -d '{
    "tenantId": "<tenant-uuid>",
    "farmId": "<farm-uuid>",
    "name": "Barn 1",
    "capacity": 1000
  }'

# Get batches
curl -X GET "http://localhost:5125/api/v1/batches?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create batch
curl -X POST "http://localhost:5125/api/v1/batches" `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: batch-create-001" `
  -d '{
    "tenantId": "<tenant-uuid>",
    "farmId": "<farm-uuid>",
    "barnId": "<barn-uuid>",
    "speciesCode": "CHICKEN",
    "breedCode": "BROILER",
    "startDate": "2025-01-01",
    "initialHeadcount": 1000
  }'

# Get devices
curl -X GET "http://localhost:5125/api/v1/devices?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create device
curl -X POST "http://localhost:5125/api/v1/devices" `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: device-create-001" `
  -d '{
    "tenantId": "<tenant-uuid>",
    "deviceId": "device-001",
    "type": "sensor",
    "model": "Model X",
    "status": "ONLINE"
  }'

# Get stations
curl -X GET "http://localhost:5125/api/v1/stations?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"
```

**Expected**: 
- GET: 200 OK with JSON list envelope (items array + pagination metadata if applicable)
- POST: 201 Created with created resource
- PATCH: 200 OK with updated resource

### 4. Sensor Module Endpoints

```powershell
# Get sensors
curl -X GET "http://localhost:5125/api/v1/sensors?tenantId=<tenant-uuid>&barnId=<barn-uuid>" `
  -H "Authorization: Bearer <token>"

# Get sensor by ID
curl -X GET "http://localhost:5125/api/v1/sensors/<sensor-id>?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create sensor (with idempotency)
curl -X POST "http://localhost:5125/api/v1/sensors" `
  -H "Authorization: Bearer <token>" `
  -H "Idempotency-Key: sensor-create-001" `
  -H "Content-Type: application/json" `
  -d '{
    "sensorId": "TEMP-001",
    "type": "temperature",
    "unit": "C",
    "label": "Barn Temperature Sensor",
    "barnId": "<barn-uuid>",
    "tenantId": "<tenant-uuid>"
  }'

# Update sensor
curl -X PATCH "http://localhost:5125/api/v1/sensors/<sensor-id>" `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d '{
    "label": "Updated Label",
    "enabled": true,
    "tenantId": "<tenant-uuid>"
  }'

# Get bindings
curl -X GET "http://localhost:5125/api/v1/sensors/<sensor-id>/bindings?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create binding
curl -X POST "http://localhost:5125/api/v1/sensors/<sensor-id>/bindings" `
  -H "Authorization: Bearer <token>" `
  -H "Idempotency-Key: binding-create-001" `
  -H "Content-Type: application/json" `
  -d '{
    "deviceId": "<device-uuid>",
    "protocol": "mqtt",
    "channel": "iot/telemetry/+/+/+/+/temperature",
    "samplingRate": 60,
    "effectiveFrom": "2025-02-04T00:00:00Z",
    "tenantId": "<tenant-uuid>"
  }'

# Get calibrations
curl -X GET "http://localhost:5125/api/v1/sensors/<sensor-id>/calibrations?tenantId=<tenant-uuid>" `
  -H "Authorization: Bearer <token>"

# Create calibration
curl -X POST "http://localhost:5125/api/v1/sensors/<sensor-id>/calibrations" `
  -H "Authorization: Bearer <token>" `
  -H "Idempotency-Key: calib-create-001" `
  -H "Content-Type: application/json" `
  -d '{
    "offset": 0.5,
    "gain": 1.0,
    "method": "two-point",
    "performedAt": "2025-02-04T10:00:00Z",
    "performedBy": "user-123",
    "tenantId": "<tenant-uuid>"
  }'
```

**Expected**: 
- GET: 200 OK with JSON response
- POST: 201 Created with created resource
- PATCH: 200 OK with updated resource

### 5. Error Cases

```powershell
# Missing tenantId
curl -X GET "http://localhost:5125/api/v1/farms" `
  -H "Authorization: Bearer <token>"

# Expected: 400 Bad Request
# {
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "tenantId is required",
#     "traceId": "..."
#   }
# }

# Unauthorized (missing token in production)
curl -X GET "http://localhost:5125/api/v1/farms?tenantId=<tenant-uuid>"

# Expected: 401 Unauthorized (in production mode)
```

## Environment Variables

The following environment variables are now configured in docker-compose:

- `REGISTRY_BASE_URL` (or `TENANT_REGISTRY_URL`) - Points to `http://cloud-tenant-registry:3000`
- `FEED_SERVICE_URL` - Points to `http://cloud-feed-service:5130`
- `BARN_RECORDS_SERVICE_URL` - Points to `http://cloud-barn-records-service:5131`
- `TELEMETRY_BASE_URL` - Points to `http://cloud-telemetry-service:3000`
- `ANALYTICS_BASE_URL` - Points to `http://cloud-analytics-service:8000`
- `REPORTING_EXPORT_BASE_URL` - Points to `http://cloud-reporting-export-service:3000`
- (Other service URLs as needed)

## Integration Notes

1. **Tenant Scoping**: All endpoints require `tenantId` either from:
   - Query parameter: `?tenantId=<uuid>`
   - JWT token claims (if present)
   - Platform admin can override with explicit tenantId param

2. **Idempotency**: POST endpoints support `Idempotency-Key` header for safe retries.

3. **Pagination**: List endpoints support cursor-based pagination via `cursor` and `limit` query params (passed through to downstream service).

4. **Error Mapping**: Downstream errors are mapped to standard error envelope format per `docs/shared/01-api-standards.md`.

5. **Logging**: All requests log:
   - Route path
   - Downstream service name
   - Duration (ms)
   - Status code
   - Request ID

## Next Steps

- [ ] Update OpenAPI/Swagger docs in BFF to include new endpoints
- [ ] Add integration tests for BFF proxy routes
- [ ] Verify FE can successfully call these endpoints via BFF
- [ ] Monitor logs for any downstream service errors

