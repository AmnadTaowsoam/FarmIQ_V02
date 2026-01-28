# Admin-Web: Page Implementation Work Order

## Objective

ทำให้ `apps/admin-web` ทุกหน้าทำงานได้อย่างสมบูรณ์ โดยปัจจุบันหลายหน้ายังเป็น Placeholder (`<div>`) ทั้งที่มีไฟล์ Page อยู่แล้ว

---

## Current State Analysis

### File Structure
- **Location**: `D:\FarmIQ\FarmIQ_V02\apps\admin-web\src`
- **Pages Folder**: `src/features/admin/pages/` (27 files)
- **App.tsx**: Routes defined but many use placeholder `<div>` instead of actual components

### Pages Status

| # | Route | Page File | Status |
|---|-------|-----------|--------|
| 1 | `/overview` | AdminOverviewPage.tsx | ✅ Integrated |
| 2 | `/tenants` | AdminTenantsPage.tsx | ✅ Integrated |
| 3 | `/tenants/:tenantId` | TenantDetailPage.tsx | ❌ Placeholder |
| 4 | `/identity/users` | AdminUsersPage.tsx | ✅ Integrated |
| 5 | `/identity/users/:userId` | UserDetailPage.tsx | ❌ Placeholder |
| 6 | `/identity/roles` | RolesPage.tsx | ❌ Placeholder |
| 7 | `/identity/permission-matrix` | PermissionMatrixPage.tsx | ❌ Placeholder |
| 8 | `/identity/sso` | SsoConfigurationPage.tsx | ✅ Integrated |
| 9 | `/identity/scim` | ScimConfigurationPage.tsx | ✅ Integrated |
| 10 | `/identity/custom-roles` | CustomRolesPage.tsx | ✅ Integrated |
| 11 | `/settings/quotas` | TenantQuotasPage.tsx | ✅ Integrated |
| 12 | `/billing` | BillingDashboardPage.tsx | ✅ Integrated |
| 13 | `/ops/sync` | SyncDashboardPage.tsx | ❌ Placeholder |
| 14 | `/ops/mqtt` | MqttMonitoringPage.tsx | ❌ Placeholder |
| 15 | `/ops/storage` | StorageDashboardPage.tsx | ❌ Placeholder |
| 16 | `/ops/queues` | QueueMonitoringPage.tsx | ❌ Placeholder |
| 17 | `/ops/incidents` | IncidentsPage.tsx | ❌ Placeholder |
| 18 | `/ops/health` | SystemHealthPage.tsx | ❌ Placeholder |
| 19 | `/devices` | AdminDevicesPage.tsx | ✅ Integrated |
| 20 | `/devices/:deviceId` | DeviceDetailPage.tsx | ❌ Placeholder |
| 21 | `/devices/onboarding` | DeviceOnboardingPage.tsx | ❌ Placeholder |
| 22 | `/audit-log` | AdminAuditPage.tsx | ❌ Placeholder |
| 23 | `/audit-log/:auditId` | AuditDetailPage.tsx | ❌ Placeholder |
| 24 | `/settings/data-policy` | DataPolicyPage.tsx | ❌ Placeholder |
| 25 | `/settings/notifications` | NotificationsPage.tsx | ❌ Placeholder |
| 26 | `/support/impersonate` | ImpersonatePage.tsx | ❌ Placeholder |
| 27 | `/support/context-debug` | ContextDebugPage.tsx | ❌ Placeholder |
| 28 | `/403` | (none) | ❌ Placeholder |

---

## Tasks

### Task 1: Wire Up Existing Pages (Priority: HIGH)

Update `App.tsx` to use `React.lazy()` for all existing page files instead of placeholder `<div>` elements.

**Files to modify:**
- `src/App.tsx`

**Pattern to follow (copy from existing):**
```tsx
const TenantDetailPage = React.lazy(async () => {
  try {
    const module = await import('./features/admin/pages/TenantDetailPage');
    return { default: module.TenantDetailPage };
  } catch (e: any) {
    return { default: () => <div>Tenant Detail (Error: {String(e)})</div> };
  }
});
```

**Pages to wire up (18 total):**
1. TenantDetailPage → `/tenants/:tenantId`
2. UserDetailPage → `/identity/users/:userId`
3. RolesPage → `/identity/roles`
4. PermissionMatrixPage → `/identity/permission-matrix`
5. SyncDashboardPage → `/ops/sync`
6. MqttMonitoringPage → `/ops/mqtt`
7. StorageDashboardPage → `/ops/storage`
8. QueueMonitoringPage → `/ops/queues`
9. IncidentsPage → `/ops/incidents`
10. SystemHealthPage → `/ops/health`
11. DeviceDetailPage → `/devices/:deviceId`
12. DeviceOnboardingPage → `/devices/onboarding`
13. AdminAuditPage → `/audit-log`
14. AuditDetailPage → `/audit-log/:auditId`
15. DataPolicyPage → `/settings/data-policy`
16. NotificationsPage → `/settings/notifications`
17. ImpersonatePage → `/support/impersonate`
18. ContextDebugPage → `/support/context-debug`

---

### Task 2: Verify Page Exports (Priority: MEDIUM)

Ensure each page file has a named export matching what `App.tsx` expects.

**Check pattern:**
```tsx
// Each page should have:
export const PageName: React.FC = () => { ... };
// OR
export function PageName() { ... }
```

---

### Task 3: Create 403 Page (Priority: LOW)

Create a proper 403 Forbidden page component.

**File to create:** `src/features/admin/pages/ForbiddenPage.tsx`

---

### Task 4: Build Verification (Priority: HIGH)

After changes, run:
```bash
cd D:\FarmIQ\FarmIQ_V02\apps\admin-web
npm run build
```

Fix any TypeScript or import errors that appear.

---

## Acceptance Criteria

1. ✅ All 27 routes render their corresponding page components (no placeholder `<div>`)
2. ✅ `npm run build` completes without errors
3. ✅ Each page is wrapped in `<Suspense>` with a loading fallback
4. ✅ All pages respect `RoleGuard` access control

---

## Notes

- Use the same error-handling pattern as existing lazy imports
- Keep existing `RoleGuard` configurations
- Do not modify page content logic, only wire up routes
