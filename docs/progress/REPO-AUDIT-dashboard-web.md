# Frontend (dashboard-web) Audit Report

**Date**: 2025-01-27  
**Audit Scope**: `apps/dashboard-web` - Routes, Pages, API Integration, and Backlog  
**Methodology**: Filesystem inspection, code analysis, API contract reconciliation

---

## Summary Numbers

- **Routes Discovered**: 35+ routes defined in `App.tsx`
- **Pages Implemented**: ~40 page components exist in `features/*/pages/`
- **Missing Pages vs Expected IA**: 8+ missing page implementations
- **Error Hotspots Identified**: 5 critical integration gaps
- **API Integration Gaps**: 10+ endpoint mismatches or missing BFF proxies
- **Root Cause Hypotheses for "Seed Data Not Showing"**: 3 primary causes identified

---

## 1. Inventory: Routes & Pages

### Routes Defined in `App.tsx` vs Menu Configuration (`config/routes.tsx`)

| Route Path | Page Component | Menu Item | Status | Notes |
|---|---|---|---|---|
| `/overview` | `OverviewPage.tsx` | Overview | ✅ Exists | Working |
| `/farms` | `FarmListPage.tsx` | Farms | ✅ Exists | **API issue: calls `/api/v1/farms` directly** |
| `/farms/:farmId` | `FarmDetailPage.tsx` | (nested) | ✅ Exists | **API issue: needs verification** |
| `/barns` | `BarnsListPage.tsx` | Barns → Overview | ✅ Exists | **API issue: calls `/api/v1/barns` directly** |
| `/barns/:barnId` | `BarnDetailPage.tsx` | (nested) | ✅ Exists | **API issue: needs verification** |
| `/barns/records` | `BarnRecordsPage.tsx` | Barns → Health & Records | ✅ Exists | Uses BFF proxy (✅) |
| `/barns/:barnId/overview` | `BarnOverviewPage.tsx` | (nested) | ✅ Exists | **API issue: needs verification** |
| `/devices` | `DevicesPage.tsx` | Devices | ✅ Exists | **API issue: calls `/api/v1/devices` directly** |
| `/devices/:deviceId` | `DeviceDetailPage.tsx` | (nested) | ✅ Exists | **API issue: needs verification** |
| `/telemetry` | `TelemetryPage.tsx` | Telemetry | ✅ Exists | Working |
| `/weighvision/sessions` | `SessionsListPage.tsx` | WeighVision → Sessions | ✅ Exists | Working |
| `/weighvision/sessions/:sessionId` | `SessionDetailPage.tsx` | (nested) | ✅ Exists | Working |
| `/weighvision/analytics` | `AnalyticsPage.tsx` | WeighVision → Analytics | ✅ Exists | Working |
| `/weighvision/distribution` | `DistributionPage.tsx` | WeighVision → Size Distribution | ✅ Exists | Working |
| `/sensors/matrix` | `SensorsPage.tsx` | Sensors → Sensor Matrix | ✅ Exists | **Placeholder/ComingSoon?** |
| `/sensors/trends` | `SensorTrendsPage.tsx` | Sensors → Trends & Correlation | ✅ Exists | **Placeholder/ComingSoon?** |
| `/feeding/kpi` | `FeedingKpiPage.tsx` | Feeding Module → KPI Dashboard | ✅ Exists | Uses BFF proxy (✅) |
| `/feeding/intake` | `FeedingIntakePage.tsx` | Feeding Module → Daily Feed Intake | ✅ Exists | Uses BFF proxy (✅) |
| `/feeding/lots` | `FeedingLotsPage.tsx` | Feeding Module → Feed Lots & Deliveries | ✅ Exists | Uses BFF proxy (✅) |
| `/feeding/quality` | `FeedingQualityPage.tsx` | Feeding Module → Feed Quality Results | ✅ Exists | Uses BFF proxy (✅) |
| `/feeding/programs` | `FeedingProgramsPage.tsx` | Feeding Module → Feed Programs | ✅ Exists | Uses BFF proxy (✅) |
| `/ai/anomalies` | `AnomaliesPage.tsx` | AI Insights → Anomalies | ✅ Exists | **Placeholder?** |
| `/ai/recommendations` | `RecommendationsPage.tsx` | AI Insights → Recommendations | ✅ Exists | **Placeholder?** |
| `/ai/scenario` | `ScenarioPlannerPage.tsx` | AI Insights → Scenario Planner | ✅ Exists | **Placeholder?** |
| `/ops/data-quality` | `DataQualityPage.tsx` | Ops → Data Quality | ✅ Exists | **Placeholder?** |
| `/ops/health` | `OpsHealthPage.tsx` | Ops → Health Monitor | ✅ Exists | **Placeholder?** |
| `/alerts` | `AlertsPage.tsx` | Alerts | ✅ Exists | Working |
| `/reports` | `ReportsPage.tsx` | Reports & Export | ✅ Exists | **Placeholder?** |
| `/admin/tenants` | `AdminTenantsPage.tsx` | Admin → Tenants | ✅ Exists | Working |
| `/admin/devices` | `AdminDevicesPage.tsx` | Admin → Device Onboarding | ✅ Exists | Working |
| `/admin/users` | `AdminUsersPage.tsx` | Admin → Users & Roles | ✅ Exists | Working |
| `/admin/audit` | `AdminAuditPage.tsx` | Admin → Audit Log | ✅ Exists | Working |

### Missing Pages vs Expected IA (`docs/dev/frontend-feeding-module.md`, `docs/dev/frontend-sensors-module.md`)

**Expected but Missing**:

| Expected Route | Expected Page | Expected Menu | Status | Priority |
|---|---|---|---|---|
| `/barn-records/health` | Health Events page | Barn Records → Health Events | ❌ Missing | P1 |
| `/barn-records/welfare` | Welfare Checks page | Barn Records → Welfare Checks | ❌ Missing | P1 |
| `/barn-records/housing` | Housing Conditions page | Barn Records → Housing Conditions | ❌ Missing | P1 |
| `/sensors` (catalog) | Sensor Catalog List | Sensors → Sensor Catalog | ❌ Missing | P1 |
| `/sensors/new` | Create Sensor | (form) | ❌ Missing | P1 |
| `/sensors/:sensorId` | Sensor Detail | (detail) | ❌ Missing | P1 |
| `/sensors/:sensorId/bindings` | Sensor Bindings | Sensors → Bindings | ❌ Missing | P1 |
| `/sensors/:sensorId/calibrations` | Sensor Calibrations | Sensors → Calibration | ❌ Missing | P1 |
| `/admin/master-data` | Master Data (Formulas/Genetics) | Admin → Master Data | ❌ Missing | P2 |

**Note**: Barn Records functionality exists as tabs in `/barns/records`, but separate pages are expected per IA docs.

---

## 2. Error Hotspots (Repo-Grounded Evidence)

### Hotspot 1: Direct Service Calls Without BFF Proxy

**Evidence**:
- `apps/dashboard-web/src/features/farms/pages/FarmListPage.tsx:37`: Calls `/api/v1/farms` directly
- `apps/dashboard-web/src/api/index.ts:94`: Calls `/api/v1/farms` directly
- `apps/dashboard-web/src/api/index.ts:101`: Calls `/api/v1/barns` directly
- `apps/dashboard-web/src/api/index.ts:88`: Calls `/api/v1/tenants` directly

**BFF Routes Check** (`cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`):
- ✅ `/api/v1/dashboard/*` exists
- ✅ `/api/v1/kpi/feeding` exists (feed proxy)
- ✅ `/api/v1/feed/*` exists (feed proxy)
- ✅ `/api/v1/barn-records/*` exists (barn-records proxy)
- ❌ `/api/v1/farms` - **NOT PROXIED**
- ❌ `/api/v1/barns` - **NOT PROXIED**
- ❌ `/api/v1/tenants` - **NOT PROXIED**
- ❌ `/api/v1/devices` - **NOT PROXIED**
- ❌ `/api/v1/sensors/*` - **NOT PROXIED**

**Impact**: FE makes requests to BFF that return 404, OR FE bypasses BFF entirely (CORS/networking issues).

**Verification Steps**:
```powershell
# 1. Check BFF routes
cd cloud-layer/cloud-api-gateway-bff
Get-Content src/routes/index.ts | Select-String "farms|barns|tenants|devices|sensors"

# 2. Check if FE base URL points to BFF or direct service
cd apps/dashboard-web
Get-Content .env* | Select-String "VITE_API_BASE_URL|VITE_BFF_BASE_URL"

# 3. Test BFF endpoint (should return 404 if not proxied)
curl -H "Authorization: Bearer $token" http://localhost:5125/api/v1/farms?tenantId=test
```

### Hotspot 2: Dual API Client Architecture Confusion

**Evidence**:
- Two API clients exist:
  - `apps/dashboard-web/src/api/client.ts` - Axios-based, used by `feedingApi`, `barnRecordsApi`
  - `apps/dashboard-web/src/lib/api/client.ts` - `@farmiq/api-client` based, used by `useDashboard`, `FarmListPage`
- Different base URL configurations:
  - `client.ts`: `VITE_BFF_BASE_URL || VITE_API_BASE_URL || '/api'`
  - `lib/api/client.ts`: `VITE_API_BASE_URL || 'http://localhost:5125'`

**Impact**: Inconsistent API calls, potential CORS/networking issues, confusion about which client to use.

**Files**:
- `apps/dashboard-web/src/api/client.ts`
- `apps/dashboard-web/src/lib/api/client.ts`
- `apps/dashboard-web/src/api/index.ts`
- `apps/dashboard-web/src/features/farms/pages/FarmListPage.tsx`

### Hotspot 3: Tenant Context Propagation

**Evidence**:
- `apps/dashboard-web/src/api/client.ts:44-45`: Comment says "Context should be sent via query params (not headers)"
- `apps/dashboard-web/src/api/bffClient.ts:33`: Builds query params with `tenant_id`, `farm_id`, etc.
- `apps/dashboard-web/src/features/farms/pages/FarmListPage.tsx:38`: Sends `tenantId` as query param
- `apps/dashboard-web/src/api/index.ts:2`: Uses `getTenantId()` helper
- `apps/dashboard-web/src/api/auth.ts`: `getTenantId()` implementation

**Potential Issue**: If `getTenantId()` returns null/undefined, tenant context is missing, causing empty results.

**Verification Steps**:
```powershell
# 1. Check how tenantId is stored/retrieved
cd apps/dashboard-web/src/api
Get-Content auth.ts | Select-String "getTenantId|tenantId"

# 2. Check ActiveContext usage
cd apps/dashboard-web/src/contexts
Get-Content ActiveContext.tsx | Select-String "tenantId"

# 3. Test with network tab: Verify tenantId query param is sent
```

### Hotspot 4: API Path Mismatches

**Evidence**:
- FE calls: `/api/v1/farms`, `/api/v1/barns`, `/api/v1/tenants`
- Schema docs expect: `/api/v1/registry/farms`, `/api/v1/registry/barns`, `/api/v1/registry/tenants` (see `apps/dashboard-web/src/lib/api/schemas/registry.ts`)
- Mock handlers use: `/registry/tenants`, `/registry/farms` (see `apps/dashboard-web/src/mocks/handlers.ts:31,42`)

**Impact**: Path mismatch causes 404 if backend expects `/registry/*` prefix.

**Files**:
- `apps/dashboard-web/src/lib/api/schemas/registry.ts`
- `apps/dashboard-web/src/mocks/handlers.ts`
- `apps/dashboard-web/src/features/farms/pages/FarmListPage.tsx`

### Hotspot 5: Missing Sensor Module Pages

**Evidence**:
- `docs/dev/frontend-sensors-module.md` documents: `/sensors`, `/sensors/new`, `/sensors/:sensorId`, `/sensors/:sensorId/bindings`, `/sensors/:sensorId/calibrations`
- `apps/dashboard-web/src/config/routes.tsx:132-150`: Only defines `/sensors/matrix` and `/sensors/trends`
- `apps/dashboard-web/src/App.tsx:165-166`: Only routes for `/sensors/matrix` and `/sensors/trends`
- `apps/dashboard-web/src/features/sensors/pages/`: Only `SensorsPage.tsx` and `SensorTrendsPage.tsx` exist

**Impact**: Sensor catalog functionality documented but not implemented.

---

## 3. API Integration Findings

### API Base URL Configuration

**Evidence**:
- `apps/dashboard-web/vite.config.ts:27`: Proxy configured to `http://localhost:5125` (BFF port)
- `apps/dashboard-web/src/api/client.ts:5`: `VITE_BFF_BASE_URL || VITE_API_BASE_URL || '/api'`
- `apps/dashboard-web/src/lib/api/client.ts:4`: `VITE_API_BASE_URL || 'http://localhost:5125'`
- No `.env` file found (only `.example.env`)

**Expected**: BFF runs on port 5125, FE dev server proxies `/api` to `http://localhost:5125`.

**Verification**:
```powershell
cd apps/dashboard-web
# Check if .env exists
Test-Path .env
# If not, check example
Get-Content env/.example.env
```

### API Endpoint Reconciliation

| FE API Call | Expected BFF Route | BFF Implemented? | Downstream Service | Status |
|---|---|---|---|---|
| `GET /api/v1/farms` | `/api/v1/farms` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |
| `GET /api/v1/barns` | `/api/v1/barns` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |
| `GET /api/v1/tenants` | `/api/v1/tenants` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |
| `GET /api/v1/devices` | `/api/v1/devices` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |
| `GET /api/v1/dashboard/overview` | `/api/v1/dashboard/overview` | ✅ Yes | Aggregates multiple | OK |
| `GET /api/v1/kpi/feeding` | `/api/v1/kpi/feeding` | ✅ Yes | `cloud-feed-service` | OK |
| `GET /api/v1/feed/intake-records` | `/api/v1/feed/intake-records` | ✅ Yes | `cloud-feed-service` | OK |
| `GET /api/v1/barn-records/*` | `/api/v1/barn-records/*` | ✅ Yes | `cloud-barn-records-service` | OK |
| `GET /api/v1/sensors` | `/api/v1/sensors` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |
| `POST /api/v1/sensors` | `/api/v1/sensors` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |
| `GET /api/v1/sensors/:sensorId/bindings` | `/api/v1/sensors/:sensorId/bindings` | ❌ No | `cloud-tenant-registry` | **MISSING BFF PROXY** |

---

## 4. Root Cause Analysis: "Why Seeded BE Data Doesn't Show in FE"

### Hypothesis 1: Missing BFF Proxy Routes (HIGH PROBABILITY - P0)

**Evidence**:
- FE calls `/api/v1/farms`, `/api/v1/barns`, `/api/v1/tenants` but BFF doesn't proxy these routes
- BFF only has `/api/v1/dashboard/*`, feed, and barn-records routes
- `cloud-tenant-registry` service exists and likely has data, but FE can't reach it

**How to Verify**:
```powershell
# 1. Check BFF routes
cd cloud-layer/cloud-api-gateway-bff/src/routes
Get-ChildItem | Select-String "farms|barns|tenants"

# 2. Test BFF endpoint directly
curl -H "Authorization: Bearer $token" http://localhost:5125/api/v1/farms?tenantId=test
# Expected: 404 Not Found

# 3. Test tenant-registry service directly (if accessible)
curl -H "Authorization: Bearer $token" http://localhost:5120/api/v1/farms?tenantId=test
# Expected: 200 with data (if service is running and has data)

# 4. Check FE network tab in browser dev tools
# Look for 404 responses to /api/v1/farms, /api/v1/barns
```

**Fix Priority**: P0 (blocks all registry data display)

### Hypothesis 2: Tenant Context Not Set/Propagated (MEDIUM PROBABILITY - P0)

**Evidence**:
- `ContextGuard` redirects to `/select-context` if `tenantId` is missing
- `ActiveContext` stores `tenantId` in localStorage
- `getTenantId()` in `auth.ts` may return null if not set
- FE sends `tenantId` as query param, but if it's null/undefined, backend returns empty results

**How to Verify**:
```powershell
# 1. Check ActiveContext implementation
cd apps/dashboard-web/src/contexts
Get-Content ActiveContext.tsx | Select-String "tenantId" -Context 5

# 2. Check getTenantId implementation
cd apps/dashboard-web/src/api
Get-Content auth.ts | Select-String "getTenantId" -Context 10

# 3. Test in browser console:
# localStorage.getItem('farmiq_active_context')
# Should show JSON with tenantId

# 4. Check network tab: Verify tenantId query param is present in API requests
```

**Fix Priority**: P0 (blocks all tenant-scoped data)

### Hypothesis 3: API Path Mismatch (LOW-MEDIUM PROBABILITY - P1)

**Evidence**:
- FE calls `/api/v1/farms` but schema docs suggest `/api/v1/registry/farms`
- Mock handlers use `/registry/*` prefix
- Actual backend service may expect `/registry/*` or `/farms` directly

**How to Verify**:
```powershell
# 1. Check tenant-registry service routes
cd cloud-layer/cloud-tenant-registry
Get-Content src/routes/*.ts | Select-String "farms|barns|tenants" -Context 3

# 2. Check API catalog docs
cd docs/shared
Get-Content 00-api-catalog.md | Select-String "cloud-tenant-registry" -Context 10

# 3. Test with correct path (if registry prefix is needed):
curl -H "Authorization: Bearer $token" http://localhost:5120/api/v1/registry/farms?tenantId=test
```

**Fix Priority**: P1 (may cause 404 if path is wrong)

---

## 5. Backlog Table (Prioritized)

| Item | Layer/Service | Priority | Evidence | Proposed Owner | Verification Command |
|---|---|---|---|---|---|
| Add BFF proxy routes for `/api/v1/farms`, `/api/v1/barns`, `/api/v1/tenants`, `/api/v1/devices` | BFF | P0 | `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` missing routes; FE calls these in `FarmListPage.tsx:37`, `api/index.ts:88,94,101` | Backend Team | `curl http://localhost:5125/api/v1/farms?tenantId=test` should return 200 |
| Fix dual API client architecture - consolidate to single client | FE | P0 | Two clients exist: `src/api/client.ts` (axios) and `src/lib/api/client.ts` (@farmiq/api-client) | Frontend Team | Verify all API calls use same client pattern |
| Verify tenantId propagation in API calls | FE | P0 | `auth.ts:getTenantId()` may return null; `ActiveContext` stores in localStorage | Frontend Team | Browser console: Check network tab for `tenantId` query param |
| Create Sensor Catalog pages (`/sensors`, `/sensors/new`, `/sensors/:sensorId`, etc.) | FE | P1 | `docs/dev/frontend-sensors-module.md` documents pages; only `/sensors/matrix` and `/sensors/trends` exist | Frontend Team | Navigate to `/sensors` should show catalog list |
| Add BFF proxy routes for sensor endpoints (`/api/v1/sensors/*`) | BFF | P1 | Sensor module documented in tenant-registry but BFF doesn't proxy; FE will need these | Backend Team | `curl http://localhost:5125/api/v1/sensors?tenantId=test` should return 200 |
| Create separate Barn Records pages (health, welfare, housing) | FE | P1 | `docs/dev/frontend-feeding-module.md` expects separate pages; currently all in `/barns/records` tabs | Frontend Team | Routes `/barn-records/health`, `/barn-records/welfare`, `/barn-records/housing` should exist |
| Fix API path consistency (registry prefix if needed) | FE/BFF | P1 | Schema docs suggest `/registry/*` prefix; FE calls `/farms` directly | Frontend/Backend | Align FE calls with backend service routes |
| Add environment variable documentation | FE | P1 | No `.env` file exists, only `.example.env`; base URL config unclear | Frontend Team | Create `.env.example` with all required vars |
| Implement placeholder pages for AI/Ops/Reports | FE | P2 | Pages exist but likely show "Coming Soon" | Frontend Team | Check if pages show meaningful content |
| Add error boundaries for API failures | FE | P2 | No error boundaries found in audit | Frontend Team | Test with backend down, should show graceful error UI |

---

## 6. Evidence Index

### Key Files Referenced

- **Routing**: `apps/dashboard-web/src/App.tsx`, `apps/dashboard-web/src/config/routes.tsx`
- **API Clients**: `apps/dashboard-web/src/api/client.ts`, `apps/dashboard-web/src/lib/api/client.ts`, `apps/dashboard-web/src/api/index.ts`
- **API Integration**: `apps/dashboard-web/src/features/farms/pages/FarmListPage.tsx`, `apps/dashboard-web/src/api/bffClient.ts`, `apps/dashboard-web/src/features/feeding/api.ts`
- **Context**: `apps/dashboard-web/src/contexts/ActiveContext.tsx`, `apps/dashboard-web/src/guards/ContextGuard.tsx`
- **BFF Routes**: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`
- **Documentation**: `docs/dev/frontend-feeding-module.md`, `docs/dev/frontend-sensors-module.md`, `docs/shared/00-api-catalog.md`

---

## 7. Verification Commands (Windows PowerShell)

### Build & Dev Server

```powershell
cd apps/dashboard-web
npm install
npm run dev
# Should start on http://localhost:5142 (check vite.config.ts)
```

### Check Environment Variables

```powershell
cd apps/dashboard-web
# Check if .env exists
Test-Path .env
# If not, list example
Get-Content env/.example.env
# Expected vars: VITE_BFF_BASE_URL, VITE_API_BASE_URL, VITE_MOCK_MODE
```

### Test BFF Endpoints (with auth token)

```powershell
# Set token (replace with actual token)
$token = "your-jwt-token-here"

# Test dashboard overview (should work)
curl -H "Authorization: Bearer $token" http://localhost:5125/api/v1/dashboard/overview?tenantId=test

# Test farms (should fail with 404 - missing proxy)
curl -H "Authorization: Bearer $token" http://localhost:5125/api/v1/farms?tenantId=test

# Test feeding KPI (should work)
curl -H "Authorization: Bearer $token" http://localhost:5125/api/v1/kpi/feeding?tenantId=test&startDate=2025-01-01&endDate=2025-01-27
```

### Check Service Health

```powershell
# BFF health
curl http://localhost:5125/api/health

# Tenant registry health (if accessible)
curl http://localhost:5120/api/health
```

---

## 8. Recommendations

1. **Immediate (P0)**: Add BFF proxy routes for registry endpoints (`/api/v1/farms`, `/api/v1/barns`, `/api/v1/tenants`, `/api/v1/devices`)
2. **Immediate (P0)**: Consolidate API client architecture (choose one: axios or @farmiq/api-client)
3. **Immediate (P0)**: Verify tenant context is set and propagated in all API calls
4. **Short-term (P1)**: Implement sensor catalog pages per `docs/dev/frontend-sensors-module.md`
5. **Short-term (P1)**: Add BFF proxy routes for sensor endpoints
6. **Short-term (P1)**: Create separate barn records pages or update documentation to reflect tab-based UI

---

## Next Steps

1. Implement P0 fixes first (BFF proxy routes, API client consolidation, tenant context verification)
2. Test with seeded backend data after P0 fixes
3. Proceed with P1 backlog items
4. Update this audit report after fixes are implemented

