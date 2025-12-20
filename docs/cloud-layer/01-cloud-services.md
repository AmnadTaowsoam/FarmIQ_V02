Purpose: Define the canonical FarmIQ cloud services, their boundaries, and data ownership.  
Scope: Per-service purpose, APIs, owned tables, RabbitMQ consumers, and boilerplate mapping.  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-17  

---

## Canonical cloud services (MVP)

Infrastructure:
- `cloud-rabbitmq`

Services:
- `cloud-api-gateway-bff` (Node; gateway + BFF)
- `cloud-identity-access` (Node; JWT/OIDC, RBAC)
- `cloud-tenant-registry` (Node; master data)
- `cloud-ingestion` (Node; single entry from edge, validate + dedupe)
- `cloud-telemetry-service` (Node; consumes RabbitMQ, telemetry storage + query)
- `cloud-analytics-service` (Python; consumes RabbitMQ, anomaly/forecast/KPI)
- `cloud-media-store` (optional; PVC-based if cloud retains images)

Ownership guards (non-negotiable):
- **Cloud ingress owner**: `cloud-ingestion` ONLY.
- **Multi-tenant master data owner**: `cloud-tenant-registry`.

---

## Service boundaries and contracts

### `cloud-rabbitmq`

- **Purpose**: Cloud event bus for FarmIQ.
- **APIs**: AMQP endpoints (internal).
- **DB tables owned**: None.
- **Boilerplate**: N/A.

### `cloud-api-gateway-bff` (Node)

- **Purpose**: Single public API entrypoint and BFF for the React dashboard.
- **Public APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - Dashboard-facing endpoints (examples):
    - `GET /api/v1/dashboard/overview`
    - `GET /api/v1/dashboard/farms/{farmId}`
    - `GET /api/v1/dashboard/barns/{barnId}`
    - `GET /api/v1/dashboard/alerts`
- **DB tables owned**: None (aggregation layer).
- **RabbitMQ**: Typically no direct consumption; interacts via synchronous APIs with other services.
- **Boilerplate**: `boilerplates/Backend-node`

### `cloud-identity-access` (Node)

- **Purpose**: Authentication and authorization service. MVP: Password-based authentication; Production: OIDC integration support. Issues/validates JWTs and enforces RBAC.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/auth/login` (MVP: email/password; Future: OIDC redirect support)
  - `POST /api/v1/auth/refresh` (refresh token exchange for new access token)
  - `GET /api/v1/users/me` (current user profile with roles)
- **DB tables owned** (typical):
  - `user`
  - `role`
  - `user_role`
  - `audit_log` (optional, if not centralized)
- **RabbitMQ**: Optional for audit events; keep simple for MVP.
- **Boilerplate**: `boilerplates/Backend-node`

### `cloud-tenant-registry` (Node) — Master data owner

- **Purpose**: Own tenant/farm/barn/batch/device canonical data for multi-tenant isolation.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - Resource collections:
    - `/api/v1/tenants`
    - `/api/v1/farms`
    - `/api/v1/barns`
    - `/api/v1/batches`
    - `/api/v1/devices`
  - Topology view:
    - `GET /api/v1/topology`
- **DB tables owned**:
  - `tenant`, `farm`, `barn`, `batch`, `device`
- **RabbitMQ**: Optional to publish master data change events; not required for MVP.
- **Boilerplate**: `boilerplates/Backend-node`

### `cloud-ingestion` (Node) — Cloud ingress owner

- **Purpose**: The only entrypoint for edge-to-cloud sync traffic; validates, deduplicates, and publishes to RabbitMQ.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/edge/batch`
    - Accepts an array of standard event envelopes.
    - Performs idempotent insert using `(tenant_id, event_id)`.
- **DB tables owned**:
  - `ingestion_dedupe` (or `ingested_event`) to record processed `event_id`s per tenant for idempotency.
  - Dedupe key: `(tenant_id, event_id)` (mandatory safety net even if edge dedupes).
- **RabbitMQ**:
  - Producer: publishes to domain exchanges (telemetry, weighvision, media, inference, sync).
- **Boilerplate**: `boilerplates/Backend-node`

### `cloud-telemetry-service` (Node)

- **Purpose**: Consume telemetry-related events and provide query APIs.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `/api/v1/telemetry/readings`
  - `/api/v1/telemetry/aggregates`
  - `/api/v1/telemetry/metrics`
  - `/api/v1/weighvision/sessions`
- **DB tables owned**:
  - `telemetry_cloud`
  - `telemetry_agg_cloud` (optional)
  - `consumer_offset` (optional for idempotent consumption)
- **RabbitMQ consumers**:
  - Routing keys: `telemetry.ingested`, `telemetry.aggregated`, `weighvision.session.finalized` (optional correlation).
- **Boilerplate**: `boilerplates/Backend-node`

### `cloud-analytics-service` (Python)

- **Purpose**: Consume events and compute anomalies/forecasts/KPIs.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `/api/v1/analytics/kpis`
  - `/api/v1/analytics/anomalies`
  - `/api/v1/analytics/forecasts`
- **DB tables owned**:
  - `analytics_kpi`
  - `analytics_anomaly`
- **RabbitMQ consumers**:
  - Routing keys: `telemetry.ingested`, `telemetry.aggregated`, `inference.completed`, `weighvision.session.finalized`
- **Boilerplate**: `boilerplates/Backend-python`

### `cloud-media-store` (optional)

- **Purpose**: Store and serve media in the cloud on PVC (if cloud retention required).
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/media/images`
  - `GET /api/v1/media/objects/{objectId}`
  - `GET /api/v1/media/objects/{objectId}/meta`
- **DB tables owned**:
  - `media_object_cloud`
- **RabbitMQ consumers**:
  - Routing keys: `media.stored` (if cloud receives media events), `weighvision.session.finalized` (for lifecycle cleanup).
- **PVC usage**:
  - Mount: `/data/media`
  - No object storage.
- **Boilerplate**: `boilerplates/Backend-node` (authoritative mapping).

---

## Implementation Notes

- Cloud services must be stateless and horizontally scalable (HPA-friendly) with clear ownership boundaries.
- All consumer handlers must be idempotent and safe to retry.
- All logging must be JSON structured and collected by Datadog; no sensitive PII in logs.


