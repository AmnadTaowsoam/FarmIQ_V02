# Work Order: WO-001 - Admin Page Wire-Up & Data Integration

**Owner**: RooCode  
**Priority**: P0 - Critical  
**Status**: Not Started  
**Created**: 2025-01-28  
**Estimated Effort**: ~20 hours  

---

## Objective

แก้ไขปัญหาทั้งหมดของ Admin-Web และ Dashboard-Web ให้สมบูรณ์ 100%:

1. Wire up all admin pages ที่ยังเป็น placeholder
2. สร้าง adminQueries.ts ที่ถูกลบไป
3. เชื่อมต่อข้อมูลจาก BE ให้แสดงถูกต้อง
4. แก้ไข pages ที่แสดง error

---

## Prerequisites

- WO-001-BACKEND-FRONTEND-INTEGRATION-FIX.md (Antigravity) - Recommended to complete first
- WO-001-SIDEBAR-MENU-FIX.md (Cursor) - Can be parallel

---

## Required Skills

```
.agentskills/skills/
├── 02-frontend/
│   ├── react-query/SKILL.md
│   ├── typescript-types/SKILL.md
│   ├── data-binding/SKILL.md
│   ├── recharts/SKILL.md
│   ├── data-grid/SKILL.md
│   ├── skeleton-loading/SKILL.md
│   └── empty-state-design/SKILL.md
├── 03-backend-api/
│   └── rest-client-patterns/SKILL.md
├── 16-testing/
│   └── frontend-testing/SKILL.md
└── 17-domain-specific/
    └── admin-ui-patterns/SKILL.md
```

---

## Current State Analysis

### Admin-Web App.tsx Analysis

`App.tsx` มี React.lazy imports สำหรับทุก pages แต่บาง pages อาจยังไม่ทำงานถูกต้อง:

**Pages with React.lazy (already wired)**:
| Page | Import Status | Works? |
|------|--------------|--------|
| AdminOverviewPage | ✅ Lazy | ❓ Needs verification |
| AdminTenantsPage | ✅ Lazy | ❓ Needs verification |
| AdminUsersPage | ✅ Lazy | ❓ Needs verification |
| AdminDevicesPage | ✅ Lazy | ❓ Needs verification |
| SsoConfigurationPage | ✅ Lazy | ❓ Needs verification |
| ScimConfigurationPage | ✅ Lazy | ❓ Needs verification |
| CustomRolesPage | ✅ Lazy | ❓ Needs verification |
| TenantQuotasPage | ✅ Lazy | ❓ Needs verification |
| BillingDashboardPage | ✅ Lazy | ❓ Needs verification |
| TenantDetailPage | ✅ Lazy | ❓ |
| UserDetailPage | ✅ Lazy | ❓ |
| RolesPage | ✅ Lazy | ❓ |
| PermissionMatrixPage | ✅ Lazy | ❓ |
| SyncDashboardPage | ✅ Lazy | ❓ |
| MqttMonitoringPage | ✅ Lazy | ❓ |
| StorageDashboardPage | ✅ Lazy | ❓ |
| QueueMonitoringPage | ✅ Lazy | ❓ |
| IncidentsPage | ✅ Lazy | ❓ |
| SystemHealthPage | ✅ Lazy | ❓ |
| DeviceDetailPage | ✅ Lazy | ❓ |
| DeviceOnboardingPage | ✅ Lazy | ❓ |
| AdminAuditPage | ✅ Lazy | ❓ |
| AuditDetailPage | ✅ Lazy | ❓ |
| DataPolicyPage | ✅ Lazy | ❓ |
| NotificationsPage | ✅ Lazy | ❓ |
| ImpersonatePage | ✅ Lazy | ❓ |
| ContextDebugPage | ✅ Lazy | ❓ |
| ForbiddenPage | ✅ Lazy | ❓ |

### Critical Missing: Admin API Queries

`apps/admin-web/src/api/admin/` directory needs:
- `adminQueries.ts` - React Query hooks
- `types.ts` - TypeScript interfaces

---

## Deliverables

### Task 1: Create Admin API Types (P0)

**File to Create**:
- `apps/admin-web/src/api/admin/types.ts`

**Content**:
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
    api: HealthStatus;
    database: HealthStatus;
    mqtt: HealthStatus;
    storage: HealthStatus;
  };
}

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  updatedAt: string;
  farmsCount: number;
  usersCount: number;
  barnsCount: number;
  devicesCount: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  tenantName: string;
  lastLogin: string | null;
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
}

export interface Device {
  id: string;
  serialNumber: string;
  type: 'gateway' | 'sensor' | 'camera';
  tenantId: string;
  tenantName: string;
  farmId: string | null;
  barnId: string | null;
  status: 'online' | 'offline';
  lastSeen: string | null;
  firmwareVersion: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  tenantId: string;
}

export interface SystemHealth {
  service: string;
  status: HealthStatus;
  uptime: number;
  lastCheck: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**Acceptance Criteria**:
- [ ] All types compile without errors
- [ ] Types match expected API response structure

---

### Task 2: Create Admin API Queries (P0)

**File to Create**:
- `apps/admin-web/src/api/admin/adminQueries.ts`

**Content**:
```typescript
// apps/admin-web/src/api/admin/adminQueries.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { 
  OverviewStats, 
  Tenant, 
  User, 
  Device, 
  AuditEvent,
  SystemHealth,
  PaginatedResponse 
} from './types';

// ============ Overview Stats ============
export const useOverviewStats = () => {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async (): Promise<OverviewStats> => {
      const response = await apiClient.get('/api/v1/admin/overview');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
};

// ============ Tenants ============
export interface TenantQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const useTenantsQuery = (params?: TenantQueryParams) => {
  return useQuery({
    queryKey: ['admin', 'tenants', params],
    queryFn: async (): Promise<PaginatedResponse<Tenant>> => {
      const response = await apiClient.get('/api/v1/admin/tenants', { params });
      return response.data;
    },
  });
};

export const useTenantById = (tenantId: string) => {
  return useQuery({
    queryKey: ['admin', 'tenants', tenantId],
    queryFn: async (): Promise<Tenant> => {
      const response = await apiClient.get(`/api/v1/admin/tenants/${tenantId}`);
      return response.data;
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tenant> }) => {
      const response = await apiClient.patch(`/api/v1/admin/tenants/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', id] });
    },
  });
};

// ============ Users ============
export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  search?: string;
  status?: string;
}

export const useUsersQuery = (params?: UserQueryParams) => {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async (): Promise<PaginatedResponse<User>> => {
      const response = await apiClient.get('/api/v1/admin/users', { params });
      return response.data;
    },
  });
};

export const useUserById = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get(`/api/v1/admin/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });
};

// ============ Devices ============
export interface DeviceQueryParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  status?: 'online' | 'offline';
  type?: string;
}

export const useDevicesQuery = (params?: DeviceQueryParams) => {
  return useQuery({
    queryKey: ['admin', 'devices', params],
    queryFn: async (): Promise<PaginatedResponse<Device>> => {
      const response = await apiClient.get('/api/v1/devices', { params });
      return response.data;
    },
  });
};

export const useDeviceById = (deviceId: string) => {
  return useQuery({
    queryKey: ['admin', 'devices', deviceId],
    queryFn: async (): Promise<Device> => {
      const response = await apiClient.get(`/api/v1/devices/${deviceId}`);
      return response.data;
    },
    enabled: !!deviceId,
  });
};

// ============ System Health ============
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async (): Promise<SystemHealth[]> => {
      const response = await apiClient.get('/api/v1/ops/health');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// ============ Audit Logs ============
export interface AuditQueryParams {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  userId?: string;
  tenantId?: string;
  action?: string;
}

export const useAuditLogs = (params?: AuditQueryParams) => {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: async (): Promise<PaginatedResponse<AuditEvent>> => {
      const response = await apiClient.get('/api/v1/audit/events', { params });
      return response.data;
    },
  });
};

export const useAuditById = (auditId: string) => {
  return useQuery({
    queryKey: ['admin', 'audit', auditId],
    queryFn: async (): Promise<AuditEvent> => {
      const response = await apiClient.get(`/api/v1/audit/events/${auditId}`);
      return response.data;
    },
    enabled: !!auditId,
  });
};
```

**Acceptance Criteria**:
- [ ] All hooks compile without errors
- [ ] Hooks can be imported in pages
- [ ] QueryClient configured correctly

---

### Task 3: Create Index Exports (P0)

**File to Create**:
- `apps/admin-web/src/api/admin/index.ts`

**Content**:
```typescript
// apps/admin-web/src/api/admin/index.ts
export * from './types';
export * from './adminQueries';
```

**Acceptance Criteria**:
- [ ] Can import from `@/api/admin`

---

### Task 4: Verify AdminOverviewPage Data Binding (P0)

**File to Modify (if needed)**:
- `apps/admin-web/src/features/admin/pages/AdminOverviewPage.tsx`

**Tasks**:
- [ ] ตรวจสอบว่าใช้ `useOverviewStats` hook
- [ ] Map data to KPI cards correctly
- [ ] Add loading skeleton
- [ ] Add error state

**Expected Implementation Pattern**:
```tsx
// In AdminOverviewPage.tsx
import { useOverviewStats } from '../../../api/admin';

export const AdminOverviewPage: React.FC = () => {
  const { data, isLoading, error } = useOverviewStats();

  if (isLoading) return <OverviewSkeleton />;
  if (error) return <ErrorState message="Failed to load overview" />;

  return (
    <Box>
      <Typography variant="h4">Platform Overview</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard 
            title="Total Tenants" 
            value={data?.totalTenants ?? 0}
            icon={<Building2 />}
          />
        </Grid>
        {/* ... more cards */}
      </Grid>
    </Box>
  );
};
```

**Acceptance Criteria**:
- [ ] KPIs show real data
- [ ] Loading state shown
- [ ] Error state handles failures

---

### Task 5: Verify Tenant Pages Data Binding (P0)

**Files to Verify/Modify**:
- `apps/admin-web/src/features/admin/pages/AdminTenantsPage.tsx`
- `apps/admin-web/src/features/admin/pages/TenantDetailPage.tsx`

**Tasks**:
- [ ] ใช้ `useTenantsQuery` hook
- [ ] Display tenant list with pagination
- [ ] Implement search/filter
- [ ] Navigate to detail page on row click
- [ ] Detail page shows tenant info

**Acceptance Criteria**:
- [ ] Tenant list populated
- [ ] Pagination works
- [ ] Search works
- [ ] Detail page shows data

---

### Task 6: Verify User Pages Data Binding (P0)

**Files to Verify/Modify**:
- `apps/admin-web/src/features/admin/pages/AdminUsersPage.tsx`
- `apps/admin-web/src/features/admin/pages/UserDetailPage.tsx`

**Tasks**:
- [ ] ใช้ `useUsersQuery` hook
- [ ] Display user list with pagination
- [ ] Filter by tenant
- [ ] Detail page shows user info

**Acceptance Criteria**:
- [ ] User list populated
- [ ] Tenant filter works
- [ ] Detail page shows data

---

### Task 7: Verify Device Pages Data Binding (P0)

**Files to Verify/Modify**:
- `apps/admin-web/src/features/admin/pages/AdminDevicesPage.tsx`
- `apps/admin-web/src/features/admin/pages/DeviceDetailPage.tsx`
- `apps/admin-web/src/features/admin/pages/DeviceOnboardingPage.tsx`

**Tasks**:
- [ ] ใช้ `useDevicesQuery` hook
- [ ] Display device list with status filter
- [ ] Detail page shows device info
- [ ] Onboarding wizard works

**Acceptance Criteria**:
- [ ] Device list populated
- [ ] Status filter works
- [ ] Detail page shows data

---

### Task 8: Verify Ops Pages Data Binding (P1)

**Files to Verify/Modify**:
- `apps/admin-web/src/features/admin/pages/SystemHealthPage.tsx`
- `apps/admin-web/src/features/admin/pages/SyncDashboardPage.tsx`
- `apps/admin-web/src/features/admin/pages/MqttMonitoringPage.tsx`
- `apps/admin-web/src/features/admin/pages/StorageDashboardPage.tsx`
- `apps/admin-web/src/features/admin/pages/QueueMonitoringPage.tsx`
- `apps/admin-web/src/features/admin/pages/IncidentsPage.tsx`

**Tasks**:
- [ ] ใช้ `useSystemHealth` hook
- [ ] Display service health cards
- [ ] Show real-time metrics (polling)
- [ ] Display incidents list

**Acceptance Criteria**:
- [ ] Health status cards show correctly
- [ ] Auto-refresh working
- [ ] Historical data displayed

---

### Task 9: Verify Audit Pages Data Binding (P1)

**Files to Verify/Modify**:
- `apps/admin-web/src/features/admin/pages/AdminAuditPage.tsx`
- `apps/admin-web/src/features/admin/pages/AuditDetailPage.tsx`

**Tasks**:
- [ ] ใช้ `useAuditLogs` hook
- [ ] Display audit log list
- [ ] Date range filter
- [ ] Detail page shows event details

**Acceptance Criteria**:
- [ ] Audit list populated
- [ ] Date filter works
- [ ] Detail page shows metadata

---

### Task 10: Verify Identity Pages Data Binding (P1)

**Files to Verify/Modify**:
- `apps/admin-web/src/features/admin/pages/RolesPage.tsx`
- `apps/admin-web/src/features/admin/pages/PermissionMatrixPage.tsx`
- `apps/admin-web/src/features/admin/pages/SsoConfigurationPage.tsx`
- `apps/admin-web/src/features/admin/pages/ScimConfigurationPage.tsx`
- `apps/admin-web/src/features/admin/pages/CustomRolesPage.tsx`

**Tasks**:
- [ ] Each page shows relevant data
- [ ] CRUD operations work (if applicable)
- [ ] SSO providers list shows
- [ ] Permission matrix displays correctly

**Acceptance Criteria**:
- [ ] All identity pages functional
- [ ] No hardcoded/mock data

---

### Task 11: Build & Test (P0)

**Commands**:
```bash
cd D:\FarmIQ\FarmIQ_V02\apps\admin-web
npm run build
npm run dev

# Open browser and test each page
```

**Tasks**:
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No runtime errors in console
- [ ] All pages render correctly

**Test Checklist**:
| Route | Loads | Shows Data | No Errors |
|-------|-------|------------|-----------|
| `/overview` | ☐ | ☐ | ☐ |
| `/tenants` | ☐ | ☐ | ☐ |
| `/identity/users` | ☐ | ☐ | ☐ |
| `/identity/roles` | ☐ | ☐ | ☐ |
| `/devices` | ☐ | ☐ | ☐ |
| `/ops/health` | ☐ | ☐ | ☐ |
| `/audit-log` | ☐ | ☐ | ☐ |
| `/billing` | ☐ | ☐ | ☐ |

**Acceptance Criteria**:
- [ ] All checkboxes ☑
- [ ] No console errors
- [ ] No white screens

---

## Related Work Orders

- **ADMIN-WEB-PAGE-FIX.md** - Previous work order (may be superseded)
- **PHASE-16-FE-DATA-INTEGRATION.md** - Dashboard-web integration (do separately)

---

## Evidence Requirements

- [ ] Screenshot of admin-web overview with real data
- [ ] Screenshot of tenants list with data
- [ ] Screenshot of users list with data
- [ ] Console showing no errors

---

## Coordination

- **Depends on**: Antigravity's WO-001 (API endpoints)
- **Parallel with**: Cursor's WO-001 (Sidebar menus)
- **Next step**: PHASE-16-FE-DATA-INTEGRATION.md for dashboard-web

---

## Notes

- If API returns 404, check with Antigravity on endpoint status
- Use mock data temporarily if API not ready (but mark as TODO)
- Prioritize P0 tasks first
- Test in browser after each change
