Purpose: Provide a single catalog of all FarmIQ APIs across services (single source of truth).  
Scope: Service purpose, base path (`/api`), auth expectations, core endpoints, and `/api-docs` location.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-17  

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
- **Auth**: Internal cluster auth for reads; device uploads routed via `edge-ingress-gateway`.
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
  - `GET /api/v1/sync/state`
  - `POST /api/v1/sync/trigger` (admin/debug)
  - `GET /api/v1/sync/outbox` (admin/debug)
- **Data ownership**: `sync_outbox`, `sync_state`
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
- **Data ownership**: `tenant`, `farm`, `barn`, `batch`, `device`
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

- **Purpose**: Consume events and compute anomalies/forecasts/KPIs.
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
- **Data ownership**: analytics tables
- **Implementation notes**: `boilerplates/Backend-python`

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


