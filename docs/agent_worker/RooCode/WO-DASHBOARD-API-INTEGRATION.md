# Work Order: Dashboard Web API Integration

**Work Order ID**: WO-DASH-API-001  
**Created**: 2025-01-28  
**Priority**: HIGH  
**Assigned To**: RooCode Agent  
**Estimated Effort**: 3-5 days

---

## Objective

Connect the `dashboard-web` application to real backend APIs instead of mock data. Ensure all features properly fetch data from the BFF (Backend for Frontend) and downstream microservices.

---

## Current State Analysis

### What Exists
1. **API Client Layer** (`src/api/`)
   - Well-structured endpoint definitions in `endpoints.ts` (15+ modules)
   - Centralized API client in `index.ts` and `http.ts`
   - Mock mode support via `VITE_MOCK_MODE` environment variable
   - MSW (Mock Service Worker) handlers in `src/mocks/handlers.ts`

2. **Feature Modules** (22 total in `src/features/`)
   - ai, auth, barns, farms, feeding, sensors, telemetry
   - devices, dashboard, notifications, ops, reports
   - settings, standards, weighvision, profile, etc.

3. **BFF Routes** (26 routes in `cloud-api-gateway-bff/src/routes/`)
   - dashboardRoutes, feedRoutes, barnRecordsRoutes
   - telemetryRoutes, weighvisionRoutes, sensorsRoutes
   - opsRoutes, standardsRoutes, reportingRoutes, etc.

### Identified Gaps

| Gap ID | Module | Issue | Priority |
|--------|--------|-------|----------|
| GAP-001 | Dashboard Overview | Uses mock data for KPIs, may not call `/api/v1/dashboard/overview` | HIGH |
| GAP-002 | Farms/Barns Pages | Context selector shows "Failed to load tenants" - API calls fail | HIGH |
| GAP-003 | Telemetry Charts | Charts may use static or mock data | MEDIUM |
| GAP-004 | WeighVision | Analytics and sessions may not be wired to real APIs | MEDIUM |
| GAP-005 | Feeding Module | Feed KPIs, lots, deliveries may use mock data | MEDIUM |
| GAP-006 | Standards Module | Import/resolve may not connect to backend | MEDIUM |
| GAP-007 | Reports | Job creation/download may not fully work | MEDIUM |
| GAP-008 | Sensors | CRUD operations may not persist to backend | MEDIUM |
| GAP-009 | Notifications | History/send may use mock data | LOW |
| GAP-010 | AI Recommendations | `/ai/recommendations` uses mock handlers | MEDIUM |

---

## Tasks

### Task 1: Environment Configuration
**Priority**: HIGH  
**Skills Required**: `02-frontend/react-query`, `16-testing/api-debugging`

**Actions**:
1. Verify `.env` file has correct `VITE_BFF_BASE_URL` pointing to BFF
2. Ensure `VITE_MOCK_MODE=false` for real API usage
3. Verify proxy configuration in `vite.config.ts`
4. Test basic connectivity to BFF health endpoint

**Verification**:
```bash
# Check BFF is running
curl http://localhost:5130/api/health

# Check .env configuration
cat apps/dashboard-web/.env
```

---

### Task 2: Fix Tenant/Farm/Barn Context Loading
**Priority**: CRITICAL  
**Skills Required**: `02-frontend/react-query`, `03-backend-api/rest-client-patterns`, `17-domain-specific/multi-tenancy`

**Problem**: The "Select Organization" page shows "Failed to load tenants" (Network Error)

**Actions**:
1. Check `src/contexts/TenantContext.tsx` or similar context providers
2. Verify API calls to `/api/v1/tenants` and `/api/v1/farms`
3. Ensure authentication token is properly attached to requests
4. Add proper error handling and retry logic

**Files to Check**:
- `src/api/index.ts` - tenants/farms/barns methods
- `src/contexts/` - context providers
- `src/components/forms/ContextSelector.tsx`

---

### Task 3: Wire Up Dashboard Overview
**Priority**: HIGH  
**Skills Required**: `02-frontend/react-query`, `02-frontend/dashboard-design`, `17-domain-specific/agricultural-analytics`

**Actions**:
1. Locate dashboard data fetching hooks
2. Replace mock data with calls to `/api/v1/dashboard/overview`
3. Map API response to UI components
4. Add loading states and error handling

**Files to Check**:
- `src/features/dashboard/pages/DashboardPage.tsx`
- `src/features/dashboard/hooks/` - any data hooks
- `src/api/index.ts` - `api.dashboard.overview()`

---

### Task 4: Connect Telemetry Charts
**Priority**: MEDIUM  
**Skills Required**: `02-frontend/recharts`, `02-frontend/data-visualization`, `34-real-time-features/polling`

**Actions**:
1. Find telemetry visualization components
2. Wire to `/api/v1/telemetry/readings` and `/api/v1/telemetry/aggregates`
3. Implement proper time range filtering
4. Add real-time polling for live data

**Files to Check**:
- `src/features/telemetry/`
- `src/features/dashboard/components/*Chart*`

---

### Task 5: Wire Up Feeding Module
**Priority**: MEDIUM  
**Skills Required**: `02-frontend/data-grid`, `17-domain-specific/feeding-module`

**Actions**:
1. Connect feed intake records CRUD
2. Wire feed lots, deliveries, quality results
3. Connect KPI endpoint `/api/v1/kpi/feeding`
4. Verify programs and formulas endpoints

**Files to Check**:
- `src/features/feeding/`
- `src/api/index.ts` - `api.feeding.*`

---

### Task 6: Connect WeighVision Analytics
**Priority**: MEDIUM  
**Skills Required**: `02-frontend/data-visualization`, `06-ai-ml-production/analytics-api`

**Actions**:
1. Wire sessions list to `/api/v1/weighvision/sessions`
2. Connect analytics endpoint
3. Ensure session detail fetching works

**Files to Check**:
- `src/features/weighvision/`

---

### Task 7: Connect Sensors Module
**Priority**: MEDIUM  
**Skills Required**: `02-frontend/react-query`, `36-iot-integration/*`

**Actions**:
1. Wire sensor CRUD operations
2. Connect bindings and calibrations endpoints
3. Test sensor creation/deletion

**Files to Check**:
- `src/features/sensors/`
- `src/api/index.ts` - `api.sensors.*`

---

### Task 8: Wire Up Standards Module
**Priority**: MEDIUM  
**Skills Required**: `02-frontend/file-upload`, `17-domain-specific/standards-management`

**Actions**:
1. Connect standards sets CRUD
2. Wire CSV import functionality
3. Connect resolve and clone operations

**Files to Check**:
- `src/features/standards/`
- `src/api/standards.ts`

---

### Task 9: Connect Reports Module
**Priority**: MEDIUM  
**Skills Required**: `02-frontend/file-download`, `02-frontend/polling-status`

**Actions**:
1. Wire job creation to `/api/v1/reports/jobs`
2. Implement job status polling
3. Connect download functionality

**Files to Check**:
- `src/features/reports/`

---

### Task 10: Disable Mock Mode & Final Testing
**Priority**: HIGH  
**Skills Required**: `16-testing/integration-testing`, `16-testing/api-debugging`

**Actions**:
1. Set `VITE_MOCK_MODE=false` in `.env`
2. Remove or disable MSW worker initialization
3. Test all features end-to-end
4. Document any remaining issues

---

## Skills Reference

| Skill Category | Skill Name | Usage |
|----------------|------------|-------|
| 02-frontend | react-query | React Query hooks for data fetching |
| 02-frontend | data-binding | Connecting API data to UI components |
| 02-frontend | recharts | Chart library for visualizations |
| 02-frontend | data-grid | Table components for lists |
| 02-frontend | file-upload | Standards CSV import |
| 02-frontend | file-download | Reports download |
| 02-frontend | polling-status | Real-time status updates |
| 03-backend-api | rest-client-patterns | API client best practices |
| 16-testing | api-debugging | Debugging API issues |
| 16-testing | integration-testing | End-to-end testing |
| 17-domain-specific | multi-tenancy | Tenant context handling |
| 17-domain-specific | feeding-module | Feeding domain logic |
| 17-domain-specific | standards-management | Standards domain logic |
| 34-real-time-features | polling | Live data polling |
| 36-iot-integration | * | Sensor and device integration |

---

## Verification Checklist

### Manual Testing (User Required)
- [ ] Login and select a tenant
- [ ] Navigate to Dashboard - verify KPIs load from API
- [ ] View Farms list - verify real data appears
- [ ] View Barns list - verify real data appears
- [ ] Check Telemetry charts - verify data points are real
- [ ] View Feeding module - verify records load
- [ ] Check WeighVision - verify sessions load
- [ ] Open Sensors page - create/edit/delete sensor
- [ ] Generate a report - verify job completes

### API Connectivity Tests
```bash
# Run from project root
cd apps/dashboard-web

# Verify environment
cat .env | grep VITE_

# Check BFF health
curl http://localhost:5130/api/health

# Test tenant endpoint
curl -H "Authorization: Bearer <token>" http://localhost:5130/api/v1/tenants
```

---

## Success Criteria

1. ✅ All dashboard pages load real data from APIs
2. ✅ No "Failed to load" errors for any feature
3. ✅ Mock mode is disabled (`VITE_MOCK_MODE=false`)
4. ✅ All CRUD operations persist to backend
5. ✅ Charts display real-time data with proper polling
6. ✅ Reports can be generated and downloaded

---

## Notes

- BFF is running at `http://localhost:5130`
- Dashboard-web runs at `http://localhost:5135`
- Ensure all downstream services are running before testing
- Check `docker-compose.yml` for service dependencies
