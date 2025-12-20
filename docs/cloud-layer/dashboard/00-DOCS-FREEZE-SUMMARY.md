# Dashboard Documentation Pack - Freeze Summary

**Purpose**: Single source of truth summary for Dashboard documentation pack.  
**Scope**: Complete inventory of pages, endpoints, and implementation status.  
**Owner**: FarmIQ Doc Captain  
**Last updated**: 2025-01-20  
**Status**: ✅ DOCUMENTATION COMPLETE

---

## Documentation Pack Structure

The Dashboard documentation pack consists of 10 comprehensive documents:

1. **[00-dashboard-expanded-scope.md](00-dashboard-expanded-scope.md)**: Purpose, goals, commercial-scale assumptions, FE-to-BFF principle
2. **[01-information-architecture.md](01-information-architecture.md)**: Global navigation, route map, context selector, page grouping
3. **[02-page-specs.md](02-page-specs.md)**: Detailed specifications for all 26+ dashboard pages
4. **[03-data-requirements-and-computation.md](03-data-requirements-and-computation.md)**: Data sources, canonical IDs, computation responsibilities
5. **[04-bff-api-contracts.md](04-bff-api-contracts.md)**: Complete BFF API endpoint definitions
6. **[05-kpi-metrics-definitions.md](05-kpi-metrics-definitions.md)**: Formulas, units, aggregation rules
7. **[06-multi-tenant-and-rbac.md](06-multi-tenant-and-rbac.md)**: Role definitions, permission matrix, audit requirements
8. **[07-ops-observability-ux.md](07-ops-observability-ux.md)**: Data freshness, sync monitoring, troubleshooting UX
9. **[08-ml-analytics-roadmap.md](08-ml-analytics-roadmap.md)**: ML data collection, export formats, implementation phases
10. **[09-acceptance-checklist.md](09-acceptance-checklist.md)**: Comprehensive testing checklist

---

## Standard Terminology

All documentation uses consistent terminology:

| Term | Definition | Example |
|------|------------|---------|
| **Tenant** | Top-level organizational unit (multi-tenant isolation boundary) | "Farm Company Ltd" |
| **Farm** | Physical farm location within a tenant | "Farm A - Bangkok" |
| **Barn** | Barn/structure within a farm | "Barn 1 - Broiler House" |
| **Batch** | Group of animals/birds (optional grouping within barn) | "Batch 2025-01" |
| **Species** | Type of livestock (chicken, pig, etc.) | "broiler", "layer" |
| **Device** | Physical sensor gateway or WeighVision station | "Sensor Gateway 1" |
| **Session** | WeighVision measurement session | "Session UUID" |
| **Station** | WeighVision station ID (device subtype) | "Station A" |

**Canonical IDs**:
- `tenant_id`: UUID v7
- `farm_id`: UUID v7
- `barn_id`: UUID v7
- `batch_id`: UUID v7 (optional)
- `device_id`: UUID v7
- `station_id`: UUID v7 (optional, for WeighVision)
- `session_id`: UUID v7

---

## Page Inventory

### Total Pages: 29

#### Public Routes (1)
1. `/login` - Login/Authentication

#### Context Selection (3)
2. `/select-context` - Context selection (Tenant/Farm/Barn)
3. `/select-tenant` - Tenant selection (legacy route)
4. `/select-farm` - Farm selection (legacy route)

#### Main Dashboard Routes (9)
5. `/overview` - Dashboard overview (executive + ops KPIs)
6. `/farms` - Farms list
7. `/farms/:farmId` - Farm detail
8. `/barns` - Barns list
9. `/barns/:barnId` - Barn detail (ops cockpit)
10. `/devices` - Devices list
11. `/devices/:deviceId` - Device detail
12. `/telemetry` - Telemetry explorer
13. `/settings` - Settings page

#### WeighVision Routes (4)
14. `/weighvision/sessions` - WeighVision sessions list
15. `/weighvision/sessions/:sessionId` - Session detail
16. `/weighvision/analytics` - Weight analytics dashboard
17. `/weighvision/distribution` - Size distribution analysis

#### Sensor Routes (2)
18. `/sensors/matrix` - Sensor matrix (barn-level latest values)
19. `/sensors/trends` - Sensor trends & correlation

#### Feeding & FCR Routes (2)
20. `/feeding/daily` - Daily feed intake
21. `/feeding/fcr` - FCR & forecast

#### AI Insights Routes (3)
22. `/ai/anomalies` - Anomalies & early warnings
23. `/ai/recommendations` - AI recommendations (AI Coach)
24. `/ai/scenario` - Scenario planner (what-if)

#### Other Routes (3)
25. `/alerts` - Alerts center
26. `/reports` - Reports & export
27. `/ops/data-quality` - Data quality & coverage (ops-facing)
28. `/ops/health` - Ops health monitor

#### Admin Routes (4)
29. `/admin/tenants` - Tenant registry (platform_admin only)
30. `/admin/devices` - Device onboarding/mapping
31. `/admin/users` - Users & roles (RBAC)
32. `/admin/audit` - Audit log

#### Error Routes (3)
- `/403` - Access denied
- `/404` - Not found
- `/500` - Server error

---

## BFF API Endpoint Inventory

### Total Endpoints: 28

#### Authentication Endpoints (3)
1. `POST /api/v1/auth/login` - User login
2. `POST /api/v1/auth/refresh` - Token refresh
3. `GET /api/v1/auth/me` - Get current user profile

**Status**: All **NEW** (implemented in `cloud-identity-access`, proxied via BFF)

---

#### Registry Endpoints (7)
4. `GET /api/v1/registry/tenants` - List accessible tenants
5. `GET /api/v1/registry/farms` - List farms
6. `GET /api/v1/registry/farms/:farmId` - Farm detail (registry)
7. `GET /api/v1/registry/barns` - List barns
8. `GET /api/v1/registry/barns/:barnId` - Barn detail (registry)
9. `GET /api/v1/registry/devices` - List devices
10. `GET /api/v1/registry/devices/:deviceId` - Device detail (registry)

**Status**: All **NEW** (must proxy from `cloud-tenant-registry`)

---

#### Dashboard Endpoints (4)
11. `GET /api/v1/dashboard/overview` - Overview KPIs
12. `GET /api/v1/dashboard/farms/:farmId` - Farm dashboard (aggregated)
13. `GET /api/v1/dashboard/barns/:barnId` - Barn dashboard (aggregated)
14. `GET /api/v1/alerts` - Alerts list

**Status**: 
- ✅ **EXISTING** (4/4) - Implemented in `cloud-api-gateway-bff`

---

#### Telemetry Endpoints (2)
15. `GET /api/v1/telemetry/readings` - Query time-series telemetry
16. `GET /api/v1/telemetry/latest` - Latest sensor values (sensor matrix)

**Status**: All **NEW** (must proxy from `cloud-telemetry-service`)

---

#### WeighVision Endpoints (3)
17. `GET /api/v1/weighvision/sessions` - List sessions
18. `GET /api/v1/weighvision/sessions/:sessionId` - Session detail
19. `GET /api/v1/weighvision/analytics` - Weight analytics

**Status**: All **NEW** (must aggregate from cloud services)

---

#### Feeding & FCR Endpoints (2)
20. `GET /api/v1/feeding/daily` - Daily feed intake
21. `GET /api/v1/feeding/fcr` - FCR & forecast

**Status**: All **NEW** (must aggregate from analytics service)

---

#### Analytics/AI Endpoints (2)
22. `GET /api/v1/analytics/anomalies` - Anomalies list
23. `GET /api/v1/analytics/recommendations` - Recommendations list

**Status**: All **NEW** (must proxy from `cloud-analytics-service`)

---

#### Ops Endpoints (2)
24. `GET /api/v1/ops/data-quality` - Data quality metrics
25. `GET /api/v1/ops/sync-status` - Sync state from edge

**Status**: All **NEW** (must aggregate from multiple services)

---

#### Reports & Export Endpoints (2)
26. `GET /api/v1/reports/:reportId` - Report status
27. `GET /api/v1/export/:exportId` - Export status

**Status**: All **NEW**

---

#### Admin Endpoints (3)
28. `GET /api/v1/admin/users` - List users (RBAC)
29. `GET /api/v1/admin/audit` - Audit log

**Status**: All **NEW** (must proxy from `cloud-identity-access`)

---

### Endpoint Status Summary

| Status | Count | Percentage |
|--------|-------|------------|
| **EXISTING** | 4 | 14% |
| **NEW** | 25 | 86% |
| **Total** | 29 | 100% |

---

## NEW Endpoints to Implement (Priority Order)

### Priority 1: Core Functionality (MVP Required)
1. `GET /api/v1/registry/tenants` - Context selection
2. `GET /api/v1/registry/farms?tenant_id=...` - Farms list
3. `GET /api/v1/registry/barns?tenant_id=...&farm_id=...` - Barns list
4. `GET /api/v1/registry/devices?tenant_id=...` - Devices list
5. `GET /api/v1/telemetry/readings?tenant_id=...` - Telemetry data
6. `GET /api/v1/weighvision/sessions?tenant_id=...` - Sessions list
7. `GET /api/v1/weighvision/sessions/:sessionId?tenant_id=...` - Session detail

### Priority 2: Enhanced Features
8. `GET /api/v1/telemetry/latest?tenant_id=...&barn_id=...` - Sensor matrix
9. `GET /api/v1/weighvision/analytics?tenant_id=...` - Weight analytics
10. `GET /api/v1/feeding/daily?tenant_id=...` - Daily feed intake
11. `GET /api/v1/feeding/fcr?tenant_id=...` - FCR & forecast
12. `GET /api/v1/analytics/anomalies?tenant_id=...` - Anomalies
13. `GET /api/v1/analytics/recommendations?tenant_id=...` - Recommendations

### Priority 3: Admin & Ops
14. `GET /api/v1/admin/users?tenant_id=...` - User management
15. `GET /api/v1/admin/audit?tenant_id=...` - Audit log
16. `GET /api/v1/ops/data-quality?tenant_id=...` - Data quality
17. `GET /api/v1/ops/sync-status?tenant_id=...` - Sync status

### Priority 4: Advanced Features
18. `POST /api/v1/ai/scenario` - Scenario planner
19. `GET /api/v1/reports/:reportId` - Report generation
20. `GET /api/v1/export/:exportId` - Data export

---

## Context Passing Standard

### Query Parameters (Standard)
All BFF endpoints MUST accept context via query parameters:

- `tenant_id` (required): Always required for data endpoints
- `farm_id` (optional): When farm context is selected
- `barn_id` (optional): When barn context is selected
- `batch_id` (optional): When batch context is selected
- `device_id` (optional): For device-specific queries
- `station_id` (optional): For WeighVision station-specific queries

### Headers (Standard)
All BFF endpoints MUST accept:

- `Authorization: Bearer <access_token>` (required)
- `x-request-id: <uuid-v4>` (required, generated by FE)

### Example Request
```
GET /api/v1/registry/farms?tenant_id=xxx&page=1&limit=25
Headers:
  Authorization: Bearer eyJhbGc...
  x-request-id: 123e4567-e89b-12d3-a456-426614174000
```

---

## Page-to-Endpoint Mapping

### Overview Page
- `GET /api/v1/dashboard/overview?tenant_id=...` ✅ EXISTING

### Farms List
- `GET /api/v1/registry/farms?tenant_id=...` ⚠️ NEW

### Farm Detail
- `GET /api/v1/dashboard/farms/:farmId?tenant_id=...` ✅ EXISTING

### Barns List
- `GET /api/v1/registry/barns?tenant_id=...&farm_id=...` ⚠️ NEW

### Barn Detail
- `GET /api/v1/dashboard/barns/:barnId?tenant_id=...` ✅ EXISTING

### Devices List
- `GET /api/v1/registry/devices?tenant_id=...` ⚠️ NEW

### Device Detail
- `GET /api/v1/registry/devices/:deviceId?tenant_id=...` ⚠️ NEW

### Telemetry Explorer
- `GET /api/v1/telemetry/readings?tenant_id=...` ⚠️ NEW

### WeighVision Sessions List
- `GET /api/v1/weighvision/sessions?tenant_id=...` ⚠️ NEW

### WeighVision Session Detail
- `GET /api/v1/weighvision/sessions/:sessionId?tenant_id=...` ⚠️ NEW

### WeighVision Analytics
- `GET /api/v1/weighvision/analytics?tenant_id=...` ⚠️ NEW

### Sensor Matrix
- `GET /api/v1/telemetry/latest?tenant_id=...&barn_id=...` ⚠️ NEW

### Sensor Trends
- `GET /api/v1/telemetry/readings?tenant_id=...&metric_type=...` ⚠️ NEW

### Daily Feed Intake
- `GET /api/v1/feeding/daily?tenant_id=...` ⚠️ NEW

### FCR & Forecast
- `GET /api/v1/feeding/fcr?tenant_id=...` ⚠️ NEW

### Anomalies
- `GET /api/v1/analytics/anomalies?tenant_id=...` ⚠️ NEW

### Recommendations
- `GET /api/v1/analytics/recommendations?tenant_id=...` ⚠️ NEW

### Scenario Planner
- `POST /api/v1/ai/scenario` ⚠️ NEW

### Alerts
- `GET /api/v1/alerts?tenant_id=...` ✅ EXISTING

### Reports & Export
- `GET /api/v1/reports/:reportId?tenant_id=...` ⚠️ NEW
- `GET /api/v1/export/:exportId?tenant_id=...` ⚠️ NEW

### Data Quality
- `GET /api/v1/ops/data-quality?tenant_id=...` ⚠️ NEW

### Ops Health
- `GET /api/v1/ops/sync-status?tenant_id=...` ⚠️ NEW

### Admin: Tenants
- `GET /api/v1/registry/tenants` ⚠️ NEW

### Admin: Devices
- `GET /api/v1/registry/devices?tenant_id=...` ⚠️ NEW

### Admin: Users
- `GET /api/v1/admin/users?tenant_id=...` ⚠️ NEW

### Admin: Audit
- `GET /api/v1/admin/audit?tenant_id=...` ⚠️ NEW

---

## Documentation Consistency Checks

### ✅ Completed
- [x] All 10 documentation files exist
- [x] Standard terminology used consistently (Tenant/Farm/Barn/Batch/Species/Device/Session)
- [x] Context passing standard defined (query params)
- [x] Headers standard defined (Authorization + x-request-id)
- [x] Error contract standardized
- [x] Page specifications reference required endpoints
- [x] Links between documents are relative and correct
- [x] Main index (`docs/00-index.md`) updated with dashboard pack links
- [x] Main dashboard doc (`docs/cloud-layer/02-dashboard.md`) links to pack

### ✅ Terminology Normalization
- All docs use: `tenant_id`, `farm_id`, `barn_id`, `batch_id`, `device_id`, `session_id`
- Consistent UUID v7 format
- Consistent naming: "Tenant", "Farm", "Barn", "Batch", "Species", "Device", "Session"

### ✅ Endpoint Status Marking
- All endpoints marked as EXISTING or NEW
- EXISTING endpoints verified against `cloud-api-gateway-bff` routes
- NEW endpoints clearly documented with full contract

---

## Implementation Readiness

### Frontend (dashboard-web)
- ✅ Routes defined (29 pages)
- ✅ Components scaffolded
- ✅ API client with context passing
- ✅ Auth & RBAC foundations
- ✅ Error handling & observability
- ✅ Production hardening complete

### Backend (cloud-api-gateway-bff)
- ✅ 4 endpoints EXISTING (overview, farm/barn detail, alerts)
- ⚠️ 25 endpoints NEW (need implementation)

### Integration
- ✅ BFF pattern documented and enforced
- ✅ Context passing standard defined
- ✅ Error contract standardized
- ✅ Request/response schemas defined (Zod schemas in FE)

---

## Next Steps

1. **Backend Team**: Implement 25 NEW BFF endpoints as documented in `04-bff-api-contracts.md`
2. **Frontend Team**: Wire up real API calls using `bffRequest()` with schemas
3. **QA Team**: Use `09-acceptance-checklist.md` for testing
4. **Doc Captain**: Update status when endpoints are implemented

---

## Related Documentation

- **Main Dashboard Doc**: [docs/cloud-layer/02-dashboard.md](../02-dashboard.md)
- **API Standards**: [docs/shared/01-api-standards.md](../../shared/01-api-standards.md)
- **API Catalog**: [docs/shared/00-api-catalog.md](../../shared/00-api-catalog.md)
- **Multi-Tenant Model**: [docs/02-domain-multi-tenant-data-model.md](../../02-domain-multi-tenant-data-model.md)

---

**Documentation Status**: ✅ **FROZEN** (Ready for implementation)  
**Last Review**: 2025-01-20  
**Next Review**: When BFF endpoints are implemented

