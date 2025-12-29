Purpose: Provide a single catalog of all FarmIQ APIs across services (single source of truth).  
Scope: Service purpose, base path (`/api`), auth expectations, core endpoints, and `/api-docs` location.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27  

---

## How to use this catalog

- This file is the **single catalog** of FarmIQ APIs across IoT, Edge, and Cloud services.
- Each service section lists:
  - **Responsibilities** (what it does / does not do)
  - **Interfaces** (core endpoints)
  - **Data ownership** (high-level)
  - **Implementation notes** (boilerplate mapping)

All FarmIQ services must follow `shared/01-api-standards.md`:
- Base path: `/api`
- Health: `GET /api/health`
- Ready (recommended): `GET /api/ready`
- API docs: `/api-docs`
- OpenAPI spec: `GET /api-docs/openapi.json` (or `openapi.yaml`)
- Error shape: `{"error":{"code":"...","message":"...","traceId":"..."}}`
- Correlation headers: `x-request-id`, `x-trace-id`

---

## Table of contents

- [Edge (device-facing)](#edge-device-facing)
- [Edge (internal APIs)](#edge-internal-apis)
- [Cloud (public APIs)](#cloud-public-apis)
- [Cloud (internal APIs)](#cloud-internal-apis)

---

## Edge (device-facing)

### MQTT (authoritative device → edge interface)

- **Scope**: All device telemetry and events MUST use MQTT only. Devices do not call HTTP telemetry ingestion endpoints.
- **Topics**:
  - `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`
  - `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`
  - `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`
  - `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}` (retained)
- **Message envelope**: see `iot-layer/00-overview.md` (authoritative envelope).

### `edge-ingress-gateway` (HTTP operational/admin only)

- **Purpose**: Device ingress API and MQTT normalizer.
- **Base path**: `/api`
- **Auth**: Device auth (recommended: mTLS or signed device token). No cookies/sessions.
- **/api-docs**: `GET /api-docs`
- **Responsibilities**
  - **Does**: Consume MQTT topics, validate/enrich envelope, route to edge services.
  - **Does**: Expose operational/admin HTTP endpoints.
  - **Does not**: Own business data tables (routes to owners).
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/ingress/stats`
  - `POST /api/v1/devices/config/publish` (optional admin)
- **Ownership notes**
  - Telemetry persistence: `edge-telemetry-timeseries`
  - Sessions: `edge-weighvision-session`
  - Media: `edge-media-store`
- **Implementation notes**: `boilerplates/Backend-node`

---

## Edge (internal APIs)

### `edge-telemetry-timeseries`

- **Purpose**: Edge telemetry storage and aggregation.
- **Base path**: `/api`
- **Auth**: Internal cluster auth (mTLS/service identity) or private network policy.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/aggregates`
  - `GET /api/v1/telemetry/metrics`
- **Data ownership**: `telemetry_raw`, `telemetry_agg`
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-weighvision-session`

- **Purpose**: Session owner (image + weight binding and lifecycle).
- **Base path**: `/api`
- **Auth**: Internal cluster auth.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/weighvision/sessions` (internal; created from MQTT events)
  - `GET /api/v1/weighvision/sessions/{sessionId}` (internal)
  - `POST /api/v1/weighvision/sessions/{sessionId}/finalize` (internal)
- **Data ownership**: `weight_sessions`
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-media-store`

- **Purpose**: Media owner (PVC filesystem + metadata).
- **Base path**: `/api`
- **Auth**: Internal cluster auth for reads; presign requires device auth (x-tenant-id or token claims). Gateway does not proxy image bytes.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/media/images/presign` + `PUT {upload_url}` (presigned upload; **only device→edge HTTP calls**)
  - `GET /api/v1/media/objects/{objectId}`
  - `GET /api/v1/media/objects/{objectId}/meta`
- **Data ownership**: `media_objects` + PVC `/data/media`
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-feed-intake`

- **Purpose**: Edge feed intake owner for SILO_AUTO and local manual/import entries; writes local intake + outbox events.
- **Base path**: `/api`
- **Auth**: Internal cluster auth (mTLS/service identity); no direct device access.
- **/api-docs**: `GET /api-docs`
- **Primary Interface**
  - Consumes feed events from the edge pipeline (normalized ingestion from MQTT/ingress).
  - Supports SILO_AUTO intake by processing telemetry/event deltas (if applicable).
  - Emits/records outbox entries for sync-forwarder (edge->cloud).
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
- **Optional ops/debug endpoints**: No business HTTP endpoints; internal-only ops endpoints are optional if implemented.
  - `GET /api/v1/edge-feed-intake/status` (optional, internal)
  - `GET /api/v1/edge-feed-intake/backlog` (optional, internal)
- **Metrics**: `GET /metrics` (internal, if enabled)
- **Data ownership**: `feed_intake_local`, `feed_intake_dedupe`, `sync_outbox`
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-vision-inference`

- **Purpose**: Inference owner (computes predictions and writes results).
- **Base path**: `/api`
- **Auth**: Internal cluster auth.
- **/api-docs**: `GET /api-docs` (FastAPI Swagger UI)
- **Core endpoints (minimal)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/inference/jobs`
  - `GET /api/v1/inference/jobs/{jobId}`
  - `GET /api/v1/inference/results`
  - `GET /api/v1/inference/models`
- **Primary interface**: Consumes inference jobs (optional) from Edge RabbitMQ.
- **Data ownership**: `inference_results`
- **Implementation notes**: `boilerplates/Backend-python`

### `edge-sync-forwarder`

- **Purpose**: Sync owner; outbox-driven store-and-forward to cloud.
- **Base path**: `/api`
- **Auth**: Internal cluster auth; admin endpoints restricted.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/sync/state` (returns pending/claimed/dead/dlq counts + oldest pending age)
  - `POST /api/v1/sync/trigger` (admin/debug)
  - `POST /api/v1/sync/dlq/redrive` (admin/debug; preferred DLQ redrive path)
  - `POST /api/v1/sync/redrive` (admin/debug; legacy alias of DLQ redrive)
- **Data ownership**: `sync_outbox`, `sync_outbox_dlq`
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-policy-sync`

- **Purpose**: Cache effective config from cloud BFF for offline-first edge operation.
- **Base path**: `/api`
- **Auth**: Internal cluster auth (service token) when calling BFF; local reads are internal only.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready`
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/edge-config/effective?tenantId&farmId&barnId`
  - `GET /api/v1/edge-config/state`
  - `GET /metrics`
- **Data ownership**: `edge_config_cache`, `edge_config_sync_state`
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-retention-janitor`

- **Purpose**: Enforce media retention and free-disk safeguards.
- **Base path**: `/api`
- **Auth**: Internal cluster auth (admin-only in production).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready`
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/janitor/run`
  - `GET /api/v1/janitor/state`
  - `GET /metrics`
- **Data ownership**: None (acts on PVC paths only).
- **Implementation notes**: `boilerplates/Backend-node`

### `edge-observability-agent`

- **Purpose**: Aggregate edge health, resources, and sync backlog into a single ops view.
- **Base path**: `/api`
- **Auth**: Internal cluster auth (ops only).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready`
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/ops/edge/status`
  - `GET /metrics`
- **Data ownership**: None (aggregator only).
- **Implementation notes**: `boilerplates/Backend-node`

---

## Cloud (public APIs)

### `cloud-api-gateway-bff`

- **Purpose**: Public gateway + BFF for dashboard.
- **Base path**: `/api`
- **Auth**: `Authorization: Bearer <jwt>` (OIDC/JWT). No server-side sessions.
- **/api-docs**: `GET /api-docs`
- **Core endpoints (examples)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/farms/{farmId}`
  - `GET /api/v1/dashboard/barns/{barnId}`
  - `GET /api/v1/dashboard/alerts`
  - Notifications (dashboard; proxy to `cloud-notification-service`)
    - `GET /api/v1/dashboard/notifications/inbox`
    - `GET /api/v1/dashboard/notifications/history`
    - `POST /api/v1/dashboard/notifications/send` (optional; strict RBAC)
  - Notifications (generic; normalized list shape)
    - `GET /api/v1/notifications/inbox`
    - `GET /api/v1/notifications/history`
    - `POST /api/v1/notifications/send`
  - Insights (planned; proxy to analytics orchestrator)
    - `POST /api/v1/dashboard/insights/generate`
    - `GET /api/v1/dashboard/insights`
    - `GET /api/v1/dashboard/insights/{insightId}`
- **Feeding surfaces**: Canonical proxy/aggregation is `GET /api/v1/kpi/feeding` for FE dashboards.
- **Data ownership**: None (aggregation layer)
- **Implementation notes**: `boilerplates/Backend-node`

---

## Cloud (internal APIs)

### `cloud-identity-access`

- **Purpose**: AuthN/AuthZ; OIDC integration; RBAC enforcement.
- **Base path**: `/api`
- **Auth**: OIDC flows and service-to-service auth.
- **/api-docs**: `GET /api-docs`
- **Core endpoints (examples)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `GET /api/v1/users/me`
- **Data ownership**: auth tables (if stored locally)
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-tenant-registry`

- **Purpose**: Master data owner for Tenant → Farm → Barn → Batch/Species → Device.
- **Base path**: `/api`
- **Auth**: JWT + RBAC.
- **/api-docs**: `GET /api-docs`
- **Core endpoints (examples)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `/api/v1/tenants`
  - `/api/v1/farms`
  - `/api/v1/barns`
  - `/api/v1/batches`
  - `/api/v1/devices`
  - `GET /api/v1/topology`
  - `/api/v1/sensors` (Phase 1: Sensor module)
  - `/api/v1/sensors/{sensorId}/bindings` (Phase 1: Sensor-device bindings)
  - `/api/v1/sensors/{sensorId}/calibrations` (Phase 1: Calibration history)
- **Data ownership**: `tenant`, `farm`, `barn`, `batch`, `device`, `sensor`, `sensor_binding`, `sensor_calibration`
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-standards-service`

- **Purpose**: Reference/Standard/Target master data for operational targets and limits (growth, ventilation, lighting, environment).
- **Base path**: `/api`
- **Auth**: JWT + RBAC (writes admin-only).
- **/api-docs**: `GET /api-docs`
- **Core endpoints (examples)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/standards/sets`
  - `GET /api/v1/standards/sets/{setId}`
  - `GET /api/v1/standards/sets/{setId}/rows`
  - `GET /api/v1/standards/resolve` (precedence: FLOCK>HOUSE>FARM>TENANT>GLOBAL; key params: `speciesCode`, `geneticLineCode?`, `standardSchemaCode`)
  - `GET /api/v1/standards/catalog/species`
  - `GET /api/v1/standards/catalog/genetic-lines`
  - `GET /api/v1/standards/catalog/standard-schemas`
  - Admin:
    - `POST /api/v1/standards/sets`
    - `PATCH /api/v1/standards/sets/{setId}`
    - `PUT /api/v1/standards/sets/{setId}/rows`
    - `POST /api/v1/standards/sets/{setId}/clone`
    - `POST /api/v1/standards/sets/{setId}/adjust`
    - `POST /api/v1/standards/imports/csv` (dryRun + commit)
- **Data ownership**: `standard_set`, `standard_row`, `source_document`, `import_job`, plus catalogs `species_catalog`, `genetic_line_catalog`, `breeder_company`, `standard_schema`
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-feed-service`

- **Purpose**: Feed master data and authoritative feed intake records.
- **Base path**: `/api`
- **Auth**: JWT + RBAC (tenant/farm/barn scope enforced).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health` - Health probe.
  - `GET /api/ready` (recommended) - Readiness probe.
  - `GET /api-docs` - Swagger UI.
  - `GET /api-docs/openapi.json` (or `openapi.yaml`) - OpenAPI spec.
  - `POST /api/v1/feed/formulas` - Create feed formula.
  - `GET /api/v1/feed/formulas` - List/query formulas.
  - `POST /api/v1/feed/lots` - Create feed lot.
  - `GET /api/v1/feed/lots` - List/query lots.
  - `POST /api/v1/feed/deliveries` - Create delivery.
  - `GET /api/v1/feed/deliveries` - List/query deliveries.
  - `POST /api/v1/feed/quality-results` - Create quality result.
  - `GET /api/v1/feed/quality-results` - List/query quality results.
  - `POST /api/v1/feed/intake-records` - Create intake record.
  - `GET /api/v1/feed/intake-records` - List/query intake records.
  - `POST /api/v1/feed/programs` - Create feed program.
  - `GET /api/v1/feed/programs` - List/query feed programs.
  - `POST /api/v1/feed/inventory-snapshots` - Create inventory snapshot.
  - `GET /api/v1/feed/inventory-snapshots` - List/query inventory snapshots (optional).
  - `GET /api/v1/kpi/feeding` - Query feeding KPIs (proxy to KPI engine).
    - **Note**: This is the canonical KPI endpoint. Legacy `/api/v1/feeding/fcr` is deprecated.
- **Idempotency & Dedupe**: Write endpoints accept `Idempotency-Key` or `external_ref`/`event_id`; duplicates return the original record per unique constraints.
- **Metrics**: `GET /metrics` (internal, if enabled)
- **Data ownership**: `feed_formula`, `feed_lot`, `feed_delivery`, `feed_quality_result`, `feed_intake_record`, `feed_program`, `feed_inventory_snapshot`
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-barn-records-service`

- **Purpose**: Barn health, welfare, housing, and genetic records.
- **Base path**: `/api`
- **Auth**: JWT + RBAC (tenant/farm/barn scope enforced).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health` - Health probe.
  - `GET /api/ready` (recommended) - Readiness probe.
  - `GET /api-docs` - Swagger UI.
  - `GET /api-docs/openapi.json` (or `openapi.yaml`) - OpenAPI spec.
  - `POST /api/v1/barn-records/morbidity` - Create morbidity event.
  - `GET /api/v1/barn-records/morbidity` - List/query morbidity events.
  - `POST /api/v1/barn-records/mortality` - Create mortality event.
  - `GET /api/v1/barn-records/mortality` - List/query mortality events.
  - `POST /api/v1/barn-records/vaccines` - Create vaccine event.
  - `GET /api/v1/barn-records/vaccines` - List/query vaccine events.
  - `POST /api/v1/barn-records/treatments` - Create treatment event.
  - `GET /api/v1/barn-records/treatments` - List/query treatment events.
  - `POST /api/v1/barn-records/daily-counts` - Create daily count.
  - `GET /api/v1/barn-records/daily-counts` - List/query daily counts.
  - `POST /api/v1/barn-records/welfare-checks` - Create welfare check.
  - `GET /api/v1/barn-records/welfare-checks` - List/query welfare checks.
  - `POST /api/v1/barn-records/housing-conditions` - Create housing condition.
  - `GET /api/v1/barn-records/housing-conditions` - List/query housing conditions.
  - `POST /api/v1/barn-records/genetics` - Create genetic profile.
  - `GET /api/v1/barn-records/genetics` - List/query genetic profiles.
- **Query filters**: tenant/farm/barn/batch/date-range filters supported on list endpoints.
- **Idempotency & Dedupe**: Write endpoints accept `Idempotency-Key` or `external_ref`/`event_id`; duplicates return the original record per unique constraints.
- **Metrics**: `GET /metrics` (internal, if enabled)
- **Data ownership**: `barn_morbidity_event`, `barn_mortality_event`, `barn_cull_event`, `barn_vaccine_event`, `barn_treatment_event`, `barn_daily_count`, `barn_welfare_check`, `barn_housing_condition`, `barn_genetic_profile`
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-ingestion`

- **Purpose**: Cloud ingress owner; validates + dedupes edge batches; publishes to RabbitMQ.
- **Base path**: `/api`
- **Auth**: Edge-to-cloud service auth (mTLS or signed tokens), locked down by network policy.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/edge/batch`
- **Data ownership**: `ingestion_dedupe` (or equivalent)
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-telemetry-service`

- **Purpose**: Consume telemetry events and provide query APIs.
- **Base path**: `/api`
- **Auth**: JWT + RBAC (or internal-only, proxied via BFF).
- **/api-docs**: `GET /api-docs`
- **Core endpoints (examples)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `/api/v1/telemetry/readings`
  - `/api/v1/telemetry/aggregates`
  - `/api/v1/telemetry/metrics`
  - `/api/v1/weighvision/sessions` (cloud query surface; not device ingestion)
- **Data ownership**: telemetry storage tables
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-analytics-service`

- **Purpose**: Consume events and compute anomalies/forecasts/KPIs; also orchestrate synchronous insights generation for dashboard use cases.
- **Base path**: `/api`
- **Auth**: Internal-only or JWT + RBAC (depending on exposure).
- **/api-docs**: `GET /api-docs`
- **Core endpoints (optional examples)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `/api/v1/analytics/kpis`
  - `/api/v1/analytics/anomalies`
  - `/api/v1/analytics/forecasts`
  - `/api/v1/analytics/kpi/growth-deviation` (resolves standards via `cloud-standards-service` + batch genetics via `cloud-barn-records-service`)
  - Orchestrator (MVP)
    - `POST /api/v1/analytics/insights/generate`
    - `GET /api/v1/analytics/insights`
    - `GET /api/v1/analytics/insights/{insightId}`
- **Data ownership**: analytics tables
- **Contract doc**: `docs/contracts/cloud-analytics-service.contract.md`
- **Implementation notes**: `boilerplates/Backend-python`

### `cloud-llm-insights-service`

- **Purpose**: Generate structured "insights" from analytics feature summaries (no raw telemetry).
- **Base path**: `/api`
- **Auth**: Internal-only or JWT + RBAC (recommended to forward user JWT via analytics orchestrator).
- **/api-docs**: `GET /api-docs`
- **Core endpoints (MVP)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/llm-insights/analyze`
  - `GET /api/v1/llm-insights/history`
  - `GET /api/v1/llm-insights/{insightId}`
  - `GET /api/v1/llm-insights/templates` (optional)
- **Data ownership**: `llm_insight`, `llm_insight_run` (+ `llm_prompt_template` optional)
- **Contract doc**: `docs/contracts/cloud-llm-insights-service.contract.md`
- **Implementation notes**: `boilerplates/Backend-python`

### `cloud-ml-model-service` (optional)

- **Purpose**: Host/version ML models and serve predictions/forecasts (regression, time-series, forecasting).
- **Base path**: `/api`
- **Auth**: Internal-only or JWT + RBAC.
- **/api-docs**: `GET /api-docs`
- **Core endpoints (MVP)**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/ml/predict`
  - `POST /api/v1/ml/forecast`
  - `GET /api/v1/ml/models`
  - `GET /api/v1/ml/models/{modelKey}`
- **Data ownership**: optional `ml_model_registry`, `ml_prediction_log`
- **Contract doc**: `docs/contracts/cloud-ml-model-service.contract.md`
- **Implementation notes**: `boilerplates/Backend-python`

### `cloud-config-rules-service`

- **Purpose**: Store per-tenant and per-barn configuration (thresholds, rules, target curves).
- **Base path**: `/api`
- **Auth**: JWT + RBAC.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/config/context` - Get effective config for context
  - `GET /api/v1/config/thresholds` - Get thresholds
  - `PUT /api/v1/config/thresholds` - Upsert thresholds
  - `GET /api/v1/config/targets` - Get target curves
  - `PUT /api/v1/config/targets` - Upsert target curves
- **Integration note**: Phase-2 rules can reference standards dynamically (via `cloud-standards-service resolve + rows`) instead of static thresholds.
- **Data ownership**: `config_threshold_rules`, `config_target_curves`
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-audit-log-service`

- **Purpose**: Immutable audit trail for all user actions and system events.
- **Base path**: `/api`
- **Auth**: JWT + RBAC (for read); internal service auth (for write).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/audit/events` - Create audit event (internal/BFF)
  - `GET /api/v1/audit/events` - Query audit events
- **Data ownership**: `audit_events` (append-only)
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-notification-service`

- **Purpose**: In-app notifications and delivery jobs (queue-backed for non in-app channels).
- **Base path**: `/api`
- **Auth**: `Authorization: Bearer <jwt>` + RBAC; tenant scope primarily from JWT claim `tenant_id` (fallback `x-tenant-id` / `tenantId` in dev).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/notifications/send` - Create notification (idempotent via `Idempotency-Key` header; supports `externalRef`)
  - `GET /api/v1/notifications/history` - List notification history (cursor pagination: `{items,nextCursor}`)
  - `GET /api/v1/notifications/inbox` - List in-app notifications for current user/roles/topics (cursor pagination: `{items,nextCursor}`)
- **Not supported (yet)**: `GET /api/v1/notifications/{id}` (no HTTP endpoint in current contract)
- **RBAC (as implemented)**:
  - Send: `tenant_admin`, `farm_manager`
  - History/Inbox: `tenant_admin`, `farm_manager`, `house_operator`, `viewer`
- **Targets (as implemented)**: `user | role | topic` targets are evaluated against JWT-derived `userId` + `roles` and optional `topic` query filter.
- **Data ownership**: `notifications`, `notification_targets`, `notification_delivery_attempts`
- **Async**: Non-`in_app` notifications are enqueued to RabbitMQ jobs; `in_app` is stored as `sent` immediately.
- **Contract notes**:
  - OpenAPI: `cloud-layer/cloud-notification-service/openapi.yaml`
  - Canonical payload mapping: `docs/contracts/notifications.payload.md`
- **Examples**
  - Create (in-app):
    - `POST /api/v1/notifications/send` with header `Idempotency-Key: <key>`
    - Body:
      - `{ "tenantId":"uuid", "severity":"info|warning|critical", "channel":"in_app", "title":"...", "message":"...", "externalRef":"...", "targets":[{"type":"role","value":"tenant_admin"}] }`
    - Response:
      - `{ "notificationId":"uuid", "status":"sent|created|queued|failed", "createdAt":"ISO8601" }`
  - Inbox list:
    - `GET /api/v1/notifications/inbox?topic=&cursor=&limit=`
    - Response:
      - `{ "items":[...], "nextCursor":"string|null" }`
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-reporting-export-service`

- **Purpose**: Async export jobs (dataset/report generation).
- **Base path**: `/api`
- **Auth**: JWT + RBAC.
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `POST /api/v1/reports/jobs` - Create export job
  - `GET /api/v1/reports/jobs/:jobId` - Get job status
  - `GET /api/v1/reports/jobs` - List jobs
  - `GET /api/v1/reports/jobs/:jobId/download` - Get download URL
- **Data ownership**: `report_jobs` + file storage (local volume for MVP)
- **Async**: Consumes `report.jobs` queue from RabbitMQ
- **Implementation notes**: `boilerplates/Backend-node`

### `cloud-media-store` (optional)

- **Purpose**: Cloud PVC-based media retention and serving.
- **Base path**: `/api`
- **Auth**: JWT + RBAC (strong access control).
- **/api-docs**: `GET /api-docs`
- **Core endpoints**
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/media/images` (if cloud stores images)
  - `GET /api/v1/media/objects/{objectId}`
  - `GET /api/v1/media/objects/{objectId}/meta`
- **Data ownership**: `media_object_cloud` + PVC `/data/media`
- **Implementation notes**: `boilerplates/Backend-node` (recommended)

---

## Implementation Notes

- This catalog must be updated whenever APIs are added/changed.
- Prefer routing dashboard calls through `cloud-api-gateway-bff` to minimize frontend coupling.

---

## Doc Change Summary (2025-12-27)

- Added catalog entries for `cloud-llm-insights-service` and optional `cloud-ml-model-service`.
- Added analytics orchestrator endpoints and planned BFF dashboard insights endpoints (proxying to analytics).
- Updated `cloud-notification-service` endpoints/semantics (send/history/inbox, targets, cursor pagination) from the real service OpenAPI and schema.

## Next Implementation Steps

1) Implement `cloud-llm-insights-service`.  
2) Add orchestrator endpoints to `cloud-analytics-service`.  
3) Add BFF proxy endpoints (`/api/v1/dashboard/insights/*`).  
4) Implement `cloud-ml-model-service` (optional).  


