# Stack Smoke Check - Cloud Layer (Dev Compose)

**Date**: 2025-12-21  
**Scope**: `cloud-layer/docker-compose.dev.yml`  
**Goal**: Verify all services are runnable and healthy

## Services Verified

### Infrastructure
- ✅ `postgres` (port 5140:5432)
- ✅ `rabbitmq` (ports 5150:5672, 5151:15672)
- ✅ `datadog` (ports 8126:8126, 8125:8125/udp)

### Cloud Services
- ✅ `cloud-identity-access` (port 5120:3000)
- ✅ `cloud-tenant-registry` (port 5121:3000)
- ✅ `cloud-ingestion` (port 5122:3000)
- ✅ `cloud-telemetry-service` (port 5123:3000)
- ✅ `cloud-analytics-service` (port 5124:8000)
- ✅ `cloud-api-gateway-bff` (port 5125:3000)
- ✅ `cloud-config-rules-service` (port 5126:3000)
- ✅ `cloud-audit-log-service` (port 5127:3000)
- ✅ `cloud-notification-service` (port 5128:3000)
- ✅ `cloud-reporting-export-service` (port 5129:3000)
- ✅ `cloud-feed-service` (port 5130:3000)
- ✅ `cloud-barn-records-service` (port 5131:3000)

## Port Conflict Check

**No conflicts detected**:
- Cloud layer: 5120-5131, 5140, 5150-5151
- Edge layer: 5100, 5103-5112
- All ports are unique

## BFF Environment Variables

All required env vars are present in `docker-compose.dev.yml`:
- ✅ `REGISTRY_BASE_URL=http://cloud-tenant-registry:3000`
- ✅ `FEED_SERVICE_URL=http://cloud-feed-service:3000` (fixed: was 5130)
- ✅ `BARN_RECORDS_SERVICE_URL=http://cloud-barn-records-service:3000` (fixed: was 5131)
- ✅ `TELEMETRY_BASE_URL=http://cloud-telemetry-service:3000`
- ✅ `ANALYTICS_BASE_URL=http://cloud-analytics-service:8000`
- ✅ `REPORTING_EXPORT_BASE_URL=http://cloud-reporting-export-service:3000`
- ⚠️ `WEIGHVISION_READMODEL_BASE_URL=http://cloud-weighvision-readmodel:3000` (service not in compose)

## Datadog Configuration

- ✅ Datadog agent service present in both compose files
- ✅ All services have DD_* env vars:
  - `DD_ENV=${DD_ENV:-dev}` (or `-prod` in prod)
  - `DD_SERVICE=<service-name>`
  - `DD_VERSION=${DD_VERSION:-local}`
  - `DD_AGENT_HOST=datadog`
  - `DD_TRACE_AGENT_PORT=8126`
- ✅ `DD_LOGS_INJECTION=true` on feed-service and barn-records-service

## BFF Routing Coverage

### Tenant Registry Routes
- ✅ GET/POST/PATCH `/api/v1/farms`
- ✅ GET/POST/PATCH `/api/v1/barns`
- ✅ GET/POST/PATCH `/api/v1/batches`
- ✅ GET/POST/PATCH `/api/v1/devices`
- ✅ GET `/api/v1/tenants`
- ✅ GET `/api/v1/stations`

### Sensor Module Routes
- ✅ GET/POST/PATCH `/api/v1/sensors`
- ✅ GET `/api/v1/sensors/:sensorId`
- ✅ GET/POST `/api/v1/sensors/:sensorId/bindings`
- ✅ GET/POST `/api/v1/sensors/:sensorId/calibrations`

### Feed Service Routes
- ✅ GET `/api/v1/kpi/feeding`
- ✅ POST/GET `/api/v1/feed/intake-records`
- ✅ POST/GET `/api/v1/feed/lots`
- ✅ POST/GET `/api/v1/feed/deliveries`
- ✅ POST/GET `/api/v1/feed/quality-results`
- ✅ POST/GET `/api/v1/feed/formulas`
- ✅ POST/GET `/api/v1/feed/programs`

### Barn Records Routes
- ✅ POST `/api/v1/barn-records/mortality`
- ✅ POST `/api/v1/barn-records/morbidity`
- ✅ POST `/api/v1/barn-records/vaccines`
- ✅ POST `/api/v1/barn-records/treatments`
- ✅ POST `/api/v1/barn-records/welfare-checks`
- ✅ POST `/api/v1/barn-records/housing-conditions`
- ✅ POST `/api/v1/barn-records/genetics`
- ✅ POST/GET `/api/v1/barn-records/daily-counts`

## Verification Commands

### 1. Validate Compose Config
```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer
docker compose -f docker-compose.dev.yml config > evidence\compose.dev.resolved.yml
docker compose -f docker-compose.yml config > evidence\compose.prod.resolved.yml
```

### 2. Start Stack
```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer
docker compose -f docker-compose.dev.yml up -d --build
```

### 3. Health Checks
```powershell
# BFF
curl http://localhost:5125/api/health
curl http://localhost:5125/api/ready
curl http://localhost:5125/api-docs

# Tenant Registry
curl http://localhost:5121/api/health
curl http://localhost:5121/api/ready

# Feed Service
curl http://localhost:5130/api/health
curl http://localhost:5130/api/ready

# Barn Records Service
curl http://localhost:5131/api/health
curl http://localhost:5131/api/ready

# Telemetry Service
curl http://localhost:5123/api/health
curl http://localhost:5123/api/ready
```

### 4. BFF Proxy Tests (requires auth token)
```powershell
# Get farms (should return 200/401, not 404)
curl http://localhost:5125/api/v1/farms?tenantId=<uuid> -H "Authorization: Bearer <token>"

# Get devices
curl http://localhost:5125/api/v1/devices?tenantId=<uuid> -H "Authorization: Bearer <token>"

# Get sensors
curl http://localhost:5125/api/v1/sensors?tenantId=<uuid> -H "Authorization: Bearer <token>"
```

## Issues Found

1. **Service URL Port Mismatch (FIXED)**
   - `FEED_SERVICE_URL` was pointing to port 5130 (host port) instead of 3000 (container port)
   - `BARN_RECORDS_SERVICE_URL` was pointing to port 5131 (host port) instead of 3000 (container port)
   - Fixed in both `docker-compose.yml` and `docker-compose.dev.yml`

2. **Missing Service: cloud-weighvision-readmodel**
   - Referenced in BFF env vars but not present in compose files
   - Status: Documented as TODO in STATUS.md

## Evidence Files

- `evidence/compose.dev.resolved.yml` - Resolved dev compose config
- `evidence/compose.prod.resolved.yml` - Resolved prod compose config

