# Dashboard Information Architecture

**Purpose**: Define the global navigation, route map, context selector rules, and page grouping for the FarmIQ Dashboard.  
**Scope**: Navigation structure, context hierarchy, page organization, and role-based visibility.  
**Owner**: FarmIQ Frontend Team  
**Last updated**: 2025-01-20  

---

## Global Navigation

### Top Navigation Bar
- **Logo** (left): Links to Overview page
- **Context Selector** (center): Tenant → Farm → Barn dropdown
- **User Menu** (right): User name, role badge, logout
- **Notifications** (right): Alert count badge, notification center

### Sidebar Navigation (Collapsible)
- Overview
- Farms
- Barns
- WeighVision
- Sensors
- Feeding & FCR
- Reference Standards
- AI Insights
- Alerts
- Reports & Export
- Ops (ops-facing only)
- Admin (admin-only)

---

## Route Map

### Public Routes
- `/login` - Login page
- `/logout` - Logout handler
- `/403` - Access denied page
- `/404` - Not found page
- `/500` - Server error page
- `/maintenance` - Maintenance mode page

### Authenticated Routes (Require Login)
- `/` - Overview (redirects to tenant selection if no context)
- `/select-context` - Tenant/Farm/Barn selection
- `/overview` - Dashboard overview
- `/farms` - Farms list
- `/farms/:farmId` - Farm detail
- `/barns` - Barns list
- `/barns/:barnId` - Barn detail (ops cockpit)
- `/devices` - Devices list
- `/devices/:deviceId` - Device detail
- `/telemetry` - Telemetry explorer
- `/standards` - Reference standards library
- `/standards/sets/:setId` - Standard set details/editor
- `/standards/targets/new` - Target builder (admin)
- `/standards/import` - Import CSV (admin)
- `/weighvision/sessions` - WeighVision sessions list
- `/weighvision/sessions/:sessionId` - Session detail
- `/weighvision/analytics` - Weight analytics dashboard
- `/weighvision/distribution` - Size distribution analysis
- `/sensors/matrix` - Sensor matrix (barn-level)
- `/sensors/trends` - Sensor trends & correlation
- `/feeding/daily` - Daily feed intake
- `/feeding/fcr` - FCR & forecast
- `/ai/anomalies` - Anomalies & early warnings
- `/ai/recommendations` - AI recommendations
- `/ai/scenario` - Scenario planner
- `/alerts` - Alerts center
- `/reports` - Reports & export
- `/ops/data-quality` - Data quality & coverage
- `/ops/health` - Ops health monitor
- `/admin/tenants` - Tenant registry (platform_admin only)
- `/admin/devices` - Device onboarding (admin only)
- `/admin/users` - Users & roles (admin only)
- `/admin/audit` - Audit log (admin only)

---

## Context Selector Rules

### Context Hierarchy
1. **Tenant** (required): User must select a tenant they have access to.
2. **Farm** (optional): User can select a farm within the tenant.
3. **Barn** (optional): User can select a barn within the farm.
4. **Batch/Species** (optional): User can filter by batch/species within barn context.
5. **Time Range** (required for time-series pages): Default to "Last 7 days", user can adjust.

### Context Persistence
- **Storage**: Store active context in React Context/Redux state.
- **URL params**: Include context in query params for deep linking: `?tenant_id=...&farm_id=...&barn_id=...`
- **Local storage**: Persist last selected context (tenant/farm/barn) in `localStorage` for user convenience.
- **Validation**: On page load, validate user has access to selected context. Redirect to `/select-context` if invalid.

### Context Propagation to BFF
- **Query params**: Always include `tenant_id` in query params.
- **Optional params**: Include `farm_id`, `barn_id`, `batch_id` when context is selected.
- **Headers**: Do NOT send context in headers (use query params only for BFF validation).

### Deep Linking Rules
- **Supported**: All pages support deep linking with context in URL params.
- **Example**: `/barns/:barnId?tenant_id=xxx&farm_id=yyy`
- **Validation**: On navigation, validate context access. Show error if user lacks permission.

---

## Page Grouping

### 1. Overview
**Purpose**: Executive and operational overview dashboard.

**Pages**:
- Overview (executive + ops KPIs)

**User Questions**:
- What is the overall health of my farms?
- Are there any critical alerts?
- What are the key metrics today?

**Roles**: All authenticated users.

---

### 2. Farms / Barns
**Purpose**: Farm and barn management and monitoring.

**Pages**:
- Farms list
- Farm detail
- Barns list
- Barn detail (ops cockpit)

**User Questions**:
- What farms do I have access to?
- What is the status of a specific farm/barn?
- What devices are in this barn?

**Roles**: All authenticated users (view), Tenant Admin/Farm Manager (edit).

---

### 3. WeighVision
**Purpose**: WeighVision session management and analytics.

**Pages**:
- Sessions list
- Session detail
- Weight analytics dashboard
- Size distribution analysis
- Model/Drift monitoring (future)

**User Questions**:
- What are the recent weight measurements?
- What is the weight distribution in this batch?
- How accurate are the predictions?

**Roles**: All authenticated users (view), Farm Manager (acknowledge).

---

### 4. Sensors
**Purpose**: Sensor telemetry visualization and analysis.

**Pages**:
- Sensor matrix (barn-level latest values)
- Sensor trends & correlation

**User Questions**:
- What are the current sensor readings?
- How do temperature and humidity correlate?
- Are there any sensor anomalies?

**Roles**: All authenticated users.

---

### 5. Feeding & FCR
**Purpose**: Feed intake tracking and Feed Conversion Ratio analysis.

**Pages**:
- Daily feed intake
- FCR & forecast

**User Questions**:
- How much feed was consumed today?
- What is the current FCR?
- When will this batch reach market weight?

**Roles**: Farm Manager, Operator (view), Tenant Admin (edit thresholds).

---

### 6. Reference Standards
**Purpose**: Manage reference/standard/target master data that drives operational targets and limits.

**Pages**:
- Standards Library (list/filter sets)
- Set Details / Editor (metadata + rows)
- Target Builder (clone + adjust)
- Import CSV (validate + commit)

**User Questions**:
- What reference benchmark are we using?
- What is our tenant baseline standard?
- How are farm/barn targets adjusted and which one is active?

**Roles**: All authenticated users (view), Tenant Admin/Platform Admin (write/import/adjust).

---

### 7. AI Insights
**Purpose**: AI-driven insights, anomalies, and recommendations.

**Pages**:
- Anomalies & early warnings
- Recommendations (AI Coach)
- Scenario planner (what-if)

**User Questions**:
- Are there any anomalies I should investigate?
- What actions should I take?
- What if I adjust the feed formula?

**Roles**: Farm Manager, Operator (view), Tenant Admin (configure).

---

### 8. Alerts
**Purpose**: Alert management and notification center.

**Pages**:
- Alerts center

**User Questions**:
- What alerts are active?
- What alerts need my attention?

**Roles**: All authenticated users (view), Farm Manager+ (acknowledge).

---

### 9. Reports & Export
**Purpose**: Data export and KPI reporting.

**Pages**:
- Reports & export

**User Questions**:
- Can I export data for analysis?
- Can I generate a KPI report?

**Roles**: Farm Manager+ (export), Tenant Admin (full access).

---

### 9. Ops
**Purpose**: Operational monitoring and troubleshooting (ops-facing).

**Pages**:
- Data quality & coverage
- Ops health monitor

**User Questions**:
- Is data syncing correctly from edge?
- Are there any ingestion errors?
- What is the device uptime?

**Roles**: Platform Admin, Tenant Admin (limited).

---

### 10. Admin
**Purpose**: System administration and configuration (admin-only).

**Pages**:
- Tenant registry (platform_admin only)
- Device onboarding
- Users & roles (RBAC)
- Audit log

**User Questions**:
- How do I onboard a new device?
- Who has access to what?
- What changes were made?

**Roles**: Platform Admin (all), Tenant Admin (tenant-scoped admin).

---

## Role-Based Visibility

### Platform Admin
- **Visible**: All pages (including platform-level admin).
- **Hidden**: Nothing.

### Tenant Admin
- **Visible**: All pages except platform-level admin (tenant registry).
- **Hidden**: Platform-level admin pages.

### Farm Manager
- **Visible**: Overview, Farms/Barns, WeighVision, Sensors, Feeding/FCR, AI Insights, Alerts, Reports.
- **Hidden**: Ops pages, Admin pages.

### Operator
- **Visible**: Overview, Farms/Barns (view), WeighVision (view), Sensors, Alerts (view).
- **Hidden**: Feeding/FCR, AI Insights, Reports, Ops, Admin.

### Viewer
- **Visible**: Overview (read-only), Farms/Barns (read-only), WeighVision (read-only), Sensors (read-only).
- **Hidden**: All edit/action pages, Alerts (no acknowledge), Reports, Ops, Admin.

---

## Navigation Patterns

### Breadcrumbs
- Show breadcrumb trail: `Home > Farms > Farm Name > Barns > Barn Name`
- Make each breadcrumb clickable (deep link to that context).

### Back Navigation
- Browser back button: Preserve context in URL params.
- In-app back button: Navigate to parent context (e.g., from Barn detail → Barns list).

### Quick Actions
- **Context menu**: Right-click on resources (farms, barns, devices) for quick actions.
- **Keyboard shortcuts**: 
  - `Ctrl+K` / `Cmd+K`: Global search
  - `Ctrl+,` / `Cmd+,`: Settings
  - `Esc`: Close modals/drawers

---

## Related Documentation

- [Page Specifications](02-page-specs.md): Detailed page specifications.
- [Multi-Tenant & RBAC](06-multi-tenant-and-rbac.md): Role definitions and permissions.
- [BFF API Contracts](04-bff-api-contracts.md): API endpoints for navigation and data.

