Purpose: Define the canonical FarmIQ cloud services, their boundaries, and data ownership.  
Scope: Per-service purpose, APIs, owned tables, RabbitMQ consumers, and boilerplate mapping.  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

## Canonical cloud services (MVP)

Infrastructure:
- `cloud-rabbitmq`

Services:
- `cloud-api-gateway-bff` (Node; gateway + BFF)
- `cloud-identity-access` (Node; JWT/OIDC, RBAC)
- `cloud-tenant-registry` (Node; master data)
- `cloud-standards-service` (Node; reference/standard/target master data)
- `cloud-ingestion` (Node; single entry from edge, validate + dedupe)
- `cloud-telemetry-service` (Node; consumes RabbitMQ, telemetry storage + query)
- `cloud-analytics-service` (Python; consumes RabbitMQ, anomaly/forecast/KPI + insights orchestration)
- `cloud-llm-insights-service` (Python; generates structured insights from feature summaries)
- `cloud-ml-model-service` (optional; Python; hosts prediction/forecast models)
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

### `cloud-standards-service` (Node) — Standards owner

- **Purpose**: Store and serve reference/standard/target master data (growth, ventilation, lighting, environmental limits) with scope precedence resolution.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api/v1/standards/sets`
  - `GET /api/v1/standards/sets/{setId}`
  - `GET /api/v1/standards/sets/{setId}/rows`
  - `GET /api/v1/standards/resolve`
  - Write (admin): `POST /sets`, `PATCH /sets/{setId}`, `PUT /sets/{setId}/rows`, `POST /imports/csv`, `POST /sets/{setId}/clone`, `POST /sets/{setId}/adjust`
- **DB tables owned** (typical):
  - `standard_sets`, `standard_rows`, `source_documents`, `import_jobs`
- **RabbitMQ**: None (read-heavy config/master data).
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

- **Purpose**: Consume events and compute anomalies/forecasts/KPIs; also acts as the orchestrator for synchronous "insights generation".
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `/api/v1/analytics/kpis`
  - `/api/v1/analytics/anomalies`
  - `/api/v1/analytics/forecasts`
  - Orchestrator (MVP):
    - `POST /api/v1/analytics/insights/generate`
    - `GET /api/v1/analytics/insights`
    - `GET /api/v1/analytics/insights/{insightId}`
- **DB tables owned**:
  - `analytics_kpi`
  - `analytics_anomaly`
  - Orchestrator (typical additions):
    - `analytics_insight` (optional; combined response cache/history)
    - `analytics_insight_run` (optional; audit of downstream calls)
- **RabbitMQ consumers**:
  - Routing keys: `telemetry.ingested`, `telemetry.aggregated`, `inference.completed`, `weighvision.session.finalized`
- **Sync dependencies**:
  - Calls `cloud-llm-insights-service` with **feature summaries only** (no raw telemetry payloads).
  - Optionally calls `cloud-ml-model-service` for prediction/forecast if not computed internally.
- **Boilerplate**: `boilerplates/Backend-python`

### `cloud-llm-insights-service` (Python)

- **Purpose**: Generate structured "insights" (summary/findings/causes/actions/confidence/references) from analytics feature summaries.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/llm-insights/analyze`
  - `GET /api/v1/llm-insights/history`
  - `GET /api/v1/llm-insights/{insightId}`
  - `GET /api/v1/llm-insights/templates` (optional)
- **DB tables owned** (typical):
  - `llm_insight`
  - `llm_insight_run` (audit)
  - `llm_prompt_template` (optional)
- **RabbitMQ**: None for MVP (synchronous). Async generation can be introduced later if needed.
- **Boilerplate**: `boilerplates/Backend-python`

### `cloud-ml-model-service` (optional; Python)

- **Purpose**: Host and version ML models (regression, time-series, forecasting) and serve predictions.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/ml/predict`
  - `POST /api/v1/ml/forecast`
  - `GET /api/v1/ml/models`
  - `GET /api/v1/ml/models/{modelKey}`
- **DB tables owned** (optional):
  - `ml_model_registry` (optional)
  - `ml_prediction_log` (optional)
- **RabbitMQ**: None for MVP (synchronous).
- **Boilerplate**: `boilerplates/Backend-python`

### `cloud-notification-service` (Node)

- **Purpose**: In-app notifications and delivery jobs (queue-backed for non in-app channels).
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/notifications/send`
  - `GET /api/v1/notifications/history`
  - `GET /api/v1/notifications/inbox`
- **Tenant scope** (as implemented):
  - Primary source: JWT claim `tenant_id`
  - Dev/service fallback: `x-tenant-id` header or `tenantId` in body/query (used only when JWT tenant is not available)
- **RBAC** (as implemented):
  - Send: `tenant_admin`, `farm_manager`
  - History/Inbox: `tenant_admin`, `farm_manager`, `house_operator`, `viewer`
- **Severity**: `info` | `warning` | `critical`
- **DB tables owned**:
  - `notifications`
  - `notification_targets`
  - `notification_delivery_attempts`
- **Idempotency & dedupe**:
  - `Idempotency-Key` header is stored as `idempotency_key` and unique per tenant.
  - `externalRef` is unique per tenant (recommended for entity-based de-duplication, e.g. `INSIGHT:{insightId}`).
  - `dedupeKey` is stored for additional grouping but is not the unique idempotency mechanism.
- **Async**:
  - Non-`in_app` channels are enqueued via RabbitMQ jobs.
  - `in_app` channel is stored with status `sent` immediately (no queue).
- **Boilerplate**: `boilerplates/Backend-node`

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

---

## Doc Change Summary (2025-12-27)

- Added `cloud-llm-insights-service` and optional `cloud-ml-model-service` to the canonical service list and boundaries.
- Evolved `cloud-analytics-service` to include an orchestrator surface for synchronous insights generation (still consumes RabbitMQ for materialization).
- Documented `cloud-notification-service` contract and data ownership for in-app dashboard notifications (including severity, targets, and delivery attempts).

## Next Implementation Steps

1) Implement `cloud-llm-insights-service` (sync MVP + persistence + audit).  
2) Add orchestrator endpoints to `cloud-analytics-service` and integrate LLM calls (feature summaries only).  
3) Add BFF proxy endpoints for dashboard insights (dashboard-web calls only BFF).  
4) Implement `cloud-ml-model-service` (optional) if forecasts/predictions should be externalized.  


