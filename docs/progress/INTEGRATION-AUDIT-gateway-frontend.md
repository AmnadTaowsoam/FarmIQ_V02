# Integration Audit — Gateway/BFF + Frontend

**Date**: 2025-01-27  
**Auditor**: CursorAI  
**Scope**: BFF routing coverage, Frontend pages/API calls, Docker Compose integration

---

## Summary

### Counts
- **Services in docker-compose**: 15 cloud services
- **Services with BFF routes**: 2 (feed-service, barn-records-service)
- **Services missing BFF routes**: 1 critical (tenant-registry sensor module), 1 partial (tenant-registry direct routes)
- **Frontend pages discovered**: 8+ pages
- **Frontend pages missing**: 3+ (sensor catalog, bindings, calibration)
- **API mismatches found**: 5+ (direct service calls, wrong endpoints)
- **Docker Compose env gaps**: 2 files (prod + dev missing service URLs)

---

## PART 1: Gateway/BFF Audit

### Service Discovery

#### Services in docker-compose.yml (prod)
- ✅ cloud-tenant-registry (port 3000, internal)
- ✅ cloud-feed-service (port 5130)
- ✅ cloud-barn-records-service (port 5131)
- ✅ cloud-notification-service (port 3000, internal)
- ✅ cloud-reporting-export-service (port 3000, internal)
- ✅ cloud-api-gateway-bff (port 5125)

**Evidence**: `cloud-layer/docker-compose.yml` lines 248-377

#### Services in docker-compose.dev.yml (dev)
- ✅ cloud-tenant-registry (port 3000, internal)
- ✅ cloud-api-gateway-bff (port 5125)
- ⚠️ **Missing**: cloud-feed-service, cloud-barn-records-service service definitions

**Evidence**: `cloud-layer/docker-compose.dev.yml` lines 212-238

---

### BFF Routing Coverage Table

| BFF Route (method+path) | Upstream Service | Upstream Path | Exists in Code? | In API Catalog? | Notes |
|:----------------------|:-----------------|:--------------|:----------------|:----------------|:------|
| `GET /api/v1/kpi/feeding` | cloud-feed-service | `/api/v1/kpi/feeding` | ✅ Yes | ✅ Yes | `feedRoutes.ts:27` |
| `POST /api/v1/feed/intake-records` | cloud-feed-service | `/api/v1/feed/intake-records` | ✅ Yes | ✅ Yes | `feedRoutes.ts:32` |
| `GET /api/v1/feed/intake-records` | cloud-feed-service | `/api/v1/feed/intake-records` | ✅ Yes | ✅ Yes | `feedRoutes.ts:33` |
| `POST /api/v1/feed/lots` | cloud-feed-service | `/api/v1/feed/lots` | ✅ Yes | ✅ Yes | `feedRoutes.ts:38` |
| `GET /api/v1/feed/lots` | cloud-feed-service | `/api/v1/feed/lots` | ✅ Yes | ✅ Yes | `feedRoutes.ts:39` |
| `POST /api/v1/feed/deliveries` | cloud-feed-service | `/api/v1/feed/deliveries` | ✅ Yes | ✅ Yes | `feedRoutes.ts:44` |
| `GET /api/v1/feed/deliveries` | cloud-feed-service | `/api/v1/feed/deliveries` | ✅ Yes | ✅ Yes | `feedRoutes.ts:45` |
| `POST /api/v1/feed/quality-results` | cloud-feed-service | `/api/v1/feed/quality-results` | ✅ Yes | ✅ Yes | `feedRoutes.ts:50` |
| `GET /api/v1/feed/quality-results` | cloud-feed-service | `/api/v1/feed/quality-results` | ✅ Yes | ✅ Yes | `feedRoutes.ts:51` |
| `POST /api/v1/feed/formulas` | cloud-feed-service | `/api/v1/feed/formulas` | ✅ Yes | ✅ Yes | `feedRoutes.ts:56` |
| `GET /api/v1/feed/formulas` | cloud-feed-service | `/api/v1/feed/formulas` | ✅ Yes | ✅ Yes | `feedRoutes.ts:57` |
| `POST /api/v1/feed/programs` | cloud-feed-service | `/api/v1/feed/programs` | ✅ Yes | ✅ Yes | `feedRoutes.ts:62` |
| `GET /api/v1/feed/programs` | cloud-feed-service | `/api/v1/feed/programs` | ✅ Yes | ✅ Yes | `feedRoutes.ts:63` |
| `POST /api/v1/barn-records/mortality` | cloud-barn-records-service | `/api/v1/barn-records/mortality` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:32` |
| `POST /api/v1/barn-records/morbidity` | cloud-barn-records-service | `/api/v1/barn-records/morbidity` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:37` |
| `POST /api/v1/barn-records/vaccines` | cloud-barn-records-service | `/api/v1/barn-records/vaccines` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:42` |
| `POST /api/v1/barn-records/treatments` | cloud-barn-records-service | `/api/v1/barn-records/treatments` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:47` |
| `POST /api/v1/barn-records/welfare-checks` | cloud-barn-records-service | `/api/v1/barn-records/welfare-checks` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:52` |
| `POST /api/v1/barn-records/housing-conditions` | cloud-barn-records-service | `/api/v1/barn-records/housing-conditions` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:57` |
| `POST /api/v1/barn-records/genetics` | cloud-barn-records-service | `/api/v1/barn-records/genetics` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:62` |
| `POST /api/v1/barn-records/daily-counts` | cloud-barn-records-service | `/api/v1/barn-records/daily-counts` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:67` |
| `GET /api/v1/barn-records/daily-counts` | cloud-barn-records-service | `/api/v1/barn-records/daily-counts` | ✅ Yes | ✅ Yes | `barnRecordsRoutes.ts:68` |
| `GET /api/v1/dashboard/overview` | cloud-tenant-registry (via dashboardService) | `/api/v1/topology` | ✅ Yes | ✅ Yes | `dashboardRoutes.ts:18` |
| `GET /api/v1/dashboard/farms/{farmId}` | cloud-tenant-registry (via dashboardService) | `/api/v1/farms/{farmId}` | ✅ Yes | ✅ Yes | `dashboardRoutes.ts:23` |
| `GET /api/v1/dashboard/barns/{barnId}` | cloud-tenant-registry (via dashboardService) | `/api/v1/barns/{barnId}` | ✅ Yes | ✅ Yes | `dashboardRoutes.ts:28` |
| `GET /api/v1/dashboard/alerts` | Multiple services | Aggregated | ✅ Yes | ✅ Yes | `dashboardRoutes.ts:33` |
| `POST /api/v1/sensors` | cloud-tenant-registry | `/api/v1/sensors` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `GET /api/v1/sensors` | cloud-tenant-registry | `/api/v1/sensors` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `GET /api/v1/sensors/{sensorId}` | cloud-tenant-registry | `/api/v1/sensors/{sensorId}` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `PATCH /api/v1/sensors/{sensorId}` | cloud-tenant-registry | `/api/v1/sensors/{sensorId}` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `POST /api/v1/sensors/{sensorId}/bindings` | cloud-tenant-registry | `/api/v1/sensors/{sensorId}/bindings` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `GET /api/v1/sensors/{sensorId}/bindings` | cloud-tenant-registry | `/api/v1/sensors/{sensorId}/bindings` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `POST /api/v1/sensors/{sensorId}/calibrations` | cloud-tenant-registry | `/api/v1/sensors/{sensorId}/calibrations` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `GET /api/v1/sensors/{sensorId}/calibrations` | cloud-tenant-registry | `/api/v1/sensors/{sensorId}/calibrations` | ❌ **MISSING** | ✅ Yes | **P0: Sensor module not proxied** |
| `GET /api/v1/farms` | cloud-tenant-registry | `/api/v1/farms` | ❌ **MISSING** | ✅ Yes | **P1: Frontend calls directly** |
| `GET /api/v1/barns` | cloud-tenant-registry | `/api/v1/barns` | ❌ **MISSING** | ✅ Yes | **P1: Frontend calls directly** |
| `GET /api/v1/devices` | cloud-tenant-registry | `/api/v1/devices` | ❌ **MISSING** | ✅ Yes | **P1: Frontend calls directly** |
| `GET /api/v1/tenants` | cloud-tenant-registry | `/api/v1/tenants` | ❌ **MISSING** | ✅ Yes | **P1: Frontend calls directly** |

**Evidence**:
- BFF routes: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`
- Feed routes: `cloud-layer/cloud-api-gateway-bff/src/routes/feedRoutes.ts`
- Barn records routes: `cloud-layer/cloud-api-gateway-bff/src/routes/barnRecordsRoutes.ts`
- Dashboard routes: `cloud-layer/cloud-api-gateway-bff/src/routes/dashboardRoutes.ts`
- API catalog: `docs/shared/00-api-catalog.md` lines 280-301

---

### Auth/Headers Propagation

**Status**: ✅ **OK**

BFF correctly propagates:
- ✅ `Authorization` header (JWT token)
- ✅ `x-request-id` (request correlation)
- ✅ `x-trace-id` (trace correlation)
- ✅ `Idempotency-Key` (for POST requests)
- ✅ `x-tenant-id` (tenant scoping)

**Evidence**:
- `cloud-layer/cloud-api-gateway-bff/src/controllers/feedController.ts` lines 9-31
- `cloud-layer/cloud-api-gateway-bff/src/controllers/dashboardController.ts` lines 11-30

---

### Error Envelope Consistency

**Status**: ✅ **OK**

BFF normalizes errors to standard format per `docs/shared/01-api-standards.md`:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message",
    "traceId": "trace-id"
  }
}
```

**Evidence**:
- `cloud-layer/cloud-api-gateway-bff/src/controllers/feedController.ts` lines 36-59
- `docs/shared/01-api-standards.md` lines 84-100

---

### Docker Compose Environment Variables

#### docker-compose.yml (prod)
**Status**: ⚠️ **MISSING SERVICE URLs**

**Current env vars** (lines 338-348):
```yaml
- IDENTITY_BASE_URL=http://cloud-identity-access:3000
- REGISTRY_BASE_URL=http://cloud-tenant-registry:3000
- TELEMETRY_BASE_URL=http://cloud-telemetry-service:3000
- ANALYTICS_BASE_URL=http://cloud-analytics-service:8000
- WEIGHVISION_READMODEL_BASE_URL=http://cloud-weighvision-readmodel:3000
- CONFIG_RULES_BASE_URL=http://cloud-config-rules-service:3000
- AUDIT_LOG_BASE_URL=http://cloud-audit-log-service:3000
- NOTIFICATION_BASE_URL=http://cloud-notification-service:3000
- REPORTING_EXPORT_BASE_URL=http://cloud-reporting-export-service:3000
```

**Missing**:
- ❌ `FEED_SERVICE_URL=http://cloud-feed-service:5130`
- ❌ `BARN_RECORDS_SERVICE_URL=http://cloud-barn-records-service:5131`

**Evidence**: `cloud-layer/docker-compose.yml` lines 338-348

#### docker-compose.dev.yml (dev)
**Status**: ⚠️ **MISSING ALL SERVICE URLs**

**Current env vars** (lines 223-232):
```yaml
- NODE_ENV=development
- APP_PORT=3000
- LOG_LEVEL=debug
- DATABASE_URL=...
- DD_ENV=${DD_ENV:-dev}
- DD_SERVICE=cloud-api-gateway-bff
- DD_VERSION=${DD_VERSION:-local}
- DD_AGENT_HOST=datadog
- DD_TRACE_AGENT_PORT=8126
```

**Missing**:
- ❌ All service base URLs (IDENTITY_BASE_URL, REGISTRY_BASE_URL, etc.)
- ❌ `FEED_SERVICE_URL=http://cloud-feed-service:5130`
- ❌ `BARN_RECORDS_SERVICE_URL=http://cloud-barn-records-service:5131`

**Evidence**: `cloud-layer/docker-compose.dev.yml` lines 223-232

---

## PART 2: Frontend Audit (apps/dashboard-web)

### Menu/Routes Completeness vs Expected IA

| Menu Item | Route | Page File | Status | API Calls Used | Notes |
|:----------|:------|:----------|:-------|:---------------|:------|
| Farms → Farm List | `/farms` | `features/farms/pages/FarmListPage.tsx` | ✅ OK | `/api/v1/farms` (direct) | ⚠️ Calls tenant-registry directly |
| Farms → Create Farm | `/farms/new` | ❌ **MISSING** | ❌ MISSING | N/A | **P1: Page not implemented** |
| Barns → Barn List | `/barns` | `features/barns/pages/BarnsListPage.tsx` | ✅ OK | `/api/v1/barns` (direct) | ⚠️ Calls tenant-registry directly |
| Barns → Create Barn | `/barns/new` | ❌ **MISSING** | ❌ MISSING | N/A | **P1: Page not implemented** |
| Barns → Batches/Flocks | `/barns/:barnId/batches` | ❌ **MISSING** | ❌ MISSING | N/A | **P1: Page not implemented** |
| Devices → Device Inventory | `/devices` | `features/dashboard/pages/DevicesPage.tsx` | ✅ OK | `/api/v1/devices` (direct) | ⚠️ Calls tenant-registry directly |
| Devices → Status | `/devices/:deviceId` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Detail page** |
| Devices → Maintenance | `/devices/:deviceId/maintenance` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Maintenance log** |
| Sensors → Sensor Catalog | `/sensors` | ❌ **MISSING** | ❌ MISSING | `/api/v1/sensors` (via BFF) | **P0: Page not implemented** |
| Sensors → Bindings | `/sensors/:sensorId/bindings` | ❌ **MISSING** | ❌ MISSING | `/api/v1/sensors/{sensorId}/bindings` | **P0: Page not implemented** |
| Sensors → Calibration | `/sensors/:sensorId/calibration` | ❌ **MISSING** | ❌ MISSING | `/api/v1/sensors/{sensorId}/calibrations` | **P0: Page not implemented** |
| Sensors → Thresholds | `/sensors/:sensorId/thresholds` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Future feature** |
| Sensors → Sensor Matrix | `/sensors/matrix` | `features/sensors/pages/SensorsPage.tsx` | ⚠️ **WRONG API** | `api.telemetryLatest()` | ⚠️ Uses telemetry API, not sensor catalog |
| Sensors → Trends | `/sensors/trends` | `features/sensors/pages/SensorTrendsPage.tsx` | ⚠️ **WRONG API** | Telemetry API | ⚠️ Uses telemetry API, not sensor catalog |
| Feeding → KPI | `/feeding/kpi` | ❌ **MISSING** | ❌ MISSING | `/api/v1/kpi/feeding` (via BFF) | **P1: Page not implemented** |
| Feeding → Intake | `/feeding/intake` | ❌ **MISSING** | ❌ MISSING | `/api/v1/feed/intake-records` (via BFF) | **P1: Page not implemented** |
| Feeding → Lots | `/feeding/lots` | ❌ **MISSING** | ❌ MISSING | `/api/v1/feed/lots` (via BFF) | **P1: Page not implemented** |
| Feeding → Quality | `/feeding/quality` | ❌ **MISSING** | ❌ MISSING | `/api/v1/feed/quality-results` (via BFF) | **P1: Page not implemented** |
| WeighVision → Sessions | `/weighvision/sessions` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Page not implemented** |
| WeighVision → Weight Trends | `/weighvision/trends` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Page not implemented** |
| Telemetry → Metrics Explorer | `/telemetry` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Page not implemented** |
| Telemetry → Alerts | `/telemetry/alerts` | ❌ **MISSING** | ❌ MISSING | N/A | **P2: Page not implemented** |

**Evidence**:
- Routes: `apps/dashboard-web/src/config/routes.tsx` lines 130-170
- App routes: `apps/dashboard-web/src/App.tsx` lines 164-166
- Sensors page: `apps/dashboard-web/src/features/sensors/pages/SensorsPage.tsx`
- Sensors hook: `apps/dashboard-web/src/hooks/useSensors.ts` (uses telemetry API)

---

### FE API Base URL and BFF Usage

**Status**: ⚠️ **MIXED (Direct Calls + BFF)**

**Base URL Configuration**:
- ✅ Frontend uses `VITE_BFF_BASE_URL` or `VITE_API_BASE_URL` env var
- ✅ Defaults to `/api/v1` (relative path, uses window.location.origin)
- ✅ API client attaches `Authorization` header via `getAccessToken()`
- ✅ API client attaches `tenantId` via `getTenantId()`

**Evidence**: `apps/dashboard-web/src/api/index.ts` lines 1-111

**API Call Patterns**:
- ⚠️ **Direct tenant-registry calls**: `/api/v1/farms`, `/api/v1/barns`, `/api/v1/devices`, `/api/v1/tenants`
- ✅ **BFF calls**: `/api/v1/kpi/feeding`, `/api/v1/feed/*`, `/api/v1/barn-records/*` (if implemented)
- ⚠️ **Wrong API**: Sensors page uses telemetry API instead of tenant-registry sensor API

**Evidence**:
- Direct calls: `apps/dashboard-web/src/api/index.ts` lines 85-110
- Sensors hook: `apps/dashboard-web/src/hooks/useSensors.ts` line 24 (uses `api.telemetryLatest()`)

---

### API Path Correctness After Changes

#### Mismatch List

| FE Call | Expected Endpoint | Current Behavior | Fix Required |
|:--------|:------------------|:-----------------|:-------------|
| `GET /api/v1/farms` | `GET /api/v1/farms` (via BFF) | ✅ Path correct, but calls tenant-registry directly | **P1: Add BFF proxy route** |
| `GET /api/v1/barns` | `GET /api/v1/barns` (via BFF) | ✅ Path correct, but calls tenant-registry directly | **P1: Add BFF proxy route** |
| `GET /api/v1/devices` | `GET /api/v1/devices` (via BFF) | ✅ Path correct, but calls tenant-registry directly | **P1: Add BFF proxy route** |
| `GET /api/v1/tenants` | `GET /api/v1/tenants` (via BFF) | ✅ Path correct, but calls tenant-registry directly | **P1: Add BFF proxy route** |
| `api.telemetryLatest()` | `GET /api/v1/sensors` (via BFF) | ❌ Uses telemetry API, not sensor catalog | **P0: Fix sensors page to use sensor API** |
| `GET /api/v1/sensors` | `GET /api/v1/sensors` (via BFF) | ❌ BFF route missing | **P0: Add BFF sensor routes** |
| `POST /api/v1/sensors` | `POST /api/v1/sensors` (via BFF) | ❌ BFF route missing | **P0: Add BFF sensor routes** |
| `GET /api/v1/sensors/{sensorId}/bindings` | `GET /api/v1/sensors/{sensorId}/bindings` (via BFF) | ❌ BFF route missing | **P0: Add BFF sensor routes** |
| `POST /api/v1/sensors/{sensorId}/bindings` | `POST /api/v1/sensors/{sensorId}/bindings` (via BFF) | ❌ BFF route missing | **P0: Add BFF sensor routes** |
| `GET /api/v1/sensors/{sensorId}/calibrations` | `GET /api/v1/sensors/{sensorId}/calibrations` (via BFF) | ❌ BFF route missing | **P0: Add BFF sensor routes** |
| `POST /api/v1/sensors/{sensorId}/calibrations` | `POST /api/v1/sensors/{sensorId}/calibrations` (via BFF) | ❌ BFF route missing | **P0: Add BFF sensor routes** |

**Evidence**:
- FE API calls: `apps/dashboard-web/src/api/index.ts`
- Sensors hook: `apps/dashboard-web/src/hooks/useSensors.ts`
- BFF routes: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`

---

### "Seeded Data Not Showing" Root Cause Shortlist

#### Hypothesis 1: Missing BFF Routes (HIGH CONFIDENCE)
**Issue**: Frontend calls `/api/v1/farms`, `/api/v1/barns`, `/api/v1/devices` directly to tenant-registry, but:
- CORS may block direct calls in production
- Tenant context may not be properly forwarded
- Auth headers may not be forwarded correctly

**Evidence**:
- FE calls: `apps/dashboard-web/src/api/index.ts` lines 85-110
- BFF routes: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (no tenant-registry proxy routes)

**Verification**:
```powershell
# Check if tenant-registry accepts direct calls
curl -X GET "http://localhost:5121/api/v1/farms" -H "Authorization: Bearer <token>" -H "x-tenant-id: <tenant-id>"

# Check if BFF has proxy route
curl -X GET "http://localhost:5125/api/v1/farms" -H "Authorization: Bearer <token>"
```

#### Hypothesis 2: Missing Tenant Context (MEDIUM CONFIDENCE)
**Issue**: Frontend may not be sending `tenantId` in query params or headers

**Evidence**:
- API client: `apps/dashboard-web/src/api/index.ts` line 57 (`getTenantId`)
- Barns hook: `apps/dashboard-web/src/hooks/useBarns.ts` line 26 (sends `tenantId` in query)

**Verification**:
```powershell
# Check FE network tab for tenantId param
# Check if ActiveContext provides tenantId
```

#### Hypothesis 3: Wrong Base URL (LOW CONFIDENCE)
**Issue**: Frontend may be using wrong base URL (direct service vs BFF)

**Evidence**:
- Base URL: `apps/dashboard-web/src/api/index.ts` lines 5-12
- Default: `/api/v1` (relative, uses window.location.origin)

**Verification**:
```powershell
# Check FE .env file
# Check browser network tab for actual request URL
```

#### Hypothesis 4: Sensor Module Not Proxied (HIGH CONFIDENCE)
**Issue**: Sensor catalog endpoints are not available via BFF, so FE cannot access them

**Evidence**:
- BFF routes: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (no sensor routes)
- API catalog: `docs/shared/00-api-catalog.md` lines 297-299 (sensor endpoints documented)

**Verification**:
```powershell
# Check if sensor routes exist in BFF
curl -X GET "http://localhost:5125/api/v1/sensors" -H "Authorization: Bearer <token>"
# Expected: 404 Not Found (route missing)
```

---

## PART 3: Top 15 Tasks (Prioritized)

### P0 (Critical - Blocks Core Functionality)

1. **Add BFF proxy routes for tenant-registry sensor module**
   - Scope: gateway
   - Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (no sensor routes)
   - Expected outcome: `GET /api/v1/sensors`, `POST /api/v1/sensors`, etc. available via BFF
   - Verification: `curl http://localhost:5125/api/v1/sensors`

2. **Fix sensors page to use tenant-registry sensor API instead of telemetry API**
   - Scope: frontend
   - Evidence: `apps/dashboard-web/src/hooks/useSensors.ts` line 24 (uses `api.telemetryLatest()`)
   - Expected outcome: Sensors page shows sensor catalog data, not telemetry readings
   - Verification: Navigate to `/sensors/matrix` and verify data source

3. **Add FEED_SERVICE_URL and BARN_RECORDS_SERVICE_URL to docker-compose.yml BFF env**
   - Scope: gateway
   - Evidence: `cloud-layer/docker-compose.yml` lines 338-348 (missing service URLs)
   - Expected outcome: BFF can connect to feed and barn-records services
   - Verification: `docker compose config` shows env vars

4. **Add all service URLs to docker-compose.dev.yml BFF env**
   - Scope: gateway
   - Evidence: `cloud-layer/docker-compose.dev.yml` lines 223-232 (missing all service URLs)
   - Expected outcome: BFF works in dev environment
   - Verification: `docker compose -f docker-compose.dev.yml config` shows env vars

5. **Create sensor catalog page (`/sensors`)**
   - Scope: frontend
   - Evidence: `apps/dashboard-web/src/config/routes.tsx` line 132 (route exists but page missing)
   - Expected outcome: Users can view sensor catalog
   - Verification: Navigate to `/sensors` and see sensor list

6. **Create sensor bindings page (`/sensors/:sensorId/bindings`)**
   - Scope: frontend
   - Evidence: `docs/dev/frontend-sensors-module.md` (page spec exists)
   - Expected outcome: Users can view/manage sensor-device bindings
   - Verification: Navigate to `/sensors/{sensorId}/bindings`

7. **Create sensor calibration page (`/sensors/:sensorId/calibration`)**
   - Scope: frontend
   - Evidence: `docs/dev/frontend-sensors-module.md` (page spec exists)
   - Expected outcome: Users can view calibration history
   - Verification: Navigate to `/sensors/{sensorId}/calibration`

### P1 (High Priority - Blocks Workflows)

8. **Add BFF proxy routes for tenant-registry direct routes (farms, barns, devices, tenants)**
   - Scope: gateway
   - Evidence: `apps/dashboard-web/src/api/index.ts` lines 85-110 (direct calls)
   - Expected outcome: All FE calls go through BFF
   - Verification: `curl http://localhost:5125/api/v1/farms`

9. **Create farm creation page (`/farms/new`)**
   - Scope: frontend
   - Evidence: Menu expects this page
   - Expected outcome: Users can create farms
   - Verification: Navigate to `/farms/new`

10. **Create barn creation page (`/barns/new`)**
    - Scope: frontend
    - Evidence: Menu expects this page
    - Expected outcome: Users can create barns
    - Verification: Navigate to `/barns/new`

11. **Create batches/flocks page (`/barns/:barnId/batches`)**
    - Scope: frontend
    - Evidence: Menu expects this page
    - Expected outcome: Users can view/manage batches
    - Verification: Navigate to `/barns/{barnId}/batches`

12. **Create feeding KPI page (`/feeding/kpi`)**
    - Scope: frontend
    - Evidence: Menu expects this page, BFF route exists
    - Expected outcome: Users can view feeding KPIs
    - Verification: Navigate to `/feeding/kpi`

13. **Create feeding intake page (`/feeding/intake`)**
    - Scope: frontend
    - Evidence: Menu expects this page, BFF route exists
    - Expected outcome: Users can view/create intake records
    - Verification: Navigate to `/feeding/intake`

### P2 (Medium Priority - Nice to Have)

14. **Create device detail page (`/devices/:deviceId`)**
    - Scope: frontend
    - Evidence: Menu expects this page
    - Expected outcome: Users can view device details
    - Verification: Navigate to `/devices/{deviceId}`

15. **Create device maintenance page (`/devices/:deviceId/maintenance`)**
    - Scope: frontend
    - Evidence: Menu expects this page
    - Expected outcome: Users can view maintenance logs
    - Verification: Navigate to `/devices/{deviceId}/maintenance`

---

## Verification Commands (PowerShell)

### Docker Compose Config Validation
```powershell
# Validate prod compose
cd cloud-layer
docker compose -f docker-compose.yml config 2>&1 | Select-String "FEED_SERVICE_URL|BARN_RECORDS_SERVICE_URL"

# Validate dev compose
docker compose -f docker-compose.dev.yml config 2>&1 | Select-String "FEED_SERVICE_URL|BARN_RECORDS_SERVICE_URL|REGISTRY_BASE_URL"
```

### BFF Endpoint Verification
```powershell
# Check if sensor routes exist (should 404)
curl -X GET "http://localhost:5125/api/v1/sensors" -H "Authorization: Bearer <token>"

# Check if feed routes exist (should 200 or 400)
curl -X GET "http://localhost:5125/api/v1/kpi/feeding?tenantId=<id>&barnId=<id>&startDate=2025-01-01&endDate=2025-01-31" -H "Authorization: Bearer <token>"

# Check if tenant-registry direct routes exist (should 404)
curl -X GET "http://localhost:5125/api/v1/farms" -H "Authorization: Bearer <token>"
```

### Frontend Verification
```powershell
# Start FE dev server
cd apps/dashboard-web
npm run dev

# Check browser network tab for:
# - API calls to BFF (should be http://localhost:5125/api/v1/...)
# - API calls to tenant-registry (should NOT exist)
# - tenantId in query params or headers
```

---

## Next Steps

1. **Immediate (P0)**: Add BFF sensor routes and fix docker-compose env vars
2. **Short-term (P1)**: Add BFF proxy for tenant-registry direct routes, create missing FE pages
3. **Long-term (P2)**: Create remaining FE pages, add device detail/maintenance pages

---

**End of Audit Report**

