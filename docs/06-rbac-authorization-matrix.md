Purpose: Define the FarmIQ RBAC authorization matrix for platform, tenant, and farm operations.  
Scope: Roles, domains, and read/write permissions used by cloud + edge APIs.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-18  

---

# RBAC Authorization Matrix

This document is the **project-specific** authorization matrix referenced by `docs/shared/04-security-compliance-mapping.md`.

## Roles

- **`platform_admin`**: Platform-wide administration across all tenants (internal ops).
- **`tenant_admin`**: Full control within a single tenant.
- **`farm_manager`**: Operational control for one or more farms/barns within a tenant.
- **`house_operator`**: Day-to-day operations for assigned barns/houses (limited administrative scope).
- **`viewer`**: Read-only visibility for assigned scope.
- **`device_agent`**: Machine identity used by edge services and IoT agents (no human UI permissions).

## Domains (permission areas)

- **Tenant registry**: tenants, farms, barns, houses, devices, provisioning state.
- **Telemetry**: telemetry ingestion, querying, aggregations.
- **WeighVision sessions**: session lifecycle, weights, inference results, session queries.
- **Media**: presigned upload issuance, media metadata, retrieval, retention operations.
- **Analytics**: dashboards, reports, derived insights, exports.

## Matrix

Legend: ✅ allowed, ❌ not allowed, ⚠️ allowed with constraints (see notes)

| Role | Tenant registry (R) | Tenant registry (W) | Telemetry (R) | Telemetry (W) | WeighVision (R) | WeighVision (W) | Media (R) | Media (W) | Analytics (R) | Analytics (W) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `platform_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tenant_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `farm_manager` | ✅ | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ |
| `house_operator` | ✅ | ❌ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ❌ |
| `viewer` | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| `device_agent` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ⚠️ | ❌ | ❌ |

## Notes and constraints

### Scope constraints (⚠️)

- **`farm_manager`** write scope is limited to **assigned farms/barns** (not tenant-wide).
- **`house_operator`** write scope is limited to **assigned barns/houses** and only operational actions (e.g., annotate a session, request reprocessing).

### Device agent constraints (⚠️)

- **IoT agents MUST NOT** call business APIs for telemetry/sessions over HTTP.
  - Device → edge ingestion is **MQTT-only** (see `docs/iot-layer/03-mqtt-topic-map.md`).
  - The only allowed device HTTP calls are for **media upload via presigned URL** (see `docs/shared/01-api-standards.md`).
- `device_agent` may request a presigned upload URL and upload media bytes, but must not list arbitrary media objects or read other tenants' media.

### Enforcement guidance

- Enforce tenant and farm/barn scope in the authorization middleware (tenant is mandatory for all human roles).
- All write operations SHOULD be audited (actor id, role, tenant, resource id, action, trace id).
- Prefer explicit permissions (domain + action) over implicit role checks when implementing new APIs.

