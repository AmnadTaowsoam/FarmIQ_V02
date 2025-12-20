# Multi-Tenant & RBAC

**Purpose**: Define tenant isolation principles, role definitions, context management, and audit requirements for the Dashboard.  
**Scope**: RBAC model, permission matrix, context propagation, and security defaults.  
**Owner**: FarmIQ Security Team  
**Last updated**: 2025-01-20  

---

## Tenant Isolation Principles

### Data Isolation
- **Strict isolation**: All data MUST be scoped by `tenant_id`. No cross-tenant data access.
- **BFF enforcement**: BFF validates `tenant_id` from JWT claims against query parameter `tenant_id`.
- **Database level**: All database queries MUST include `tenant_id` filter (enforced at ORM/query level).

### Access Control
- **JWT claims**: User's accessible tenants are encoded in JWT token (`tenant_ids: ["uuid1", "uuid2"]`).
- **Validation**: BFF validates user has access to requested `tenant_id` before processing request.
- **Default**: If user has single tenant, auto-select that tenant. If multiple, require explicit selection.

---

## Role Definitions

### Platform Admin
**Description**: System owner with full platform access.

**Permissions**:
- ✅ Create/manage tenants
- ✅ View all tenants (cross-tenant access)
- ✅ Manage platform-level configuration
- ✅ View platform-level ops metrics
- ✅ Access audit logs (all tenants)

**Restrictions**:
- Cannot access tenant-specific business data without tenant context
- Cannot modify tenant data (tenant admins manage their own data)

---

### Tenant Admin
**Description**: Farm owner with full access to their tenant.

**Permissions**:
- ✅ Create/manage farms, barns, devices within tenant
- ✅ Manage users and roles within tenant
- ✅ Configure alert rules and thresholds
- ✅ View all tenant data (all farms/barns)
- ✅ Export data and generate reports
- ✅ Access tenant-scoped audit logs
- ✅ Configure feed plans and target weights

**Restrictions**:
- Cannot create tenants (platform_admin only)
- Cannot access other tenants' data
- Cannot modify platform-level configuration

---

### Farm Manager
**Description**: Veterinarian or farm manager with operational access.

**Permissions**:
- ✅ View all farm/barn data within tenant
- ✅ Acknowledge/resolve alerts
- ✅ View telemetry, sessions, analytics
- ✅ View recommendations and run scenarios
- ✅ Export data (read-only)
- ✅ Configure operational thresholds (within limits set by tenant_admin)

**Restrictions**:
- Cannot create farms/barns/devices
- Cannot manage users
- Cannot configure tenant-level settings
- Cannot access admin pages

---

### Operator
**Description**: Farm hand with read-only operational access.

**Permissions**:
- ✅ View telemetry and sensor data
- ✅ View WeighVision sessions (metadata only, no images unless permitted)
- ✅ View alerts (read-only, cannot acknowledge)
- ✅ View barn/device status

**Restrictions**:
- Cannot acknowledge alerts
- Cannot view feeding/FCR data
- Cannot view AI insights/recommendations
- Cannot export data
- Cannot access admin pages

---

### Viewer
**Description**: Auditor or guest with minimal read-only access.

**Permissions**:
- ✅ View overview dashboard (read-only)
- ✅ View farms/barns list (read-only)
- ✅ View telemetry trends (read-only)
- ✅ View WeighVision sessions (metadata only, no images)

**Restrictions**:
- Cannot view detailed device data
- Cannot view alerts
- Cannot view feeding/FCR data
- Cannot view AI insights
- Cannot export data
- Cannot access admin pages

---

## Permission Matrix

| Action | Platform Admin | Tenant Admin | Farm Manager | Operator | Viewer |
|--------|:--------------:|:------------:|:------------:|:--------:|:------:|
| **Create Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create Farm** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Barn** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Onboard Device** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Users** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Telemetry** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Sessions** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Images** | ✅ | ✅ | ✅* | ✅* | ❌ |
| **Acknowledge Alert** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Configure Thresholds** | ✅ | ✅ | ✅** | ❌ | ❌ |
| **View Feeding/FCR** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View AI Insights** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Run Scenarios** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Export Data** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Ops Metrics** | ✅ | ✅*** | ❌ | ❌ | ❌ |
| **View Audit Log** | ✅ | ✅*** | ❌ | ❌ | ❌ |

\* Requires explicit image access permission (may be restricted by tenant policy)  
\** Within limits set by tenant_admin  
\*** Tenant-scoped only

---

## Context Management

### Active Context Storage
**Frontend Storage**:
- **React Context/Redux**: Store active `tenant_id`, `farm_id`, `barn_id` in application state
- **URL Params**: Include context in query params for deep linking: `?tenant_id=...&farm_id=...&barn_id=...`
- **Local Storage**: Persist last selected context in `localStorage` for user convenience

**Example**:
```typescript
{
  tenant_id: "uuid",
  farm_id: "uuid",
  barn_id: "uuid",
  batch_id: "uuid" // optional
}
```

---

### Context Propagation to BFF
**Query Parameters** (required):
- Always include `tenant_id` in query params
- Include `farm_id`, `barn_id`, `batch_id` when context is selected

**Headers** (do NOT use):
- Do NOT send context in headers (BFF validates from query params)

**Example Request**:
```
GET /api/v1/telemetry/readings?tenant_id=xxx&farm_id=yyy&barn_id=zzz&start_time=...
Headers:
  Authorization: Bearer <token>
  x-request-id: <uuid>
```

---

### Context Validation
**BFF Validation**:
1. Extract `tenant_id` from query params
2. Validate `tenant_id` exists in JWT claims (`tenant_ids` array)
3. Validate user has access to `farm_id`/`barn_id` (if provided)
4. Return `403 Forbidden` if validation fails

**Frontend Validation**:
- On page load, validate user has access to selected context
- Redirect to `/select-context` if context is invalid
- Show error message if user lacks access

---

## Audit Requirements

### Admin Actions (Must Audit)
All admin actions MUST be logged:
- **Tenant creation/modification**: Who created/modified tenant, when, what changed
- **Farm/Barn creation/modification**: Who created/modified, when, what changed
- **Device onboarding**: Who onboarded device, when, device details
- **User management**: Who created/modified/deactivated user, when, role changes
- **Permission changes**: Who granted/revoked permissions, when, what permissions
- **Configuration changes**: Who changed thresholds, alert rules, feed plans, when

### Audit Log Fields
```json
{
  "audit_id": "uuid",
  "timestamp": "2025-12-20T10:00:00Z",
  "user_id": "uuid",
  "user_email": "admin@example.com",
  "event_type": "update",
  "resource_type": "farm",
  "resource_id": "uuid",
  "resource_name": "Farm A",
  "action_details": {
    "field": "status",
    "old_value": "inactive",
    "new_value": "active"
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

### Audit Access
- **Platform Admin**: Can view all audit logs (all tenants)
- **Tenant Admin**: Can view tenant-scoped audit logs only
- **Others**: Cannot access audit logs

---

## Safe Defaults (Least Privilege)

### Default Permissions
- **New users**: Assigned `viewer` role by default (minimal access)
- **New tenants**: No farms/barns/devices by default (tenant_admin must create)
- **New devices**: Inactive status by default (must be activated by admin)

### Permission Escalation
- **Explicit grant**: Permissions must be explicitly granted (no inheritance)
- **Role hierarchy**: Roles are independent (no automatic escalation)
- **Time-limited**: Consider time-limited permissions for sensitive operations (future)

---

## Image Access Permissions

### Default Policy
- **Default**: Users can view session metadata but NOT images
- **Image access**: Requires explicit permission (role-based or tenant policy)

### Permission Levels
- **No access**: Cannot view images (default for `viewer`, `operator`)
- **Metadata only**: Can view session metadata but not images
- **Full access**: Can view images (requires `farm_manager`+ role and explicit permission)

### Tenant Policy Override
- **Tenant Admin**: Can configure tenant-level image access policy
- **Override roles**: Can grant image access to specific roles/users
- **Audit**: All image access is logged (who viewed what image, when)

---

## Related Documentation

- [Information Architecture](01-information-architecture.md): Context selector and navigation
- [Page Specifications](02-page-specs.md): Permission requirements per page
- [BFF API Contracts](04-bff-api-contracts.md): Context propagation in API calls

