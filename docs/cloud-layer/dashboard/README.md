# Dashboard Documentation Pack

**Status**: ✅ **DOCUMENTATION COMPLETE** (2025-01-20)  
**Purpose**: Complete documentation pack for FarmIQ Dashboard implementation.  
**Owner**: FarmIQ Doc Captain

---

## Quick Start

This documentation pack is the **single source of truth** for Dashboard (`dashboard-web`) implementation.

**Start here**: [Docs Freeze Summary](00-DOCS-FREEZE-SUMMARY.md)

---

## Documentation Structure

### Core Documents

1. **[00-DOCS-FREEZE-SUMMARY.md](00-DOCS-FREEZE-SUMMARY.md)** ⭐ START HERE
   - Complete inventory of pages (29), endpoints (28), and implementation status
   - Standard terminology reference
   - Page-to-endpoint mapping
   - NEW endpoints list

2. **[00-dashboard-expanded-scope.md](00-dashboard-expanded-scope.md)**
   - Dashboard goals and commercial-scale requirements
   - FE-to-BFF integration principle
   - Multi-tenant architecture assumptions

3. **[01-information-architecture.md](01-information-architecture.md)**
   - Global navigation and route map
   - Context selector rules
   - Page grouping and role-based visibility

4. **[02-page-specs.md](02-page-specs.md)**
   - Detailed specifications for all 29 pages
   - KPIs, filters, widgets, drill-downs
   - Empty/error/loading states
   - Permissions and data freshness

### Technical Documents

5. **[03-data-requirements-and-computation.md](03-data-requirements-and-computation.md)**
   - Data sources (telemetry, weighvision, analytics, registry)
   - Canonical IDs (tenant_id, farm_id, barn_id, etc.)
   - Computation responsibilities (FE vs server-side)
   - Data freshness model

6. **[04-bff-api-contracts.md](04-bff-api-contracts.md)** ⭐ API REFERENCE
   - Complete BFF endpoint definitions (28 endpoints)
   - Request/response contracts
   - Status: EXISTING (4) vs NEW (25)
   - Error handling

7. **[05-kpi-metrics-definitions.md](05-kpi-metrics-definitions.md)**
   - Formulas and units for all KPIs
   - Aggregation rules
   - Examples with numbers

### Security & Operations

8. **[06-multi-tenant-and-rbac.md](06-multi-tenant-and-rbac.md)**
   - Tenant isolation principles
   - Role definitions (platform_admin, tenant_admin, farm_manager, operator, viewer)
   - Permission matrix
   - Context management and audit requirements

9. **[07-ops-observability-ux.md](07-ops-observability-ux.md)**
   - Data freshness indicators
   - Sync monitoring UX
   - Request ID correlation for support
   - Datadog RUM guidance

### Roadmap & Testing

10. **[08-ml-analytics-roadmap.md](08-ml-analytics-roadmap.md)**
    - Data collection for ML
    - Dataset export recommendations
    - Drift monitoring concepts
    - Phased implementation (descriptive → forecasting → recommendations → optimization)

11. **[09-acceptance-checklist.md](09-acceptance-checklist.md)**
    - Comprehensive testing checklist
    - Per-page validation criteria
    - Multi-tenant isolation tests
    - Performance budgets
    - Security validation

---

## Standard Terminology

| Term | Definition | Canonical ID |
|------|------------|--------------|
| **Tenant** | Top-level organizational unit | `tenant_id` (UUID v7) |
| **Farm** | Physical farm location | `farm_id` (UUID v7) |
| **Barn** | Barn/structure within farm | `barn_id` (UUID v7) |
| **Batch** | Group of animals/birds | `batch_id` (UUID v7, optional) |
| **Species** | Type of livestock | N/A (metadata) |
| **Device** | Sensor gateway or station | `device_id` (UUID v7) |
| **Session** | WeighVision measurement session | `session_id` (UUID v7) |
| **Station** | WeighVision station ID | `station_id` (UUID v7, optional) |

---

## Implementation Status

### Frontend (dashboard-web)
- ✅ Routes defined (29 pages)
- ✅ Components implemented
- ✅ API client with context passing
- ✅ Auth & RBAC foundations
- ✅ Error handling & observability
- ✅ Production hardening complete
- ✅ **Status**: Implementation complete (all pages wired to BFF)

### Backend (cloud-api-gateway-bff)
- ✅ 4 endpoints EXISTING:
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/farms/:farmId`
  - `GET /api/v1/dashboard/barns/:barnId`
  - `GET /api/v1/alerts`
- ⚠️ 25 endpoints NEW (need implementation)

See [Docs Freeze Summary](00-DOCS-FREEZE-SUMMARY.md) for complete endpoint list.

---

## Key Decisions

1. **FE-to-BFF Pattern**: `dashboard-web` calls ONLY `cloud-api-gateway-bff` (never direct to cloud services)
2. **Context Passing**: All context passed via query params (`tenant_id`, `farm_id`, `barn_id`)
3. **Headers**: `Authorization: Bearer <token>` + `x-request-id: <uuid>`
4. **Polling Strategy**: MVP uses polling (no WebSockets); pauses when tab hidden
5. **Token Storage**: Access token in memory (sessionStorage), refresh token in httpOnly cookie (preferred) or localStorage
6. **Error Handling**: Standardized error contract with `code`, `message`, `traceId`
7. **Tenant Isolation**: Strict validation in BFF; FE must always include tenant context

---

## Related Documentation

- **Main Dashboard Doc**: [docs/cloud-layer/02-dashboard.md](../02-dashboard.md)
- **API Standards**: [docs/shared/01-api-standards.md](../../shared/01-api-standards.md)
- **API Catalog**: [docs/shared/00-api-catalog.md](../../shared/00-api-catalog.md)
- **Multi-Tenant Model**: [docs/02-domain-multi-tenant-data-model.md](../../02-domain-multi-tenant-data-model.md)

---

**Last Updated**: 2025-01-20  
**Next Review**: When BFF endpoints are implemented

