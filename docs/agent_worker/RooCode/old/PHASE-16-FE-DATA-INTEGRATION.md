# Phase 16: Frontend Data Integration - Connecting UI to Real Data

**Owner**: RooCode
**Priority**: P0 - Critical
**Status**: Not Started
**Created**: 2025-01-27
**Dependencies**: 
- Phase 11 (Seed Data) - Completed
- Phase 16 (BE Integration Gaps - Antigravity) - Parallel

---

## Objective

ทำให้ทุกหน้าใน `dashboard-web` และ `admin-web` แสดงข้อมูลจริงจาก Backend โดยเฉพาะ:
1. แก้ไขหน้าที่แสดง mock/hardcoded data
2. เชื่อมต่อกับ API endpoints ที่มีอยู่
3. แสดง seed data ที่ถูก seed ไว้แล้ว
4. เพิ่ม API integration สำหรับ features ใหม่

---

## Current State Analysis

### Dashboard-Web Pages with Missing Data

| Page | Current State | API Needed | Priority |
|------|---------------|------------|----------|
| OverviewPage | Has useDashboard but may show 0s | `/api/v1/dashboard/overview` | P0 |
| TelemetryLandingPage | Empty charts | `/api/v1/telemetry/*` | P0 |
| BarnDetailPage | Basic structure only | `/api/v1/barns/:id`, `/api/v1/telemetry` | P0 |
| WeighVisionSessionsPage | No sessions shown | `/api/v1/weighvision/sessions` | P1 |
| FeedingKpiPage | Static KPIs | `/api/v1/kpi/feeding` | P1 |
| AiInsightsPage | No insights | `/api/v1/insights/*` | P1 |
| StandardsLibraryPage | Empty list | `/api/v1/standards/sets` | P1 |
| ReportJobsPage | No reports | `/api/v1/reports/jobs` | P2 |
| NotificationsPage | No notifications | `/api/v1/notifications/*` | P1 |

### Admin-Web Pages with Missing Data

| Page | Current State | API Needed | Priority |
|------|---------------|------------|----------|
| AdminOverviewPage | Uses deleted adminQueries | Recreate queries | P0 |
| AdminTenantsPage | No data | `/api/v1/admin/tenants` | P0 |
| AdminUsersPage | No data | `/api/v1/admin/users` | P0 |
| AdminDevicesPage | No devices | `/api/v1/devices` | P0 |
| SystemHealthPage | Static health | `/api/v1/ops/health` | P1 |
| BillingDashboardPage | No billing | `/api/v1/billing/*` | P1 |
| AuditDetailPage | No audit events | `/api/v1/audit/events` | P1 |

### API Client Analysis

**dashboard-web** (`apps/dashboard-web/src/api/`):
- `client.ts` - axios instance configured ✅
- `endpoints.ts` - endpoints defined ✅
- `index.ts` - API methods partial
- Missing: billing, fleet, inference, advanced analytics

**admin-web** (`apps/admin-web/src/api/`):
- `client.ts` - basic axios instance ✅
- `endpoints.ts` - endpoints defined ✅
- Missing: `adminQueries.ts` (DELETED!) - needs recreation

---

## Deliverables

### 16.1 Recreate Admin Queries (Critical)

**Description**: สร้าง adminQueries.ts ใหม่เพราะถูกลบไป

**Files to Create**:
- `apps/admin-web/src/api/admin/adminQueries.ts`
- `apps/admin-web/src/api/admin/adminApiClient.ts`
- `apps/admin-web/src/api/admin/types.ts`

**Tasks**:
- [ ] Create React Query hooks for admin data
- [ ] Implement useOverviewStats hook
- [ ] Implement useTenantsQuery hook
- [ ] Implement useUsersQuery hook
- [ ] Implement useDevicesQuery hook
- [ ] Add mutation hooks for CRUD

**Implementation**:
```typescript
// apps/admin-web/src/api/admin/adminQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { OverviewStats, Tenant, User, Device } from './types';

// ========== Overview Stats ==========
export const useOverviewStats = () => {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/overview');
      return response.data as OverviewStats;
    },
    staleTime: 30000, // 30 seconds
  });
};

// ========== Tenants ==========
export const useTenantsQuery = (params?: { page?: number; pageSize?: number; search?: string }) => {
  return useQuery({
    queryKey: ['admin', 'tenants', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/tenants', { params });
      return response.data as { data: Tenant[]; total: number; page: number };
    },
  });
};

export const useTenantById = (tenantId: string) => {
  return useQuery({
    queryKey: ['admin', 'tenants', tenantId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/admin/tenants/${tenantId}`);
      return response.data as Tenant;
    },
    enabled: !!tenantId,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      const response = await apiClient.post('/api/v1/admin/tenants', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });
};

// ========== Users ==========
export const useUsersQuery = (params?: { tenantId?: string; page?: number; pageSize?: number }) => {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/users', { params });
      return response.data as { data: User[]; total: number };
    },
  });
};

export const useUserById = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/admin/users/${userId}`);
      return response.data as User;
    },
    enabled: !!userId,
  });
};

// ========== Devices ==========
export const useDevicesQuery = (params?: { tenantId?: string; status?: string }) => {
  return useQuery({
    queryKey: ['admin', 'devices', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/devices', { params });
      return response.data as { data: Device[]; total: number };
    },
  });
};

// ========== System Health ==========
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/ops/health');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// ========== Audit Logs ==========
export const useAuditLogs = (params?: { from?: string; to?: string; userId?: string }) => {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/audit/events', { params });
      return response.data;
    },
  });
};
```

**Types File**:
```typescript
// apps/admin-web/src/api/admin/types.ts
export interface OverviewStats {
  totalTenants: number;
  totalFarms: number;
  totalBarns: number;
  totalDevices: number;
  devicesOnline: number;
  devicesOffline: number;
  lastDataIngest: string | null;
  lastSync: string | null;
  topAlerts: Alert[];
  systemHealth: {
    api: 'healthy' | 'degraded' | 'down' | 'unknown';
    database: 'healthy' | 'degraded' | 'down' | 'unknown';
    mqtt: 'healthy' | 'degraded' | 'down' | 'unknown';
    storage: 'healthy' | 'degraded' | 'down' | 'unknown';
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  farmsCount: number;
  usersCount: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  lastLogin: string | null;
  status: 'active' | 'inactive' | 'locked';
}

export interface Device {
  id: string;
  serialNumber: string;
  type: string;
  tenantId: string;
  barnId: string | null;
  status: 'online' | 'offline';
  lastSeen: string | null;
  firmwareVersion: string;
}
```

**Required Skills**:
```
02-frontend/react-query
02-frontend/typescript-types
03-backend-api/rest-client-patterns
```

**Acceptance Criteria**:
- [ ] All hooks compile without errors
- [ ] AdminOverviewPage shows real data
- [ ] Tenants list populated
- [ ] Users list populated
- [ ] Devices list populated

---

### 16.2 Dashboard Overview Data Integration

**Description**: ตรวจสอบและแก้ไข OverviewPage ให้แสดงข้อมูลจริง

**Files to Modify**:
- `apps/dashboard-web/src/features/dashboard/pages/OverviewPage.tsx`
- `apps/dashboard-web/src/hooks/useDashboard.ts`

**Tasks**:
- [ ] Verify useDashboard hook calls correct endpoint
- [ ] Map API response to KPI cards correctly
- [ ] Handle empty data states
- [ ] Add error boundary
- [ ] Verify context-aware fetching

**Debug Steps**:
1. Check browser Network tab for API calls
2. Verify tenantId is being sent
3. Check API response structure
4. Verify data mapping in component

**Required Skills**:
```
02-frontend/react-query
02-frontend/data-binding
16-testing/api-debugging
```

**Acceptance Criteria**:
- [ ] KPIs show seed data values
- [ ] Charts render with data
- [ ] Alerts list populated
- [ ] Context switch refreshes data

---

### 16.3 Telemetry Page Integration

**Description**: เชื่อมต่อหน้า Telemetry ให้แสดง sensor readings

**Files to Modify**:
- `apps/dashboard-web/src/features/telemetry/pages/TelemetryLandingPage.tsx`
- `apps/dashboard-web/src/hooks/useSensors.ts`
- Create: `apps/dashboard-web/src/hooks/useTelemetry.ts`

**Tasks**:
- [ ] Create useTelemetry hook
- [ ] Fetch readings for selected barn
- [ ] Display temperature, humidity, ammonia charts
- [ ] Implement date range filtering
- [ ] Add real-time polling (30s)

**New Hook**:
```typescript
// apps/dashboard-web/src/hooks/useTelemetry.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';

export interface TelemetryReading {
  id: string;
  sensorId: string;
  metric: string;
  value: number;
  timestamp: string;
}

export const useTelemetryReadings = (metric: string, options?: { from?: string; to?: string }) => {
  const { barnId, tenantId } = useActiveContext();

  return useQuery({
    queryKey: ['telemetry', 'readings', barnId, metric, options],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/telemetry/readings', {
        params: {
          tenantId,
          barnId,
          metric,
          from: options?.from,
          to: options?.to,
        },
      });
      return response.data.data as TelemetryReading[];
    },
    enabled: !!barnId && !!tenantId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

export const useTelemetryAggregates = (bucket: '1h' | '1d' = '1h') => {
  const { barnId, tenantId, timeRange } = useActiveContext();

  return useQuery({
    queryKey: ['telemetry', 'aggregates', barnId, bucket, timeRange],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/telemetry/aggregates', {
        params: {
          tenantId,
          barnId,
          bucket,
          from: timeRange.start,
          to: timeRange.end,
        },
      });
      return response.data;
    },
    enabled: !!barnId && !!tenantId,
  });
};
```

**Required Skills**:
```
02-frontend/react-query
02-frontend/recharts
34-real-time-features/polling
```

**Acceptance Criteria**:
- [ ] Temperature chart shows 30 days data
- [ ] Humidity chart shows data
- [ ] Date picker filters data
- [ ] Real-time updates working

---

### 16.4 WeighVision Integration

**Description**: เชื่อมต่อหน้า WeighVision

**Files to Modify**:
- `apps/dashboard-web/src/features/weighvision/pages/SessionsListPage.tsx`
- `apps/dashboard-web/src/features/weighvision/pages/SessionDetailPage.tsx`
- `apps/dashboard-web/src/features/weighvision/pages/AnalyticsPage.tsx`

**Tasks**:
- [ ] Create useWeighVisionSessions hook
- [ ] Display session list with pagination
- [ ] Show session detail with measurements
- [ ] Display weight distribution chart

**New Hook**:
```typescript
// apps/dashboard-web/src/hooks/useWeighVision.ts
export const useWeighVisionSessions = (params?: { page?: number; pageSize?: number }) => {
  const { barnId, tenantId } = useActiveContext();

  return useQuery({
    queryKey: ['weighvision', 'sessions', barnId, params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/weighvision/sessions', {
        params: { tenantId, barnId, ...params },
      });
      return response.data;
    },
    enabled: !!barnId && !!tenantId,
  });
};

export const useWeighVisionSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['weighvision', 'session', sessionId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/weighvision/sessions/${sessionId}`);
      return response.data;
    },
    enabled: !!sessionId,
  });
};

export const useWeighVisionAnalytics = () => {
  const { barnId, tenantId, timeRange } = useActiveContext();

  return useQuery({
    queryKey: ['weighvision', 'analytics', barnId, timeRange],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/weighvision/analytics', {
        params: {
          tenantId,
          barnId,
          from: timeRange.start,
          to: timeRange.end,
        },
      });
      return response.data;
    },
    enabled: !!barnId && !!tenantId,
  });
};
```

**Required Skills**:
```
02-frontend/react-query
02-frontend/data-grid
02-frontend/recharts
```

**Acceptance Criteria**:
- [ ] Sessions list shows seeded sessions
- [ ] Session detail shows measurements
- [ ] Analytics shows weight trends
- [ ] FCR/ADG calculated

---

### 16.5 Feeding Module Integration

**Description**: เชื่อมต่อ Feeding module

**Files to Modify**:
- `apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx`
- `apps/dashboard-web/src/features/feeding/pages/FeedingIntakePage.tsx`
- `apps/dashboard-web/src/features/feeding/pages/FeedingLotsPage.tsx`
- `apps/dashboard-web/src/features/feeding/api.ts` (verify/create)

**Tasks**:
- [ ] Verify feeding API hooks exist
- [ ] Connect FeedingKpiPage to API
- [ ] Display intake records
- [ ] Display feed lots with inventory

**Required Skills**:
```
02-frontend/react-query
02-frontend/data-grid
17-domain-specific/feeding-module
```

**Acceptance Criteria**:
- [ ] FCR, ADG displayed
- [ ] Intake records list populated
- [ ] Feed lots with inventory shown

---

### 16.6 AI Insights Page Integration

**Description**: เชื่อมต่อ AI Insights module

**Files to Modify**:
- `apps/dashboard-web/src/features/ai/pages/AiInsightsLandingPage.tsx`
- `apps/dashboard-web/src/features/ai/pages/InsightsFeedPage.tsx`
- `apps/dashboard-web/src/features/ai/pages/RecommendationsPage.tsx`
- Create: `apps/dashboard-web/src/hooks/useAiInsights.ts`

**Tasks**:
- [ ] Create useAiInsights hook
- [ ] Display insight history
- [ ] Implement generate insight form
- [ ] Display recommendations
- [ ] Add streaming response handling

**New Hook**:
```typescript
// apps/dashboard-web/src/hooks/useAiInsights.ts
export const useInsightsHistory = () => {
  const { tenantId } = useActiveContext();

  return useQuery({
    queryKey: ['ai', 'insights', 'history', tenantId],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/insights/history', {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
  });
};

export const useGenerateInsight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { prompt: string; context?: any }) => {
      const response = await apiClient.post('/api/v1/insights/generate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'insights', 'history'] });
    },
  });
};

export const useRecommendations = () => {
  const { tenantId, farmId, barnId } = useActiveContext();

  return useQuery({
    queryKey: ['ai', 'recommendations', tenantId, farmId, barnId],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/recommendations', {
        params: { tenantId, farmId, barnId },
      });
      return response.data;
    },
    enabled: !!tenantId,
  });
};
```

**Required Skills**:
```
02-frontend/react-query
06-ai-ml-production/llm-ui-patterns
02-frontend/streaming-responses
```

**Acceptance Criteria**:
- [ ] Insights history displayed
- [ ] Generate form works
- [ ] Recommendations shown
- [ ] Apply/dismiss actions work

---

### 16.7 Notifications Integration

**Description**: เชื่อมต่อ Notification system

**Files to Modify**:
- `apps/dashboard-web/src/features/notifications/pages/NotificationsPage.tsx`
- `apps/dashboard-web/src/components/notifications/NotificationBell.tsx`
- `apps/dashboard-web/src/hooks/useNotifications.ts`

**Tasks**:
- [ ] Verify useNotifications hook
- [ ] Display notification inbox
- [ ] Implement mark as read
- [ ] Update bell badge count
- [ ] Add polling for new notifications

**Required Skills**:
```
02-frontend/react-query
02-frontend/badge-components
34-real-time-features/polling
```

**Acceptance Criteria**:
- [ ] Inbox shows notifications
- [ ] Unread badge updates
- [ ] Mark as read works
- [ ] Polling refreshes list

---

### 16.8 Standards Library Integration

**Description**: เชื่อมต่อ Standards module

**Files to Modify**:
- `apps/dashboard-web/src/features/standards/pages/StandardsLibraryPage.tsx`
- `apps/dashboard-web/src/features/standards/pages/StandardsSetEditorPage.tsx`
- `apps/dashboard-web/src/features/standards/hooks/useStandards.ts`

**Tasks**:
- [ ] Verify useStandards hook
- [ ] Display standards list
- [ ] Implement CRUD operations
- [ ] Add import functionality

**Required Skills**:
```
02-frontend/react-query
02-frontend/data-grid
02-frontend/file-upload
```

**Acceptance Criteria**:
- [ ] Standards list populated
- [ ] Create/edit/delete work
- [ ] Import CSV functional

---

### 16.9 Reports Module Integration

**Description**: เชื่อมต่อ Reports module

**Files to Modify**:
- `apps/dashboard-web/src/features/reports/pages/ReportJobsPage.tsx`
- `apps/dashboard-web/src/features/reports/pages/CreateReportJobPage.tsx`
- `apps/dashboard-web/src/features/reports/hooks/useReports.ts`

**Tasks**:
- [ ] Verify useReports hook
- [ ] Display report jobs list
- [ ] Implement create report
- [ ] Add download functionality
- [ ] Show job status/progress

**Required Skills**:
```
02-frontend/react-query
02-frontend/file-download
02-frontend/polling-status
```

**Acceptance Criteria**:
- [ ] Report jobs list shown
- [ ] Create report works
- [ ] Download functional
- [ ] Progress updates

---

### 16.10 Barn Records Integration

**Description**: เชื่อมต่อ Barn Records module

**Files to Modify**:
- `apps/dashboard-web/src/features/barns/pages/BarnRecordsPage.tsx`
- `apps/dashboard-web/src/hooks/useBarnData.ts`

**Tasks**:
- [ ] Display mortality events
- [ ] Display vaccination history
- [ ] Display treatments
- [ ] Add daily counts chart
- [ ] Implement record creation

**Required Skills**:
```
02-frontend/react-query
02-frontend/recharts
17-domain-specific/barn-management
```

**Acceptance Criteria**:
- [ ] Mortality records shown
- [ ] Vaccination timeline populated
- [ ] Create record works
- [ ] Charts render data

---

## Debugging Guide

### Common Issues

1. **Data shows 0 or empty**
   - Check if tenantId is being sent
   - Verify API endpoint returns data
   - Check data mapping in hook

2. **API returns 401**
   - Token may be expired
   - Check auth interceptor
   - Verify token refresh logic

3. **API returns 404**
   - Endpoint may not exist in BFF
   - Check BFF routes
   - Coordinate with Antigravity team

4. **Context not updating**
   - Check ActiveContext provider
   - Verify context change events
   - Check queryKey includes context

### Debug Tools

```typescript
// Add to any hook for debugging
console.log('Query params:', { tenantId, farmId, barnId });
console.log('API response:', response.data);
console.log('Query state:', { data, isLoading, error });
```

---

## Deliverables Checklist

| # | Deliverable | Priority | Effort |
|---|-------------|----------|--------|
| 16.1 | Recreate Admin Queries | P0 | 6h |
| 16.2 | Dashboard Overview | P0 | 2h |
| 16.3 | Telemetry Integration | P0 | 4h |
| 16.4 | WeighVision Integration | P1 | 4h |
| 16.5 | Feeding Integration | P1 | 4h |
| 16.6 | AI Insights Integration | P1 | 6h |
| 16.7 | Notifications Integration | P1 | 3h |
| 16.8 | Standards Integration | P1 | 3h |
| 16.9 | Reports Integration | P2 | 3h |
| 16.10 | Barn Records Integration | P1 | 4h |

**Total Effort**: ~39 hours (5-6 days)

---

## Required Skills Reference

```
.agentskills/skills/
├── 02-frontend/
│   ├── react-query
│   ├── typescript-types
│   ├── data-binding
│   ├── recharts
│   ├── data-grid
│   ├── file-upload
│   ├── file-download
│   ├── polling-status
│   ├── streaming-responses
│   └── badge-components
├── 03-backend-api/
│   └── rest-client-patterns
├── 06-ai-ml-production/
│   └── llm-ui-patterns
├── 16-testing/
│   └── api-debugging
├── 17-domain-specific/
│   ├── feeding-module
│   └── barn-management
└── 34-real-time-features/
    └── polling
```

---

## Testing Requirements

- [ ] All hooks have unit tests
- [ ] Integration tests with MSW mocks
- [ ] E2E tests for critical flows
- [ ] Verify data matches seed values

---

## Evidence Requirements

- [ ] Screenshots showing real data
- [ ] Network tab showing API calls
- [ ] Console showing no errors
- [ ] Data matching seed values
