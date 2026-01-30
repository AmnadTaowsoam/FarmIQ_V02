# Work Order: WO-002 - Frontend-Backend Connection & API Integration Fix

**Owner**: RooCode
**Priority**: P0 - Critical (Blocking)
**Status**: Not Started
**Created**: 2025-01-29
**Estimated Effort**: ~20-30 hours

---

## Objective

แก้ไขปัญหาทั้งหมดระหว่าง Frontend และ Backend:
1. **Connection Fix**: Frontend ไม่สามารถเชื่อมต่อ/Login ได้
2. **API Integration**: Pages ที่ยังใช้ Mock Data ให้เชื่อมต่อ API จริง
3. **Data Display**: แก้ไขปัญหาการแสดงผลข้อมูล
4. **Missing Features**: เพิ่ม features ที่ยังขาด

---

# PHASE 1: CONNECTION FIX (P0 - CRITICAL)

## Root Cause

| Component | ค่าปัจจุบัน (ผิด) | ค่าที่ถูกต้อง |
|-----------|------------------|---------------|
| `.env` VITE_BFF_BASE_URL | `http://localhost:3000` | `http://localhost:5125/api` หรือ ว่าง |
| Vite Proxy Target | `http://localhost:5125` | ✅ ถูกต้อง |
| BFF Service Port | `5125` (external) | ✅ ถูกต้อง |

---

### Task 1.1: Fix Dashboard-Web Environment (P0)

**File**: `apps/dashboard-web/.env`

**Fix**:
```env
# VITE_BFF_BASE_URL=  (comment out or delete to use Vite proxy)
VITE_MOCK_MODE=false
```

**Acceptance Criteria**:
- [ ] .env file updated
- [ ] Frontend uses Vite proxy (port 5125)

---

### Task 1.2: Fix Admin-Web Environment (P0)

**File**: `apps/admin-web/.env`

**Apply same fix as Task 1.1**

---

### Task 1.3: Verify Connection (P0)

```powershell
# Test BFF health
curl http://localhost:5125/api/health

# Test login
$body = @{ email = "admin@farmiq.com"; password = "password123" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5125/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
```

**Acceptance Criteria**:
- [ ] Health returns 200
- [ ] Login returns tokens
- [ ] Frontend can login in browser

---

# PHASE 2: API INTEGRATION - DASHBOARD-WEB (P0 - CRITICAL)

## GAP Summary: Pages Using Mock Data

| Page | File | Issue | Priority |
|------|------|-------|----------|
| AnomaliesPage | ai/pages/AnomaliesPage.tsx | Lines 24-75 MOCK_ANOMALIES | CRITICAL |
| RecommendationsPage | ai/pages/RecommendationsPage.tsx | Lines 40-71 MOCK_RECOMMENDATIONS | CRITICAL |
| InsightDetailPage | ai/pages/InsightDetailPage.tsx | Line 38 TODO, mock data | CRITICAL |
| TenantSelectionPage | context/pages/TenantSelectionPage.tsx | useState only, no API | HIGH |
| FarmSelectionPage | context/pages/FarmSelectionPage.tsx | useState only, no API | HIGH |
| ContextSelectionPage | context/pages/ContextSelectionPage.tsx | LocalStorage only | HIGH |

---

### Task 2.1: Fix AnomaliesPage (P0)

**File**: `apps/dashboard-web/src/features/ai/pages/AnomaliesPage.tsx`

**Current Problem** (Lines 24-75):
```tsx
const MOCK_ANOMALIES = [ ... ];  // Hardcoded mock data
```

**Fix**:
```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';

export const AnomaliesPage: React.FC = () => {
  const { data: anomalies, isLoading, error } = useQuery({
    queryKey: ['analytics', 'anomalies'],
    queryFn: async () => {
      const response = await api.analyticsAnomaliesList();
      return response.data;
    },
  });

  if (isLoading) return <LoadingCard />;
  if (error) return <ErrorState message="Failed to load anomalies" />;

  // Use real data instead of MOCK_ANOMALIES
  return (
    <Box>
      {anomalies?.map(anomaly => (
        <AnomalyCard key={anomaly.id} anomaly={anomaly} />
      ))}
    </Box>
  );
};
```

**Acceptance Criteria**:
- [ ] Remove MOCK_ANOMALIES
- [ ] Use useQuery with api.analyticsAnomaliesList()
- [ ] Add loading/error states
- [ ] Data displays correctly

---

### Task 2.2: Fix RecommendationsPage (P0)

**File**: `apps/dashboard-web/src/features/ai/pages/RecommendationsPage.tsx`

**Current Problem** (Lines 40-71):
```tsx
const MOCK_RECOMMENDATIONS = [ ... ];
```

**Fix**:
```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';

export const RecommendationsPage: React.FC = () => {
  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['analytics', 'recommendations'],
    queryFn: async () => {
      const response = await api.analyticsRecommendationsList();
      return response.data;
    },
  });

  if (isLoading) return <LoadingCard />;
  if (error) return <ErrorState message="Failed to load recommendations" />;

  return (
    <Box>
      {recommendations?.map(rec => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </Box>
  );
};
```

**Acceptance Criteria**:
- [ ] Remove MOCK_RECOMMENDATIONS
- [ ] Use useQuery with api.analyticsRecommendationsList()
- [ ] Data displays correctly

---

### Task 2.3: Fix InsightDetailPage (P0)

**File**: `apps/dashboard-web/src/features/ai/pages/InsightDetailPage.tsx`

**Current Problem** (Line 38):
```tsx
// TODO: Replace with actual API call
const insight = { ... };  // Mock object
```

**Fix**:
```tsx
const { insightId } = useParams<{ insightId: string }>();

const { data: insight, isLoading } = useQuery({
  queryKey: ['insights', insightId],
  queryFn: async () => {
    const response = await api.get(`/api/v1/insights/${insightId}`);
    return response.data;
  },
  enabled: !!insightId,
});
```

---

### Task 2.4: Fix TenantSelectionPage (HIGH)

**File**: `apps/dashboard-web/src/features/context/pages/TenantSelectionPage.tsx`

**Current Problem** (Line 28):
```tsx
const [tenants, setTenants] = useState<Tenant[]>([]);  // No API call
```

**Fix**:
```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';

const { data: tenants, isLoading } = useQuery({
  queryKey: ['tenants'],
  queryFn: async () => {
    const response = await api.tenants.list();
    return response.data;
  },
});
```

---

### Task 2.5: Fix FarmSelectionPage (HIGH)

**File**: `apps/dashboard-web/src/features/context/pages/FarmSelectionPage.tsx`

**Same pattern as Task 2.4** - Use `api.farms.list()`

---

### Task 2.6: Fix Context Module Pages (HIGH)

**Files to update**:
- `ContextSelectionPage.tsx`

**Pattern**: Use useQuery instead of useState([])

---

# PHASE 3: API INTEGRATION - ADMIN-WEB (P0 - CRITICAL)

## GAP Summary: Admin Pages with Mock Data

| Page | File | Issue | Priority |
|------|------|-------|----------|
| MqttMonitoringPage | admin/pages/MqttMonitoringPage.tsx | Lines 24-44 hardcoded | CRITICAL |
| QueueMonitoringPage | admin/pages/QueueMonitoringPage.tsx | Lines 25-44 hardcoded | CRITICAL |
| SyncDashboardPage | admin/pages/SyncDashboardPage.tsx | Line 46 TODO | CRITICAL |
| DataPolicyPage | admin/pages/DataPolicyPage.tsx | Line 31 TODO | HIGH |
| ContextDebugPage | admin/pages/ContextDebugPage.tsx | Line 25 TODO | HIGH |
| DeviceOnboardingPage | admin/pages/DeviceOnboardingPage.tsx | Line 48 TODO | HIGH |
| ImpersonatePage | admin/pages/ImpersonatePage.tsx | TODO | MEDIUM |
| NotificationsPage | admin/pages/NotificationsPage.tsx | Line 51 TODO | MEDIUM |

---

### Task 3.1: Fix MqttMonitoringPage (CRITICAL)

**File**: `apps/admin-web/src/features/admin/pages/MqttMonitoringPage.tsx`

**Current Problem** (Lines 24-44):
```tsx
// Hardcoded mock data
const mqttData = { ... };
```

**Fix Pattern**:
```tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

const { data: mqttStats, isLoading } = useQuery({
  queryKey: ['admin', 'mqtt', 'stats'],
  queryFn: async () => {
    const response = await apiClient.get('/api/v1/ops/mqtt/stats');
    return response.data;
  },
  refetchInterval: 10000, // Refresh every 10s
});
```

**Note**: If backend endpoint doesn't exist, create placeholder API or use mock with TODO comment

---

### Task 3.2: Fix QueueMonitoringPage (CRITICAL)

**File**: `apps/admin-web/src/features/admin/pages/QueueMonitoringPage.tsx`

**Same pattern as Task 3.1** - Use `/api/v1/ops/queues/stats`

---

### Task 3.3: Fix SyncDashboardPage (CRITICAL)

**File**: `apps/admin-web/src/features/admin/pages/SyncDashboardPage.tsx`

**Current Problem** (Line 46):
```tsx
// TODO: Call API to trigger sync
```

**Fix**:
```tsx
const triggerSync = useMutation({
  mutationFn: async () => {
    const response = await apiClient.post('/api/v1/ops/sync/trigger');
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'sync'] });
  },
});
```

---

### Task 3.4: Fix Remaining Admin Pages (HIGH)

**Files**:
- `DataPolicyPage.tsx` - Implement save logic
- `ContextDebugPage.tsx` - Implement override logic
- `DeviceOnboardingPage.tsx` - Implement device claiming
- `AdminAuditPage.tsx` - Implement export
- `ImpersonatePage.tsx` - Implement impersonation
- `NotificationsPage.tsx` - Implement settings save

---

# PHASE 4: DATA DISPLAY FIXES (HIGH)

## Issues Found

| Issue | Files | Impact |
|-------|-------|--------|
| Falsy value check (0 → "—") | BarnDetailPage.tsx | Temperature/Humidity wrong |
| Chart aggregation bug | BarnDetailPage.tsx | Incorrect humidity display |
| Date formatting inconsistency | Multiple files | Timezone issues |
| Hardcoded values | OverviewPage.tsx (FCR=1.45) | Demo data shown |

---

### Task 4.1: Fix Falsy Value Checks (HIGH)

**File**: `apps/dashboard-web/src/features/barns/pages/BarnDetailPage.tsx`

**Current Problem** (Lines 97-98):
```tsx
{ label: 'Current Temp', value: latestTemperature ? `${latestTemperature}°C` : '—' }
// Problem: if latestTemperature = 0, shows "—" instead of "0°C"
```

**Fix**:
```tsx
{ label: 'Current Temp', value: latestTemperature !== undefined ? `${latestTemperature}°C` : '—' }
// Or use nullish coalescing:
{ label: 'Current Temp', value: `${latestTemperature ?? '—'}°C` }
```

**Files to fix**:
- `BarnDetailPage.tsx` (lines 97-98)
- `OverviewPage.tsx` (lines 194, 204, 216, 228, 240, 242, 244)

---

### Task 4.2: Fix Chart Data Aggregation (HIGH)

**File**: `apps/dashboard-web/src/features/barns/pages/BarnDetailPage.tsx`

**Current Problem** (Lines 51-57):
```tsx
const chartData = useMemo(() => {
  return readings.map((r) => ({
    timestamp: r.timestamp || '',
    temperature: r.metric_type === 'temperature' ? (r.metric_value ?? 0) : 0,
    humidity: r.metric_type === 'humidity' ? (r.metric_value ?? 0) : 0,
  }));
}, [readings]);
// Problem: Each reading row has only one metric, others are 0
```

**Fix**:
```tsx
const chartData = useMemo(() => {
  const grouped = new Map<string, { timestamp: string; temperature?: number; humidity?: number }>();

  readings.forEach(r => {
    const existing = grouped.get(r.timestamp) || { timestamp: r.timestamp };
    if (r.metric_type === 'temperature') existing.temperature = r.metric_value;
    if (r.metric_type === 'humidity') existing.humidity = r.metric_value;
    grouped.set(r.timestamp, existing);
  });

  return Array.from(grouped.values())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}, [readings]);
```

---

### Task 4.3: Fix Hardcoded FCR Value (MEDIUM)

**File**: `apps/dashboard-web/src/features/dashboard/pages/OverviewPage.tsx`

**Current Problem** (Line 339):
```tsx
<GaugeChart value={1.45} ... />  // Hardcoded!
```

**Fix**:
```tsx
<GaugeChart value={data?.current_fcr ?? 0} ... />
```

---

### Task 4.4: Create Date Formatting Utility (MEDIUM)

**Create File**: `apps/dashboard-web/src/utils/formatters.ts`

```typescript
import { format, parseISO } from 'date-fns';

export const formatDate = (value?: string | Date, pattern = 'MMM d, yyyy'): string => {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return format(date, pattern);
  } catch {
    return String(value);
  }
};

export const formatDateTime = (value?: string | Date): string => {
  return formatDate(value, 'MMM d, yyyy HH:mm');
};

export const formatNumber = (
  value: number | null | undefined,
  decimals = 2,
  fallback = '—'
): string => {
  if (value === null || value === undefined) return fallback;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
```

**Update files to use these utilities**:
- `BarnRecordsPage.tsx`
- `TimeSeriesChart.tsx`
- `FeedingQualityPage.tsx`

---

# PHASE 5: MISSING BACKEND ENDPOINTS (MEDIUM)

## Endpoints Frontend Needs But Backend Missing

| Endpoint | Frontend Uses | Priority |
|----------|---------------|----------|
| `GET /api/v1/insights/history` | useAiInsights.ts | HIGH |
| `POST /api/v1/insights/generate` | useAiInsights.ts | HIGH |
| `GET /api/v1/recommendations` | api/index.ts | HIGH |
| `GET /api/v1/dashboard/notifications/unread-count` | notifications.ts | MEDIUM |
| `PATCH /api/v1/notifications/{id}/read` | notifications.ts | MEDIUM |

---

### Task 5.1: Create Insights Endpoints (Backend)

**If you have backend access**, create:

**File**: `cloud-layer/cloud-api-gateway-bff/src/routes/insightsRoutes.ts`

```typescript
import { Router } from 'express';
const router = Router();

router.get('/api/v1/insights/history', async (req, res) => {
  // Proxy to LLM service or return mock
  res.json({ data: [] });
});

router.post('/api/v1/insights/generate', async (req, res) => {
  res.json({ data: { id: 'generated-insight', ... } });
});

export default router;
```

**If no backend access**, add fallback in frontend:
```tsx
const { data } = useQuery({
  queryKey: ['insights', 'history'],
  queryFn: async () => {
    try {
      const response = await api.get('/api/v1/insights/history');
      return response.data;
    } catch (error) {
      console.warn('Insights API not available, using empty data');
      return [];
    }
  },
});
```

---

# PHASE 6: CODE QUALITY & STANDARDIZATION (LOW)

### Task 6.1: Standardize useQuery Pattern

**All pages should use**:
```tsx
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryKeys';

const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.someKey,
  queryFn: async () => { ... },
  staleTime: 30000,
});

if (isLoading) return <LoadingCard />;
if (error) return <ErrorState message="Failed to load data" />;
```

### Task 6.2: Add Missing Loading States

**Files missing proper loading**:
- Check all pages in PHASE 2 and 3
- Add `<LoadingCard />` or `<Skeleton />` components

### Task 6.3: Add Missing Error States

**Pattern**:
```tsx
if (error) {
  return (
    <ErrorState
      message="Failed to load data"
      onRetry={() => refetch()}
    />
  );
}
```

---

# TEST PLAN

## Automated Tests

```powershell
# Run all frontend tests
cd D:\FarmIQ\FarmIQ_V02\apps\dashboard-web
npm run test

cd D:\FarmIQ\FarmIQ_V02\apps\admin-web
npm run test
```

## Manual Test Checklist

### Phase 1 Tests
- [ ] BFF health responds at `http://localhost:5125/api/health`
- [ ] Login works with `admin@farmiq.com` / `password123`
- [ ] Token stored in sessionStorage
- [ ] No CORS errors in console

### Phase 2 Tests (Dashboard-Web)
| Page | Route | Shows Real Data | No Console Errors |
|------|-------|-----------------|-------------------|
| AnomaliesPage | `/ai/anomalies` | [ ] | [ ] |
| RecommendationsPage | `/ai/recommendations` | [ ] | [ ] |
| InsightDetailPage | `/ai/insights/:id` | [ ] | [ ] |
| TenantSelectionPage | `/select-tenant` | [ ] | [ ] |
| FarmSelectionPage | `/select-farm` | [ ] | [ ] |

### Phase 3 Tests (Admin-Web)
| Page | Route | Shows Real Data | No Console Errors |
|------|-------|-----------------|-------------------|
| MqttMonitoringPage | `/ops/mqtt` | [ ] | [ ] |
| QueueMonitoringPage | `/ops/queues` | [ ] | [ ] |
| SyncDashboardPage | `/ops/sync` | [ ] | [ ] |
| DataPolicyPage | `/settings/data-policy` | [ ] | [ ] |

### Phase 4 Tests (Data Display)
- [ ] BarnDetailPage shows 0°C correctly (not "—")
- [ ] Chart shows both temperature and humidity correctly
- [ ] OverviewPage FCR shows real value (not 1.45)
- [ ] Dates formatted consistently

---

# SUCCESS CRITERIA (Definition of Done)

## Phase 1 - Connection
- [ ] Both apps can load
- [ ] Login works
- [ ] Token stored
- [ ] Build passes

## Phase 2 - Dashboard Integration
- [ ] All AI pages use real API
- [ ] All Context pages use real API
- [ ] No MOCK_* variables in production code
- [ ] Loading states show correctly
- [ ] Error states handle failures

## Phase 3 - Admin Integration
- [ ] Monitoring pages show real metrics
- [ ] Admin actions work (sync, policies, etc.)
- [ ] No TODO comments in critical paths

## Phase 4 - Data Display
- [ ] Zero values display correctly
- [ ] Charts aggregate data properly
- [ ] Dates/numbers formatted consistently

## Phase 5 - Missing Endpoints
- [ ] Insights API available (or graceful fallback)
- [ ] Notifications unread count works

---

# EVIDENCE REQUIREMENTS

1. **Screenshot**: Dashboard login success
2. **Screenshot**: AnomaliesPage with real data
3. **Screenshot**: AdminOverview with real metrics
4. **Screenshot**: BarnDetail showing 0°C correctly
5. **Console**: No errors in DevTools
6. **Terminal**: `npm run build` passes for both apps

---

# LOOP TEST SCRIPT

```powershell
# Full integration test script
$ErrorActionPreference = "Stop"

Write-Host "=== Phase 1: Connection Test ===" -ForegroundColor Cyan

# Test health
$health = Invoke-RestMethod -Uri "http://localhost:5125/api/health" -Method GET
Write-Host "✅ Health: $($health | ConvertTo-Json)" -ForegroundColor Green

# Test login
$body = @{ email = "admin@farmiq.com"; password = "password123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:5125/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
if ($login.access_token) {
    Write-Host "✅ Login successful" -ForegroundColor Green
} else {
    Write-Host "❌ Login failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Phase 2: API Endpoints Test ===" -ForegroundColor Cyan

$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }

# Test dashboard overview
try {
    $overview = Invoke-RestMethod -Uri "http://localhost:5125/api/v1/dashboard/overview" -Method GET -Headers $headers
    Write-Host "✅ Dashboard overview: $($overview.data | ConvertTo-Json -Depth 1)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Dashboard overview failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test anomalies
try {
    $anomalies = Invoke-RestMethod -Uri "http://localhost:5125/api/v1/analytics/anomalies" -Method GET -Headers $headers
    Write-Host "✅ Anomalies: Found $($anomalies.data.Count) items" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Anomalies endpoint not available" -ForegroundColor Yellow
}

# Test tenants
try {
    $tenants = Invoke-RestMethod -Uri "http://localhost:5125/api/v1/tenants" -Method GET -Headers $headers
    Write-Host "✅ Tenants: Found $($tenants.data.Count) items" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Tenants failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 3: Build Test ===" -ForegroundColor Cyan

Push-Location D:\FarmIQ\FarmIQ_V02\apps\dashboard-web
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dashboard-web build passed" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboard-web build failed" -ForegroundColor Red
}
Pop-Location

Push-Location D:\FarmIQ\FarmIQ_V02\apps\admin-web
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Admin-web build passed" -ForegroundColor Green
} else {
    Write-Host "❌ Admin-web build failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`n=== ALL TESTS COMPLETED ===" -ForegroundColor Cyan
```

---

# NOTES

- ทำตาม Phase 1 ก่อน (Connection) เพราะเป็น blocker
- Phase 2-3 สามารถทำคู่ขนานได้
- ถ้า Backend endpoint ไม่มี ให้ใส่ graceful fallback + TODO comment
- Test ทุกครั้งหลังแก้ไขแต่ละ task
- Screenshot evidence ทุก phase ที่ผ่าน

---

# RELATED WORK ORDERS

- `WO-001-ADMIN-PAGE-WIRE-UP-FIX.md` - Related admin work
- `PHASE-16-FE-DATA-INTEGRATION.md` - Data integration phase
