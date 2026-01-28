# Work Order: WO-001 - Admin & Dashboard Sidebar Menu Fix

**Owner**: Cursor  
**Priority**: P0 - Critical  
**Status**: Not Started  
**Created**: 2025-01-28  
**Estimated Effort**: ~8 hours  

---

## Objective

แก้ไข Sidebar menu ของทั้ง Admin-Web และ Dashboard-Web ให้แสดงเมนูครบถ้วนตาม routes ที่กำหนดไว้

---

## Prerequisites

- PHASE-16-UI-REDESIGN-PREMIUM.md completed ✅

---

## Required Skills

```
.agentskills/skills/
├── 02-frontend/
│   ├── navigation-patterns/SKILL.md
│   ├── component-patterns/SKILL.md
│   ├── accessibility-contrast/SKILL.md
│   └── keyboard-accessibility/SKILL.md
```

---

## Current Issues

### Admin-Web Sidebar (`AdminSidebar.tsx`)

**Current MENU_ITEMS (Line 39-55)**:
```tsx
const MENU_ITEMS = [
  { label: 'Overview', icon: <LayoutDashboard size={20} />, path: '/overview' },
  { label: 'Tenants', icon: <Database size={20} />, path: '/tenants' },
  { 
    label: 'Identity & Access', 
    icon: <ShieldCheck size={20} />, 
    children: [
      { label: 'Users', path: '/identity/users' },
      { label: 'SSO Config', path: '/identity/sso' },
      { label: 'Custom Roles', path: '/identity/custom-roles' },
    ] 
  },
  { label: 'Devices', icon: <Smartphone size={20} />, path: '/devices' },
  { label: 'System Health', icon: <Activity size={20} />, path: '/ops/health' },
  { label: 'Audit Log', icon: <FileText size={20} />, path: '/audit-log' },
  { label: 'Billing', icon: <CreditCard size={20} />, path: '/billing' },
];
```

**Missing Menu Items**:
- Identity: Roles (`/identity/roles`), Permission Matrix (`/identity/permission-matrix`), SCIM (`/identity/scim`)
- Ops: Sync (`/ops/sync`), MQTT (`/ops/mqtt`), Storage (`/ops/storage`), Queues (`/ops/queues`), Incidents (`/ops/incidents`)
- Settings: Quotas (`/settings/quotas`), Data Policy (`/settings/data-policy`), Notifications (`/settings/notifications`)
- Support: Impersonate (`/support/impersonate`), Context Debug (`/support/context-debug`)

---

## Deliverables

### Task 1: Update Admin Sidebar MENU_ITEMS (P0)

**File to Modify**:
- `apps/admin-web/src/layout/AdminSidebar.tsx`

**Tasks**:
- [ ] เพิ่ม menu items ที่ขาดหายไปทั้งหมด
- [ ] จัดกลุ่ม menu ให้ถูกต้อง
- [ ] เพิ่ม icons ที่เหมาะสม
- [ ] ตรวจสอบ path ตรง routes ใน App.tsx

**Updated MENU_ITEMS Structure**:
```tsx
import { 
  LayoutDashboard, Users, ShieldCheck, Settings, Database, Activity, 
  FileText, CreditCard, Smartphone, Key, Table2, Cloud, HardDrive,
  ListTodo, AlertTriangle, Gauge, UserCog, Bug, Bell, ScrollText
} from 'lucide-react';

const MENU_ITEMS = [
  // Dashboard
  { label: 'Overview', icon: <LayoutDashboard size={20} />, path: '/overview' },
  
  // Tenants Management
  { label: 'Tenants', icon: <Database size={20} />, path: '/tenants' },
  
  // Identity & Access Section
  { 
    label: 'Identity & Access', 
    icon: <ShieldCheck size={20} />, 
    children: [
      { label: 'Users', icon: <Users size={18} />, path: '/identity/users' },
      { label: 'Roles', icon: <Key size={18} />, path: '/identity/roles' },
      { label: 'Permission Matrix', icon: <Table2 size={18} />, path: '/identity/permission-matrix' },
      { label: 'SSO Config', icon: <Settings size={18} />, path: '/identity/sso' },
      { label: 'SCIM', icon: <Cloud size={18} />, path: '/identity/scim' },
      { label: 'Custom Roles', icon: <ShieldCheck size={18} />, path: '/identity/custom-roles' },
    ] 
  },
  
  // Devices
  { 
    label: 'Devices', 
    icon: <Smartphone size={20} />, 
    children: [
      { label: 'All Devices', icon: <Smartphone size={18} />, path: '/devices' },
      { label: 'Onboarding', icon: <Settings size={18} />, path: '/devices/onboarding' },
    ]
  },
  
  // Operations Section
  { 
    label: 'Operations', 
    icon: <Activity size={20} />, 
    children: [
      { label: 'System Health', icon: <Gauge size={18} />, path: '/ops/health' },
      { label: 'Sync Dashboard', icon: <Cloud size={18} />, path: '/ops/sync' },
      { label: 'MQTT Monitor', icon: <Activity size={18} />, path: '/ops/mqtt' },
      { label: 'Storage', icon: <HardDrive size={18} />, path: '/ops/storage' },
      { label: 'Queues', icon: <ListTodo size={18} />, path: '/ops/queues' },
      { label: 'Incidents', icon: <AlertTriangle size={18} />, path: '/ops/incidents' },
    ] 
  },
  
  // Settings Section
  { 
    label: 'Settings', 
    icon: <Settings size={20} />, 
    children: [
      { label: 'Tenant Quotas', icon: <Gauge size={18} />, path: '/settings/quotas' },
      { label: 'Data Policy', icon: <ScrollText size={18} />, path: '/settings/data-policy' },
      { label: 'Notifications', icon: <Bell size={18} />, path: '/settings/notifications' },
    ] 
  },
  
  // Audit & Billing
  { label: 'Audit Log', icon: <FileText size={20} />, path: '/audit-log' },
  { label: 'Billing', icon: <CreditCard size={20} />, path: '/billing' },
  
  // Support Tools Section
  { 
    label: 'Support Tools', 
    icon: <UserCog size={20} />, 
    children: [
      { label: 'Impersonate', icon: <UserCog size={18} />, path: '/support/impersonate' },
      { label: 'Context Debug', icon: <Bug size={18} />, path: '/support/context-debug' },
    ] 
  },
];
```

**Visual Styling Requirements**:
- ใช้ spacing และ padding consistent กับ current design
- Children items ควรมี indentation ที่ชัดเจน
- Active state highlight ควรทำงานถูกต้อง

**Acceptance Criteria**:
- [ ] All 28 routes มี corresponding menu item
- [ ] Active state works correctly
- [ ] Collapsed mode shows icons correctly
- [ ] Mobile drawer shows all items

---

### Task 2: Verify Dashboard Sidebar Routes (P1)

**File to Check**:
- `apps/dashboard-web/src/layout/Sidebar.tsx`
- `apps/dashboard-web/src/config/routes.tsx`

**Tasks**:
- [ ] ตรวจสอบว่า routes.tsx มี routes ครบตาม App.tsx
- [ ] ตรวจสอบว่า Sidebar render ทุก routes
- [ ] ตรวจสอบว่า Help section routes มีอยู่:
  - `/help`
  - `/user-guide`
  - `/changelog`

**Acceptance Criteria**:
- [ ] All routes visible in sidebar
- [ ] Role-based filtering works

---

### Task 3: Add Help Section to Dashboard Sidebar (P1)

**File to Modify**:
- `apps/dashboard-web/src/config/routes.tsx`
- `apps/dashboard-web/src/layout/Sidebar.tsx` (if needed)

**Tasks**:
- [ ] เพิ่ม Help section ใน routes.tsx:
```tsx
// Help & Resources Section (เพิ่มใน ROUTES array)
{
  path: '/help',
  label: 'Help Center',
  labelKey: 'nav.items.helpCenter',
  icon: <HelpCircle size={20} />,
  section: 'operations',
},
```

**Acceptance Criteria**:
- [ ] Help, User Guide, Changelog visible in sidebar
- [ ] Links navigate correctly

---

### Task 4: Test & Verify All Navigation (P0)

**Tasks**:
- [ ] Run admin-web และ click ทุก menu item
- [ ] Run dashboard-web และ click ทุก menu item
- [ ] Verify no 404 errors
- [ ] Verify correct page loads for each route
- [ ] Test collapsed/expanded sidebar states

**Testing Checklist**:

**Admin-Web Routes**:
| Route | Menu Item | Works |
|-------|-----------|-------|
| `/overview` | Overview | ☐ |
| `/tenants` | Tenants | ☐ |
| `/tenants/:id` | (click row) | ☐ |
| `/identity/users` | Users | ☐ |
| `/identity/roles` | Roles | ☐ |
| `/identity/permission-matrix` | Permission Matrix | ☐ |
| `/identity/sso` | SSO Config | ☐ |
| `/identity/scim` | SCIM | ☐ |
| `/identity/custom-roles` | Custom Roles | ☐ |
| `/devices` | Devices | ☐ |
| `/devices/onboarding` | Onboarding | ☐ |
| `/ops/health` | System Health | ☐ |
| `/ops/sync` | Sync Dashboard | ☐ |
| `/ops/mqtt` | MQTT Monitor | ☐ |
| `/ops/storage` | Storage | ☐ |
| `/ops/queues` | Queues | ☐ |
| `/ops/incidents` | Incidents | ☐ |
| `/settings/quotas` | Tenant Quotas | ☐ |
| `/settings/data-policy` | Data Policy | ☐ |
| `/settings/notifications` | Notifications | ☐ |
| `/audit-log` | Audit Log | ☐ |
| `/billing` | Billing | ☐ |
| `/support/impersonate` | Impersonate | ☐ |
| `/support/context-debug` | Context Debug | ☐ |

**Acceptance Criteria**:
- [ ] All checkboxes ☑
- [ ] No console errors
- [ ] UI looks consistent

---

## Evidence Requirements

- [ ] Screenshot of Admin sidebar with all menu items expanded
- [ ] Screenshot of Dashboard sidebar with all menu items
- [ ] Video recording of navigation test (optional)

---

## Coordination

- **Before starting**: None
- **After completion**: Notify team that menus are complete
- **Parallel with**: RooCode FE Data Integration

---

## Notes

- Keep existing hover animations and transitions
- Maintain dark theme compatibility
- Use consistent icon sizing (20px for parent, 18px for children)
- Consider adding dividers between major sections
