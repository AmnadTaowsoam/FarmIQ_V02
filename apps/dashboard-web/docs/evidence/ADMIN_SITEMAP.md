# Admin Console Sitemap Documentation

## Overview

The FarmIQ Admin Console provides a comprehensive administrative interface for managing tenants, users, devices, and system operations. This document describes the admin sitemap structure, routes, permissions, and extension guidelines.

## Route Structure

The admin console is organized into 8 major sections:

### 1. Admin Overview (`/admin/overview`)
**Purpose**: System-wide dashboard with metrics and health monitoring  
**Permissions**: `platform_admin`, `tenant_admin`  
**Features**:
- Total counts (tenants, farms, barns, devices)
- Device online/offline status
- Data freshness indicators
- Top alerts
- System health snapshot (API, Database, MQTT, Storage)

### 2. Governance (`/admin/governance`)
**Purpose**: Tenant and topology management  
**Permissions**: `platform_admin` only

#### Routes:
- `/admin/tenants` - Tenant list with filters and search
- `/admin/tenants/new` - Create new tenant (planned)
- `/admin/tenants/:tenantId` - Tenant detail with tabs (planned)

### 3. Identity & Access (`/admin/identity`)
**Purpose**: User, role, and permission management  
**Permissions**: `platform_admin`, `tenant_admin`

#### Routes:
- `/admin/identity/users` - User list with filters
- `/admin/identity/users/:userId` - User detail (planned)
- `/admin/identity/roles` - Role management (planned)
- `/admin/identity/permission-matrix` - Permission matrix view (planned)
- `/admin/identity/sso` - SSO configuration (planned)

### 4. Fleet Management (`/admin/fleet`)
**Purpose**: Global device inventory and onboarding  
**Permissions**: `platform_admin`, `tenant_admin`

#### Routes:
- `/admin/devices` - Global device list with filters
- `/admin/devices/onboarding` - Device enrollment (planned)
- `/admin/devices/:deviceId` - Device detail with tabs (planned)

### 5. Operations (`/admin/operations`)
**Purpose**: System health and operational monitoring  
**Permissions**: `platform_admin`, `tenant_admin`

#### Routes:
- `/admin/ops/health` - System health dashboard (planned)
- `/admin/ops/edge-clusters` - Edge cluster monitoring (planned)
- `/admin/ops/sync` - Sync status (planned)
- `/admin/ops/mqtt` - MQTT broker monitoring (planned)
- `/admin/ops/queues` - Message queue monitoring (planned)
- `/admin/ops/storage` - Storage usage (planned)
- `/admin/ops/incidents` - Incident tracking (planned)

### 6. Compliance (`/admin/compliance`)
**Purpose**: Audit logging and compliance  
**Permissions**: `platform_admin`, `tenant_admin`

#### Routes:
- `/admin/audit-log` - Global audit log with filters
- `/admin/audit-log/:auditId` - Audit entry detail (planned)
- `/admin/access-reviews` - Access review workflow (planned)
- `/admin/data-export` - Data export requests (planned)

### 7. Settings (`/admin/settings`)
**Purpose**: System-wide configuration  
**Permissions**: `platform_admin`, `tenant_admin`

#### Routes (all planned):
- `/admin/settings/data-policy` - Data retention policies
- `/admin/settings/notifications` - Notification configuration
- `/admin/settings/localization` - Language and regional settings
- `/admin/settings/api-keys` - API key management

### 8. Support (`/admin/support`)
**Purpose**: Support tools and debugging  
**Permissions**: `platform_admin`

#### Routes (all planned):
- `/admin/support/impersonate` - User impersonation
- `/admin/support/context-debug` - Context debugging (includes Developer Override)
- `/admin/support/runbooks` - Runbook links and diagnostics

## Permission Model

### Admin Roles

The admin console uses an RBAC (Role-Based Access Control) system with the following roles:

| Role | Description | Mapped From |
|------|-------------|-------------|
| `SUPER_ADMIN` | Full system access | `platform_admin` |
| `TENANT_ADMIN` | Tenant-scoped management | `tenant_admin` |
| `OPS_ADMIN` | Operations focus | `tenant_admin` |
| `AUDITOR` | Audit and compliance only | `viewer` (with audit access) |
| `SUPPORT` | Support and debugging | `platform_admin` |
| `READ_ONLY` | View-only access | `viewer` |

### Permission Scopes

Permissions are organized by resource type:

- **Tenant**: `view`, `create`, `edit`, `delete`
- **User**: `view`, `create`, `edit`, `delete`, `impersonate`
- **Device**: `view`, `create`, `edit`, `delete`, `onboard`, `configure`
- **Operations**: `view`, `manage`, `health`, `sync`, `incidents`
- **Audit**: `view`, `export`
- **Settings**: `view`, `edit`
- **Support**: `debug`, `runbooks`

### Using Permission Gates

```typescript
import { PermissionGate } from '../guards/PermissionGate';
import { Permission } from '../lib/permissions';

// Route protection
<PermissionGate permission={Permission.TENANT_CREATE}>
  <CreateTenantPage />
</PermissionGate>

// UI element protection
<PermissionGate 
  mode="ui" 
  permission={Permission.TENANT_DELETE}
  showTooltip
>
  <Button>Delete Tenant</Button>
</PermissionGate>
```

## API Client Architecture

### Mock Data Strategy

The admin API client (`src/api/admin/adminApiClient.ts`) uses a mock-first approach for UI development:

- **Environment Variable**: `VITE_USE_ADMIN_MOCKS` (defaults to `true`)
- **Mock Data**: Realistic data generators in `src/api/admin/mockAdminData.ts`
- **TODO Comments**: All endpoints marked with `// TODO: Replace with real API endpoint`

### TanStack Query Integration

All API calls use TanStack Query hooks (`src/api/admin/adminQueries.ts`):

```typescript
import { useTenants, useCreateTenant } from '../../../api/admin/adminQueries';

// In component
const { data, isLoading } = useTenants({ page, pageSize, search });
const createMutation = useCreateTenant();
```

## Reusable Components

### AdminPageHeader
Consistent page header with breadcrumbs, title, subtitle, and actions.

```typescript
<AdminPageHeader
  title="Tenant Management"
  subtitle="Manage tenants and configurations"
  actions={<Button>Create Tenant</Button>}
/>
```

### AdminDataTable
Enhanced data table with server-side pagination, URL-synced filters, and bulk actions.

```typescript
<AdminDataTable
  columns={columns}
  rows={data?.data || []}
  loading={isLoading}
  totalRows={data?.total}
  searchPlaceholder="Search tenants..."
  filters={filters}
  onFilterChange={setFilters}
  syncUrlParams
/>
```

### StatCard
Metric display card with trend indicators.

```typescript
<StatCard
  label="Total Tenants"
  value={42}
  icon={<Building2 />}
  trend={{ direction: 'up', value: '+12%' }}
  color="primary"
/>
```

### HealthBadge
Color-coded health status indicator.

```typescript
<HealthBadge status="healthy" showIcon />
<HealthBadge status="degraded" label="Offline" />
```

### StatusPill
Inline status indicator.

```typescript
<StatusPill label="Active" color="success" />
<StatusPill label="Pending" color="warning" variant="outlined" />
```

## Extension Guidelines

### Adding a New Admin Page

1. **Create Page Component**:
   ```bash
   # Create in src/features/admin/pages/
   touch src/features/admin/pages/NewAdminPage.tsx
   ```

2. **Add Route to `routes.tsx`**:
   ```typescript
   {
     path: '/admin/new-section/page',
     label: 'New Page',
     icon: <Icon size={18} />,
     requiredRoles: ['platform_admin'],
   }
   ```

3. **Add Route to `App.tsx`**:
   ```typescript
   <Route path="admin/new-section/page" element={
     <RoleGuard allowedRoles={['platform_admin']}>
       <NewAdminPage />
     </RoleGuard>
   } />
   ```

4. **Use Reusable Components**:
   ```typescript
   import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
   import { AdminDataTable } from '../../../components/admin/AdminDataTable';
   ```

### Adding a New Permission

1. **Define Permission** in `src/lib/permissions.ts`:
   ```typescript
   export enum Permission {
     // ... existing
     NEW_RESOURCE_VIEW = 'new_resource:view',
   }
   ```

2. **Add to Role Mapping**:
   ```typescript
   const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
     [AdminRole.SUPER_ADMIN]: [
       // ... existing
       Permission.NEW_RESOURCE_VIEW,
     ],
   };
   ```

3. **Use in Components**:
   ```typescript
   <PermissionGate permission={Permission.NEW_RESOURCE_VIEW}>
     <NewResourcePage />
   </PermissionGate>
   ```

### Adding a New API Endpoint

1. **Add Mock Data Generator** in `src/api/admin/mockAdminData.ts`:
   ```typescript
   export function generateMockNewResource(count: number) {
     // ... implementation
   }
   ```

2. **Add API Method** in `src/api/admin/adminApiClient.ts`:
   ```typescript
   async getNewResources(): Promise<NewResource[]> {
     // TODO: Replace with real API endpoint: GET /api/admin/new-resources
     if (USE_MOCKS) {
       await this.delay();
       return generateMockNewResource(50);
     }
     const response = await this.client.get('/api/admin/new-resources');
     return response.data;
   }
   ```

3. **Add TanStack Query Hook** in `src/api/admin/adminQueries.ts`:
   ```typescript
   export function useNewResources() {
     return useQuery({
       queryKey: ['admin', 'new-resources'],
       queryFn: () => adminApiClient.getNewResources(),
       staleTime: 60 * 1000,
     });
   }
   ```

## Navigation Structure

The admin sidebar is organized hierarchically:

```
Admin
├── Admin Overview
├── Governance
│   └── Tenants
├── Identity & Access
│   ├── Users
│   └── Roles
├── Fleet
│   ├── Devices
│   └── Device Onboarding
├── Operations
│   └── System Health
└── Compliance
    └── Audit Log
```

## URL Patterns

- List pages: `/admin/section/resource` (e.g., `/admin/identity/users`)
- Detail pages: `/admin/section/resource/:id` (e.g., `/admin/identity/users/123`)
- Create pages: `/admin/section/resource/new` (e.g., `/admin/tenants/new`)
- Nested resources: `/admin/section/resource/:id/subsection` (e.g., `/admin/tenants/123/farms`)

## State Management

- **URL Sync**: Filters, pagination, and sort state synced to URL query params
- **Query Cache**: TanStack Query manages server state with 30-60s stale time
- **Local State**: React useState for UI-only state (modals, selections)

## Accessibility

All admin pages implement:
- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels and roles
- Focus management
- Screen reader support
- High contrast mode compatibility

## Responsive Design

Admin pages are optimized for:
- Desktop: 1920x1080, 1366x768
- Tablet: 1024x768 (limited support)
- Mobile: Not supported (admin console is desktop-only)

## Future Enhancements

Planned features marked with "(planned)" in route listings:
- Tenant detail tabs (topology, farms, barns, policies, features, integrations, audit)
- User detail tabs (profile, access scopes, effective permissions, sessions)
- Device detail tabs (overview, connectivity, assignments, config, telemetry, events, actions)
- All Operations section pages
- All Settings section pages
- All Support section pages
- Permission matrix visualization
- SSO configuration UI
- Device onboarding with QR codes
- Access review workflows
- Data export requests

## Troubleshooting

### Mock Data Not Loading
Check `VITE_USE_ADMIN_MOCKS` environment variable. Set to `false` to use real API endpoints.

### Permission Denied Errors
Verify user roles in `AuthContext`. Check `PermissionGate` configuration and role mappings in `src/lib/permissions.ts`.

### Route Not Found
Ensure route is added to both `src/config/routes.tsx` and `src/App.tsx`. Check for typos in path names.

### TypeScript Errors
Run `npm run typecheck` to identify type issues. Ensure all imports are correct and types are properly defined.

## Support

For questions or issues with the admin console:
1. Check this documentation
2. Review implementation plan in `C:\Users\amnad\.gemini\antigravity\brain\9edc7ba5-1868-41ab-b9d5-8f0af52d9bdc\implementation_plan.md`
3. Examine existing admin pages for patterns
4. Consult reusable component documentation in component files
