# Frontend Sensors Module - Information Architecture

## Purpose
Define the frontend information architecture, menu placement, routes, and page responsibilities for the Sensors module in the FarmIQ dashboard.

## Scope
- Sensor catalog management
- Sensor-device bindings
- Sensor calibration tracking
- Sensor thresholds (future/optional, may reference cloud-config-rules-service)

## Non-goals
- Telemetry visualization (handled by Telemetry module)
- Device management UI (handled by Devices menu)
- Batch/Flock management UI (handled by Barns menu)

---

## Menu Placement

Sensors module is placed under the main navigation menu:

```
- Farms
  - Farm List / Create Farm
- Barns
  - Barn List / Create Barn
  - Batches/Flocks (under Barns)
- Devices
  - Device Inventory / Status / Maintenance
- Sensors  ⬅️ NEW MODULE
  - Sensor Catalog
  - Bindings
  - Calibration
  - Thresholds (future)
- Feeding Module
  - KPI / Intake / Lots / Quality
- WeighVision
  - Sessions / Weight Trends
- Telemetry
  - Metrics Explorer / Alerts
```

**Rationale**: Sensors are closely related to devices but deserve their own menu section because:
- Sensors are first-class entities with lifecycle (calibration, bindings)
- Sensors can be managed independently of devices (e.g., before device deployment)
- Sensor catalog can be browsed without device context
- Future: Sensor thresholds and alerting may be separate workflow

---

## Canonical Routes

### Base Route Pattern
All sensor routes are under `/sensors`:

- `/sensors` - Sensor Catalog (list view)
- `/sensors/new` - Create Sensor
- `/sensors/:sensorId` - Sensor Detail View
- `/sensors/:sensorId/edit` - Edit Sensor
- `/sensors/:sensorId/bindings` - Sensor Bindings List
- `/sensors/:sensorId/bindings/new` - Create Binding
- `/sensors/:sensorId/calibrations` - Calibration History
- `/sensors/:sensorId/calibrations/new` - Add Calibration
- `/sensors/:sensorId/thresholds` - Thresholds Management (future/optional)

### Alternative Routes (Device Context)
Sensors can also be accessed from device detail pages:

- `/devices/:deviceId/sensors` - Sensors bound to device (filtered view)
- `/devices/:deviceId/sensors/:sensorId` - Sensor detail from device context

---

## Page Responsibilities

### 1. Sensor Catalog (`/sensors`)

**Purpose**: List all sensors with filtering and search capabilities.

**Required API Calls** (via BFF):
```
GET /api/v1/sensors?tenantId={tenantId}&barnId={barnId}&type={type}&enabled={enabled}&q={search}&page={page}&pageSize={pageSize}
```

**Page Components**:
- **Filters Sidebar**:
  - Barn selector (multi-select)
  - Sensor type filter (multi-select: temperature, humidity, pressure, etc.)
  - Enabled/Disabled toggle
  - Search box (searches label and sensorId)
- **Table**:
  - Columns: Sensor ID, Label, Type, Unit, Barn, Zone, Status (enabled/disabled), Last Calibration Date, Actions
  - Sortable by: Label, Type, Last Calibration Date
  - Row actions: View, Edit, Disable/Enable
- **Pagination**: Bottom pagination controls
- **Actions**: "Create Sensor" button (top right)

**Context Dependencies**:
- Requires tenant context (from auth/JWT)
- Optional: barn context (if navigating from barn detail page)

**Empty State**:
- Message: "No sensors found. Create your first sensor to get started."
- Action: "Create Sensor" button

**Error State**:
- Display error message from API
- Retry button

**RBAC Gating**:
- View: All authenticated users (viewer+)
- Create/Edit: tenant_admin, farm_manager (hide "Create Sensor" button if insufficient permissions)

---

### 2. Create/Edit Sensor (`/sensors/new`, `/sensors/:sensorId/edit`)

**Purpose**: Create new sensor or edit existing sensor metadata.

**Required API Calls** (via BFF):
- Create: `POST /api/v1/sensors` (with Idempotency-Key)
- Edit: `GET /api/v1/sensors/:sensorId?tenantId={tenantId}`, `PATCH /api/v1/sensors/:sensorId`

**Page Components**:
- **Form**:
  - Sensor ID (text input, required, disabled on edit)
  - Type (dropdown: temperature, humidity, pressure, weight, flow, level, co2, nh3, o2, ph, conductivity, other)
  - Unit (text input, required, e.g., "C", "F", "%", "Pa", "kg")
  - Label (text input, optional)
  - Barn (dropdown with search, optional)
  - Zone (text input, optional)
  - Enabled (toggle, default: true)
- **Actions**: "Save" button, "Cancel" link

**Validation**:
- Sensor ID: Required, alphanumeric + dash/underscore, max 255 chars
- Type: Required
- Unit: Required, max 10 chars
- Label: Optional, max 255 chars
- Zone: Optional, max 100 chars

**Success Flow**:
- Create: Redirect to `/sensors/:sensorId`
- Edit: Redirect to `/sensors/:sensorId`

**Error Handling**:
- Display validation errors inline
- Display API errors (409 conflict, 422 validation) at top of form

**RBAC Gating**:
- Requires: tenant_admin or farm_manager
- If insufficient permissions: Redirect to `/sensors` with error message

---

### 3. Sensor Detail (`/sensors/:sensorId`)

**Purpose**: View sensor details, bindings, and calibration history.

**Required API Calls** (via BFF):
- `GET /api/v1/sensors/:sensorId?tenantId={tenantId}`
- `GET /api/v1/sensors/:sensorId/bindings?tenantId={tenantId}&page=1&pageSize=10`
- `GET /api/v1/sensors/:sensorId/calibrations?tenantId={tenantId}&page=1&pageSize=10` (if endpoint exists)

**Page Components**:
- **Header**:
  - Sensor Label (or Sensor ID if no label)
  - Status badge (Enabled/Disabled)
  - Actions: Edit, Disable/Enable
- **Tabs**:
  1. **Overview**:
     - Basic info: Sensor ID, Type, Unit, Label, Barn, Zone, Status
     - Current binding (if exists): Device, Protocol, Channel, Sampling Rate, Effective Dates
     - Latest calibration: Method, Offset, Gain, Performed At, Performed By, Notes
  2. **Bindings** (`/sensors/:sensorId/bindings`):
     - Table: Binding ID, Device, Protocol, Channel, Effective From, Effective To, Status
     - Actions: "Create Binding" button
  3. **Calibration History** (`/sensors/:sensorId/calibrations`):
     - Table: Calibration ID, Method, Offset, Gain, Performed At, Performed By, Notes
     - Actions: "Add Calibration" button
  4. **Thresholds** (`/sensors/:sensorId/thresholds`) - Future/Optional:
     - Display threshold rules (if cloud-config-rules-service integration exists)
     - Link to config-rules-service UI if separate

**Context Dependencies**:
- Requires tenant context
- Sensor must exist and be accessible to tenant

**Empty States**:
- No bindings: "No bindings found. Create a binding to connect this sensor to a device."
- No calibrations: "No calibration history. Add a calibration to track sensor adjustments."

**Error State**:
- 404: "Sensor not found" message, link back to `/sensors`
- Other errors: Display error message, retry button

**RBAC Gating**:
- View: All authenticated users (viewer+)
- Edit/Disable: tenant_admin, farm_manager
- Create binding/calibration: tenant_admin, farm_manager

---

### 4. Create Binding (`/sensors/:sensorId/bindings/new`)

**Purpose**: Create sensor-device binding.

**Required API Calls** (via BFF):
- `GET /api/v1/devices?tenantId={tenantId}` (for device dropdown)
- `POST /api/v1/sensors/:sensorId/bindings` (with Idempotency-Key)

**Page Components**:
- **Form**:
  - Binding ID (text input, required)
  - Device (dropdown with search, required)
  - Protocol (dropdown: mqtt, modbus, analog, serial, http, required)
  - Channel (text input, optional, help text: "Protocol-specific: MQTT topic suffix, Modbus register, Analog pin, etc.")
  - Sampling Rate (number input, optional, unit: seconds)
  - Effective From (date/time picker, required, default: now)
  - Effective To (date/time picker, optional, help text: "Leave empty for ongoing binding")
  - Enabled (toggle, default: true)
- **Actions**: "Save" button, "Cancel" link

**Validation**:
- Binding ID: Required, alphanumeric + dash/underscore, max 255 chars
- Device: Required, must exist in tenant
- Protocol: Required
- Channel: Optional, max 255 chars
- Sampling Rate: Optional, integer >= 0
- Effective To: Must be > Effective From if provided

**Overlap Check**:
- Before save, check if binding would overlap with existing active binding
- Display warning/error if overlap detected
- Option to close existing binding first

**Success Flow**:
- Redirect to `/sensors/:sensorId/bindings`

**Error Handling**:
- 409 Conflict (overlap): Display error message with suggestion to close existing binding
- Validation errors: Display inline

**RBAC Gating**:
- Requires: tenant_admin or farm_manager

---

### 5. Calibration History (`/sensors/:sensorId/calibrations`)

**Purpose**: View and add calibration records.

**Required API Calls** (via BFF):
- `GET /api/v1/sensors/:sensorId/calibrations?tenantId={tenantId}&page={page}&pageSize={pageSize}` (if endpoint exists)
- `POST /api/v1/sensors/:sensorId/calibrations` (with Idempotency-Key)

**Page Components**:
- **Header**: "Calibration History" title, "Add Calibration" button
- **Table**:
  - Columns: Performed At, Method, Offset, Gain, Performed By, Notes
  - Sortable by: Performed At (desc by default)
  - Pagination
- **Add Calibration Form** (modal or inline):
  - Calibration ID (text input, required)
  - Method (dropdown: two-point, zero-span, single-point, other, required)
  - Offset (number input, required, step: 0.0001)
  - Gain (number input, required, min: 0.0001, step: 0.0001)
  - Performed At (date/time picker, required, default: now)
  - Performed By (text input, optional, auto-fill from current user)
  - Notes (textarea, optional)

**Validation**:
- Calibration ID: Required, alphanumeric + dash/underscore, max 255 chars
- Method: Required
- Offset: Required, numeric
- Gain: Required, numeric > 0
- Performed By: Optional, max 255 chars
- Notes: Optional, max 1000 chars

**Success Flow**:
- After add: Refresh table, show success message
- Modal closes (if modal form)

**Error Handling**:
- Validation errors: Display inline
- 409 Conflict: Display error message

**RBAC Gating**:
- View: All authenticated users (viewer+)
- Add: tenant_admin, farm_manager

---

## Context Dependencies

### Tenant Context
- All pages require tenant context (from JWT token claims)
- `tenantId` is extracted from JWT, not user input

### Barn Context (Optional)
- Sensor catalog can filter by barn if navigating from barn detail page
- Pass `barnId` as query param or route param

### Device Context (Optional)
- Device detail page can link to sensors bound to that device
- Filter bindings by `deviceId`

---

## RBAC Expectations

### Viewer Role
- ✅ View sensor catalog
- ✅ View sensor details
- ✅ View bindings
- ✅ View calibration history
- ❌ Create/edit sensors
- ❌ Create/edit bindings
- ❌ Add calibrations

### House Operator Role
- ✅ Same as viewer
- ❌ Write operations (no changes from viewer)

### Farm Manager Role
- ✅ All viewer permissions
- ✅ Create/edit sensors (assigned farms/barns only)
- ✅ Create/edit bindings (assigned farms/barns only)
- ✅ Add calibrations (assigned farms/barns only)
- ⚠️ Scope limited to assigned farms/barns

### Tenant Admin Role
- ✅ All permissions
- ✅ Create/edit sensors (tenant-wide)
- ✅ Create/edit bindings (tenant-wide)
- ✅ Add calibrations (tenant-wide)

### Platform Admin Role
- ✅ All permissions across all tenants

---

## BFF Integration Pattern

**Important**: Frontend **must** call BFF only, never call tenant-registry directly.

### BFF Proxy Endpoints (TODO)
BFF must expose proxy endpoints for all sensor endpoints:
- `GET /api/v1/sensors` → proxy to `cloud-tenant-registry`
- `POST /api/v1/sensors` → proxy to `cloud-tenant-registry`
- `GET /api/v1/sensors/:sensorId` → proxy to `cloud-tenant-registry`
- `PATCH /api/v1/sensors/:sensorId` → proxy to `cloud-tenant-registry`
- `POST /api/v1/sensors/:sensorId/bindings` → proxy to `cloud-tenant-registry`
- `GET /api/v1/sensors/:sensorId/bindings` → proxy to `cloud-tenant-registry`
- `POST /api/v1/sensors/:sensorId/calibrations` → proxy to `cloud-tenant-registry`
- `GET /api/v1/sensors/:sensorId/calibrations` → proxy to `cloud-tenant-registry` (if implemented)

**BFF Requirements**:
- Propagate `Authorization`, `x-tenant-id`, `x-request-id`, `x-trace-id` headers
- Enforce RBAC in BFF (do not trust frontend)
- Map errors to standard error envelope
- Include `requestId` and `traceId` in responses

**Implementation Status**: 
- ⚠️ **TODO**: BFF proxy endpoints must be implemented before frontend work begins

---

## Future Enhancements

1. **Thresholds Management**:
   - If `cloud-config-rules-service` exposes sensor threshold APIs, integrate here
   - Otherwise, document as future enhancement

2. **Bulk Operations**:
   - Bulk create sensors (CSV import)
   - Bulk enable/disable sensors
   - Bulk calibration updates

3. **Sensor Analytics**:
   - Link to telemetry visualization filtered by sensor
   - Show calibration impact on readings

4. **Device Context Integration**:
   - From device detail page, show all bound sensors
   - Quick actions: bind sensor, view calibration status

---

## Checklist Counter
- Mermaid diagrams: 0/0 (not required for FE doc)
- Endpoint rows: 0/0 (documented in contract doc)
- DB tables documented: 0/0 (documented in service design doc)
- DB column rows: 0/0
- Example sets: 0/0 (examples in contract doc)
- Open questions: 1/1 (BFF proxy implementation)

