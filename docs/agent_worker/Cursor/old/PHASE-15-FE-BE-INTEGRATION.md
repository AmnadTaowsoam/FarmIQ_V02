# Phase 15: Frontend-Backend Integration & API Wiring

**Owner**: Cursor
**Priority**: P0 - Critical
**Status**: Not Started
**Created**: 2025-01-27
**Dependencies**: Phase 11 (Seed Data) - Completed

---

## Objective

เชื่อมต่อ Frontend Apps (dashboard-web, admin-web) เข้ากับ Backend APIs ที่มีอยู่ โดยเฉพาะ:
1. แก้ไขหน้าที่แสดงข้อมูล hardcoded ให้ดึงจาก API จริง
2. เชื่อมต่อกับ BE services ใหม่ที่ยังไม่ได้ใช้งาน
3. ทำให้ Dashboard แสดงข้อมูล seed data ที่ถูก seed ไว้แล้ว

---

## Current State Analysis

### Dashboard-Web API Client Status
- **API Client exists**: `apps/dashboard-web/src/api/index.ts` (317 lines)
- **Endpoints defined**: Registry, Telemetry, WeighVision, Feeding, Barn Records, Reports, Analytics
- **HTTP Client configured**: `apps/dashboard-web/src/api/http.ts` with interceptors

### Backend Services Available but NOT Called by FE

| Service | Port | Endpoints | FE Status |
|---------|------|-----------|-----------|
| cloud-billing-service | - | `/api/v1/billing/*` | NOT INTEGRATED |
| cloud-fleet-management | - | `/api/firmwares`, `/api/campaigns` | NOT INTEGRATED |
| cloud-hybrid-router | 5140 | `/api/v1/inference/*` | NOT INTEGRATED |
| cloud-llm-insights-service | 5134 | `/api/v1/insights/*` | NOT INTEGRATED |
| cloud-inference-server | - | `/api/v1/inference/*` | NOT INTEGRATED |
| cloud-drift-detection | - | `/api/v1/drift/*` | NOT INTEGRATED |
| cloud-mlflow-registry | - | `/api/v1/models/*` | NOT INTEGRATED |
| cloud-standards-service | - | `/api/v1/standards/*` | Partial |
| cloud-weighvision-readmodel | - | `/api/v1/weighvision/*` | Partial |

### BFF Routes Available

From `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`:
- Auth: `/api/v1/auth/*`
- Dashboard: `/api/v1/dashboard/*`
- Tenants: `/api/v1/tenants`, `/api/v1/admin/tenants`
- Farms/Barns/Batches/Devices: `/api/v1/*`
- Feeding: `/api/v1/feed/*`, `/api/v1/kpi/feeding`
- Barn Records: `/api/v1/barn-records/*`
- WeighVision: `/api/v1/weighvision/*`
- Standards: `/api/v1/standards/*`
- Telemetry: `/api/v1/telemetry/*`
- Reports: `/api/v1/reports/*`
- Notifications: `/api/v1/notifications/*`
- Ops: `/api/v1/ops/*`

---

## Deliverables

### 15.1 Dashboard Overview Page Integration

**Description**: เชื่อมต่อ Overview Dashboard ให้แสดงข้อมูลจริง

**Files to Modify**:
- `apps/dashboard-web/src/features/dashboard/pages/OverviewPage.tsx`
- `apps/dashboard-web/src/hooks/useDashboard.ts` (create/update)

**Tasks**:
- [ ] Call `api.dashboard.overview()` to fetch real data
- [ ] Map API response to KPI cards (ADG, FCR, Mortality, etc.)
- [ ] Display recent alerts from `api.dashboard.alerts()`
- [ ] Show farm/barn count from `api.farms.list()`, `api.barns.list()`
- [ ] Display active batches count
- [ ] Add loading states and error handling
- [ ] Refresh data on context change (tenant/farm/barn)

**API Calls Required**:
```typescript
// Overview data
GET /api/v1/dashboard/overview?tenantId=xxx&farmId=xxx
// Alerts
GET /api/v1/dashboard/alerts?tenantId=xxx
// Registry counts
GET /api/v1/farms?tenantId=xxx
GET /api/v1/barns?tenantId=xxx&farmId=xxx
GET /api/v1/batches?tenantId=xxx&status=active
```

**Required Skills**:
```
02-frontend/react-query
02-frontend/mui-data-display
03-backend-api/rest-client-patterns
16-testing/frontend-testing
```

**Acceptance Criteria**:
- [ ] Overview page shows real KPI data from seed
- [ ] Alerts section populated with seeded notifications
- [ ] Farm/barn counts match seed data
- [ ] Loading skeleton shown during fetch
- [ ] Error state handled gracefully

---

### 15.2 Telemetry Pages Integration

**Description**: เชื่อมต่อหน้า Telemetry ให้แสดงข้อมูล sensor readings

**Files to Modify**:
- `apps/dashboard-web/src/features/telemetry/pages/TelemetryLandingPage.tsx`
- `apps/dashboard-web/src/features/dashboard/pages/BarnDetailPage.tsx`

**Tasks**:
- [ ] Fetch telemetry readings using `api.telemetry.readings()`
- [ ] Fetch aggregated data using `api.telemetry.aggregates()`
- [ ] Display temperature, humidity, ammonia charts
- [ ] Show real-time (polling) telemetry updates
- [ ] Date range filter integration

**API Calls Required**:
```typescript
// Raw readings
GET /api/v1/telemetry/readings?barnId=xxx&metric=temperature&from=xxx&to=xxx
// Aggregated
GET /api/v1/telemetry/aggregates?barnId=xxx&bucket=1h&from=xxx&to=xxx
// Latest
GET /api/v1/telemetry/readings?barnId=xxx&latest=true
```

**Required Skills**:
```
02-frontend/recharts
02-frontend/react-query
34-real-time-features/polling-websockets
```

**Acceptance Criteria**:
- [ ] Charts show 30 days of seeded telemetry data
- [ ] Aggregation works (hourly, daily)
- [ ] Real-time polling updates every 30 seconds
- [ ] Date range picker filters data correctly

---

### 15.3 WeighVision Integration

**Description**: เชื่อมต่อหน้า WeighVision ให้แสดง sessions และ analytics

**Files to Modify**:
- `apps/dashboard-web/src/features/weighvision/pages/WeighVisionSessionsPage.tsx`
- `apps/dashboard-web/src/features/weighvision/pages/WeighVisionAnalyticsPage.tsx`

**Tasks**:
- [ ] Fetch sessions using `api.weighvision.sessions()`
- [ ] Display session list with pagination
- [ ] Fetch analytics using `api.weighvision.analytics()`
- [ ] Show weight distribution charts
- [ ] Display measurement sources (SCALE vs VISION)

**API Calls Required**:
```typescript
GET /api/v1/weighvision/sessions?barnId=xxx&page=1&pageSize=20
GET /api/v1/weighvision/sessions/:sessionId
GET /api/v1/weighvision/analytics?barnId=xxx&from=xxx&to=xxx
```

**Required Skills**:
```
02-frontend/react-query
02-frontend/data-grid
02-frontend/recharts
```

**Acceptance Criteria**:
- [ ] Session list shows seeded weighvision sessions
- [ ] Session detail shows measurements and inference
- [ ] Analytics page displays weight trends
- [ ] FCR/ADG calculated and displayed

---

### 15.4 Feeding Module Integration

**Description**: เชื่อมต่อ Feeding module ทั้งหมด

**Files to Modify**:
- `apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx`
- `apps/dashboard-web/src/features/feeding/pages/IntakeRecordsPage.tsx`
- `apps/dashboard-web/src/features/feeding/pages/FeedLotsPage.tsx`
- `apps/dashboard-web/src/features/feeding/pages/DeliveriesPage.tsx`

**Tasks**:
- [ ] Fetch KPI data using `api.feeding.kpi()`
- [ ] Display FCR, ADG, feed efficiency metrics
- [ ] List intake records with pagination
- [ ] List feed lots with inventory levels
- [ ] List deliveries with status

**API Calls Required**:
```typescript
GET /api/v1/kpi/feeding?tenantId=xxx&barnId=xxx&startDate=xxx&endDate=xxx
GET /api/v1/feed/intake-records?barnId=xxx
GET /api/v1/feed/lots?tenantId=xxx
GET /api/v1/feed/deliveries?tenantId=xxx
```

**Required Skills**:
```
02-frontend/react-hook-form
02-frontend/data-grid
03-backend-api/rest-client-patterns
```

**Acceptance Criteria**:
- [ ] KPI page shows seeded feed data
- [ ] Intake records table populated
- [ ] Feed lots with inventory shown
- [ ] Create/edit forms submit to API

---

### 15.5 Barn Records Integration

**Description**: เชื่อมต่อ Barn Records module

**Files to Modify**:
- `apps/dashboard-web/src/features/barns/pages/BarnHealthRecordsPage.tsx`
- `apps/dashboard-web/src/features/barns/pages/BarnDetailPage.tsx`

**Tasks**:
- [ ] Display mortality events
- [ ] Display morbidity events with treatments
- [ ] Show vaccination history
- [ ] Display daily counts chart
- [ ] Show welfare checks

**API Calls Required**:
```typescript
GET /api/v1/barn-records/daily-counts?barnId=xxx
POST /api/v1/barn-records/mortality
POST /api/v1/barn-records/vaccines
```

**Required Skills**:
```
02-frontend/data-grid
02-frontend/react-query
02-frontend/form-validation
```

**Acceptance Criteria**:
- [ ] Health records page shows seeded events
- [ ] Mortality chart displays 30-day data
- [ ] Vaccination timeline populated
- [ ] Create forms work with API

---

### 15.6 Standards Module Integration

**Description**: เชื่อมต่อ Standards service

**Files to Modify**:
- `apps/dashboard-web/src/features/standards/pages/StandardsLibraryPage.tsx`
- `apps/dashboard-web/src/features/standards/pages/StandardsImportPage.tsx`

**Tasks**:
- [ ] Fetch standard sets using `api.standards.sets()`
- [ ] Display standards library with categories
- [ ] Import CSV functionality
- [ ] Clone/adjust standards

**API Calls Required**:
```typescript
GET /api/v1/standards/sets?tenantId=xxx
GET /api/v1/standards/sets/:setId
POST /api/v1/standards/import
POST /api/v1/standards/sets/:setId/clone
```

**Required Skills**:
```
02-frontend/file-upload
02-frontend/data-grid
03-backend-api/rest-client-patterns
```

**Acceptance Criteria**:
- [ ] Standards library shows seeded standards
- [ ] CSV import working
- [ ] Clone/adjust operations functional

---

### 15.7 AI Insights Integration (NEW)

**Description**: เชื่อมต่อกับ LLM Insights service

**Files to Modify**:
- `apps/dashboard-web/src/features/ai/pages/AiInsightsPage.tsx`
- `apps/dashboard-web/src/features/ai/pages/AiRecommendationsPage.tsx`
- `apps/dashboard-web/src/api/endpoints.ts` (add LLM endpoints)
- `apps/dashboard-web/src/api/index.ts` (add llm namespace)

**Tasks**:
- [ ] Add LLM endpoints to BFF proxy (if not exposed)
- [ ] Create `api.llm.generateInsight()` method
- [ ] Create `api.llm.getHistory()` method
- [ ] Display insight history
- [ ] Implement generate insight form
- [ ] Show AI recommendations

**New Endpoints to Add**:
```typescript
// endpoints.ts
export const LLM_ENDPOINTS = {
  GENERATE: '/api/v1/insights/generate',
  HISTORY: '/api/v1/insights/history',
  CHAT: '/api/v1/insights/chat',
};

// index.ts
llm: {
  generate: (data: any) => httpClient.post(LLM_ENDPOINTS.GENERATE, data),
  history: (params?: any) => httpClient.get(LLM_ENDPOINTS.HISTORY, { params }),
  chat: (data: any) => httpClient.post(LLM_ENDPOINTS.CHAT, data),
}
```

**Required Skills**:
```
06-ai-ml-production/llm-integration
02-frontend/streaming-responses
20-ai-integration/llm-ui-patterns
```

**Acceptance Criteria**:
- [ ] AI insights page shows history
- [ ] Generate insight form works
- [ ] Streaming response displayed
- [ ] Recommendations page populated

---

### 15.8 Reports Module Integration

**Description**: เชื่อมต่อ Reports module ให้ทำงานจริง

**Files to Modify**:
- `apps/dashboard-web/src/features/reports/pages/ReportsListPage.tsx`
- `apps/dashboard-web/src/features/reports/pages/CreateReportPage.tsx`

**Tasks**:
- [ ] Fetch report jobs using `api.reports.listJobs()`
- [ ] Display job status and progress
- [ ] Create new report job
- [ ] Download completed reports

**API Calls Required**:
```typescript
GET /api/v1/reports/jobs?status=xxx
POST /api/v1/reports/jobs
GET /api/v1/reports/jobs/:jobId/download
```

**Required Skills**:
```
02-frontend/file-download
02-frontend/polling-status
02-frontend/data-grid
```

**Acceptance Criteria**:
- [ ] Report list shows job history
- [ ] Create report flow works
- [ ] Download link functional
- [ ] Progress indicator updates

---

### 15.9 Notifications Integration

**Description**: เชื่อมต่อ Notification center

**Files to Modify**:
- `apps/dashboard-web/src/features/notifications/pages/NotificationCenterPage.tsx`
- `apps/dashboard-web/src/layout/Topbar.tsx` (notification bell)

**Tasks**:
- [ ] Fetch unread notifications
- [ ] Display notification inbox
- [ ] Mark as read functionality
- [ ] Real-time notification polling

**API Calls Required**:
```typescript
GET /api/v1/dashboard/notifications/inbox?unread=true
GET /api/v1/dashboard/notifications/history
POST /api/v1/notifications/:id/read
```

**Required Skills**:
```
02-frontend/react-query
34-real-time-features/polling-websockets
02-frontend/badge-indicators
```

**Acceptance Criteria**:
- [ ] Notification bell shows unread count
- [ ] Inbox populated with seeded notifications
- [ ] Mark as read updates count
- [ ] History searchable

---

### 15.10 Context-Aware Data Fetching

**Description**: ทำให้ทุกหน้าดึงข้อมูลตาม context ที่เลือก

**Files to Modify**:
- `apps/dashboard-web/src/contexts/ActiveContext.tsx`
- All page components

**Tasks**:
- [ ] Inject `tenantId`, `farmId`, `barnId` into all API calls
- [ ] Refetch data when context changes
- [ ] Clear stale data on context switch
- [ ] Handle no-context state gracefully

**Pattern**:
```typescript
const { tenantId, farmId, barnId } = useActiveContext();

const { data, isLoading } = useQuery({
  queryKey: ['dashboard', 'overview', tenantId, farmId, barnId],
  queryFn: () => api.dashboard.overview({ tenantId, farmId, barnId }),
  enabled: !!tenantId,
});
```

**Required Skills**:
```
02-frontend/react-query
02-frontend/context-api
17-domain-specific/multi-tenancy
```

**Acceptance Criteria**:
- [ ] All pages respect selected context
- [ ] Data refreshes on context change
- [ ] Empty state when no context selected
- [ ] Loading states consistent

---

## Dependencies

- Phase 11: Seed Data (COMPLETED)
- BFF service running at port 5125
- All downstream services healthy

## Timeline Estimate

| Deliverable | Sprints |
|-------------|---------|
| 15.1 Dashboard Overview | 1 |
| 15.2 Telemetry | 2 |
| 15.3 WeighVision | 1-2 |
| 15.4 Feeding | 2 |
| 15.5 Barn Records | 1-2 |
| 15.6 Standards | 1 |
| 15.7 AI Insights | 2 |
| 15.8 Reports | 1 |
| 15.9 Notifications | 1 |
| 15.10 Context-Aware | 1 |

**Total**: 13-16 sprints

---

## Testing Requirements

- [ ] E2E tests for each integrated page
- [ ] Mock API responses in Vitest
- [ ] Integration tests with real BFF
- [ ] Verify seeded data displays correctly

---

## Evidence Requirements

- [ ] Screenshots of pages with real data
- [ ] Network tab showing API calls
- [ ] Console showing no errors
- [ ] All acceptance criteria checked
