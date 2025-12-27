# Service Progress: cloud-api-gateway-bff

**Service**: cloud-api-gateway-bff  
**Layer**: cloud  
**Status**: done  
**Owner**: CursorAI  
**Last Updated**: 2025-01-18

---

## Overview

Cloud API Gateway BFF for the FarmIQ dashboard. This service does **not** access any database directly; it aggregates data from downstream cloud services:
- `cloud-tenant-registry` (topology, farms, barns)
- `cloud-telemetry-service` (readings, aggregates, metrics)
- `cloud-analytics-service` (alerts/KPIs, when available)

It exposes dashboard-friendly endpoints under `/api/v1/dashboard/...`, enforces multi-tenant scope via JWT, and propagates trace/request/tenant headers downstream.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 {"status":"ready"}`
- `GET /api-docs` → OpenAPI/Swagger UI (`openapi.yaml`)

### Business Endpoints

All business endpoints:
- Require `Authorization: Bearer <JWT>` (pluggable dev mode allowed)
- Enforce tenant scope via JWT `tenant_id` or query param (for `platform_admin`)
- Use standard error format from `docs/shared/01-api-standards.md`

#### Overview
- `GET /api/v1/dashboard/overview?tenantId=<optional>`
  - **Input**:
    - `tenantId` (query, optional): required only when `platform_admin` queries another tenant; otherwise derived from JWT.
  - **Output**:
    - `topology`: result from `cloud-tenant-registry /api/v1/topology` (or `null` on failure)
    - `telemetry.metrics`: result from `cloud-telemetry-service /api/v1/telemetry/metrics`
    - `telemetry.aggregates`: result from `cloud-telemetry-service /api/v1/telemetry/aggregates`
    - `alerts`: result from `cloud-analytics-service /api/v1/analytics/alerts` (empty if unavailable)
    - `analyticsAvailable`: `true` if analytics call succeeded; `false` otherwise

#### Farm Dashboard
- `GET /api/v1/dashboard/farms/{farmId}?tenantId=<optional>`
  - Aggregates:
    - `farm`: details from `cloud-tenant-registry /api/v1/farms/{farmId}`
    - `barns`: list from `cloud-tenant-registry /api/v1/barns?farmId=...`
    - `telemetryAggregates`: from `cloud-telemetry-service /api/v1/telemetry/aggregates?tenantId=...&farmId=...`

#### Barn Dashboard
- `GET /api/v1/dashboard/barns/{barnId}?tenantId=<optional>`
  - Aggregates:
    - `barn`: details from `cloud-tenant-registry /api/v1/barns/{barnId}`
    - `telemetryAggregates`: from `cloud-telemetry-service /api/v1/telemetry/aggregates?tenantId=...&barnId=...`
    - `telemetryReadings`: from `cloud-telemetry-service /api/v1/telemetry/readings?tenantId=...&barnId=...`

#### Alerts
- `GET /api/v1/dashboard/alerts?tenantId=<optional>`
  - Aggregates:
    - `alerts`: from `cloud-analytics-service /api/v1/analytics/alerts?tenantId=...` (may be empty if analytics not yet implemented)
    - `analyticsAvailable`: `true/false` based on downstream success

> NOTE: Any future `weighvision` read model endpoints for dashboard will be added here only after Doc Captain updates catalogs/STATUS accordingly.

---

## Environment Variables

```bash
# Core
APP_PORT=3000
NODE_ENV=development

# Downstream service base URLs (docker-compose defaults)
IDENTITY_BASE_URL=http://cloud-identity-access:3000
REGISTRY_BASE_URL=http://cloud-tenant-registry:3000
TELEMETRY_BASE_URL=http://cloud-telemetry-service:3000
ANALYTICS_BASE_URL=http://cloud-analytics-service:8000
WEIGHVISION_READMODEL_BASE_URL=http://cloud-weighvision-readmodel:3000

# Auth (pluggable)
JWT_SECRET=your-secret-key   # optional in dev; required in production

# Observability
DD_SERVICE=cloud-api-gateway-bff
DD_ENV=development
```

---

## Downstream Mapping

- **Registry**: `${REGISTRY_BASE_URL}/api/v1/...`
  - Topology: `/topology`
  - Farm details: `/farms/{farmId}`
  - Barn list: `/barns?farmId=...`
  - Barn details: `/barns/{barnId}`

- **Telemetry**: `${TELEMETRY_BASE_URL}/api/v1/telemetry/...`
  - Metrics: `/metrics?tenantId=...`
  - Aggregates: `/aggregates?tenantId=...&farmId=...&barnId=...`
  - Readings: `/readings?tenantId=...&barnId=...`

- **Analytics**: `${ANALYTICS_BASE_URL}/api/v1/analytics/...`
  - Alerts: `/alerts?tenantId=...` (best-effort; empty if service not ready)

- **Header propagation**:
  - `Authorization` (Bearer JWT)
  - `x-request-id`
  - `x-trace-id`
  - `x-tenant-id`

---

## Docker Build & Run

```bash
# From repo root

# Ensure infra + cloud services are running
docker compose --profile infra up -d postgres rabbitmq
docker compose -f cloud-layer/docker-compose.yml up -d cloud-identity-access cloud-tenant-registry cloud-telemetry-service cloud-analytics-service

# Build + run BFF
docker compose -f cloud-layer/docker-compose.yml up cloud-api-gateway-bff --build
```

---

## Evidence Commands

### Health Check

```powershell
curl http://localhost:5125/api/health
# Expected: 200 OK

curl http://localhost:5125/api/ready
# Expected: 200 {"status":"ready"}
```

### API Documentation

```powershell
# Open Swagger UI
start http://localhost:5125/api-docs
```

### Sample JWT (dev-mode, unverified payload)

For local testing, you can create a JWT-like string with payload:

```json
{
  "sub": "user-123",
  "tenant_id": "test-tenant-001",
  "roles": ["tenant_admin"]
}
```

Encode as base64 (header/payload/signature) or use a real JWT from `cloud-identity-access`.

### Overview Endpoint

```powershell
# Assume you have a valid JWT in $token
$headers = @{
  "Authorization" = "Bearer $token"
  "x-request-id"  = [guid]::NewGuid().ToString()
}

curl "http://localhost:5125/api/v1/dashboard/overview" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $($headers.'x-request-id')"
```

### Farm Dashboard

```powershell
$farmId = "test-farm-001"

curl "http://localhost:5125/api/v1/dashboard/farms/$farmId" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)"
```

### Barn Dashboard

```powershell
$barnId = "test-barn-001"

curl "http://localhost:5125/api/v1/dashboard/barns/$barnId" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)"
```

### Notifications (in-app)

```powershell
$tenantId = "test-tenant-001"

# Inbox (current user/roles)
curl "http://localhost:5125/api/v1/notifications/inbox?tenantId=$tenantId&limit=25" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)"

# History (audit / all channels)
curl "http://localhost:5125/api/v1/notifications/history?tenantId=$tenantId&limit=25" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)"

# Send (RBAC: tenant_admin, farm_manager)
curl "http://localhost:5125/api/v1/notifications/send?tenantId=$tenantId" `
  -Method POST `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)" `
  -H "idempotency-key: TEST:$tenantId:1" `
  -ContentType "application/json" `
  -Body (@{
    tenantId = $tenantId
    severity = "info"
    channel  = "in_app"
    title    = "Test"
    message  = "Hello"
    externalRef = "TEST:1"
    targets = @(@{ type = "role"; value = "tenant_admin" })
  } | ConvertTo-Json -Depth 5)
```

### Alerts

```powershell
curl "http://localhost:5125/api/v1/dashboard/alerts" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)"
```

### Logs

```powershell
docker logs farmiq-cloud-api-gateway-bff -f
# Expect Winston JSON logs with requestId/traceId and downstream call info
```

---

## Progress Checklist

- [x] Service scaffolded from Backend-node boilerplate
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200
- [x] `/api-docs` accessible
- [x] Winston JSON logging configured
- [x] Datadog tracing configured (`dd-trace`)
- [x] No direct DB access (BFF uses downstream HTTP only)
- [x] JWT auth middleware (pluggable) implemented
- [x] Tenant scoping & `platform_admin` support
- [x] Downstream URLs wired from env (`*_BASE_URL`)
- [x] Endpoints implemented: overview, farms/{farmId}, barns/{barnId}, alerts
- [x] Docker-compose entry configured on port 5125
- [x] Basic unit tests for env URL resolution & auth middleware
- [x] Progress documented in this file

---

## Notes

- All aggregation and data ownership stay in downstream services; `cloud-api-gateway-bff` only orchestrates and shapes responses.
- If `cloud-analytics-service` is not running or its endpoints are missing, alerts arrays will be empty and `analyticsAvailable=false`, but dashboard endpoints will still succeed.
- Any future dashboard endpoints (e.g. WeighVision sessions read model) should be added here and in shared API catalogs by the Doc Captain.

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings (cloud-api-gateway-bff at 5125)
- `docs/shared/01-api-standards.md` - API standards
- `docs/STATUS.md` - Overall project status


