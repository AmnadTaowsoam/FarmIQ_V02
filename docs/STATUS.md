Purpose: Service status, locks, and implementation progress tracking for FarmIQ.  
Scope: Service list, locks/reservations, Definition of Done, and detailed TODO checklists.  
Owner: FarmIQ Platform Team (Doc Captain edits this file)  
Last updated: 2025-12-18 17:55 (Doc Captain)

---

## Service Status

### Service List

| Service | Layer | Port | Health | API Docs | Status | Owner |
|:--------|:------|:-----|:-------|:---------|:-------|:------|
| edge-mqtt-broker | edge | 5100 | OK | - | done | Antigravity |
| edge-ingress-gateway | edge | 5103 | - | - | DOING | Codex |
| edge-telemetry-timeseries | edge | 5104 | OK | OK | done | Antigravity |
| edge-weighvision-session | edge | 5105 | OK | OK | done | Antigravity |
| edge-media-store | edge | 5106 | OK | OK | done | Antigravity |
| edge-vision-inference | edge | 5107 | - | - | not-started | - |
| edge-sync-forwarder | edge | 5108 | OK | OK | done | Antigravity |
| cloud-identity-access | cloud | 5120 | OK | OK | done | Antigravity |
| cloud-tenant-registry | cloud | 5121 | OK | OK | done | CursorAI |
| cloud-ingestion | cloud | 5122 | OK | OK | done | Antigravity |
| cloud-telemetry-service | cloud | 5123 | OK | OK | done | CursorAI |
| cloud-analytics-service | cloud | 5124 | - | - | not-started | - |
| cloud-api-gateway-bff | cloud | 5125 | OK | OK | done | CursorAI |
| dashboard-web | ui | 5130 | OK | OK | done | Antigravity |

### Definition of Done

Each service must meet these criteria before marking as "done":

- [ ] **Build**: `docker build` succeeds without errors
- [ ] **Health**: `GET /api/health` returns `200 OK` (or `{"status": "healthy"}` for Python)
- [ ] **API Docs**: `GET /api-docs` serves OpenAPI/Swagger UI
- [ ] **Logs**: Winston JSON logs (Node) or JSON logs (Python) to stdout
- [ ] **Tracing**: Datadog tracing configured (if applicable)
- [ ] **Docker Compose**: Service starts successfully in docker-compose with correct profile
- [ ] **Progress Doc**: `docs/progress/<service>.md` created and updated

---

## Detailed TODO Checklists (MVP)

> **Rule**: 
> - Service Owners may update their own checklists in `docs/STATUS.md` and their respective `docs/progress/<service>.md` files.
> - Only the Doc Captain (Antigravity) performs final audits and updates `docs/shared/00-api-catalog.md`.

### EDGE: edge-mqtt-broker (infra)
- [x] Choose broker (EMQX or Mosquitto) and define config (users, ACL, persistence)
- [x] Define MQTT ports + TLS plan (dev plain, prod TLS)
- [x] Define LWT topic policy for iot/status/...
- [ ] K8s manifest: Deployment/StatefulSet + Service + ConfigMap + PVC (if persistence needed)
- [ ] Datadog: basic broker metrics/log collection
- [x] Evidence: broker up (configured), connect test, publish/subscribe test

### EDGE: edge-ingress-gateway (Node)
- [x] Scaffold service from Backend-node boilerplate (folder + Dockerfile)
- [x] MQTT subscribe to canonical topics:
  - iot/telemetry/{tenant}/{farm}/{barn}/{device}/{metric}
  - iot/event/{tenant}/{farm}/{barn}/{device}/{eventType}
  - iot/weighvision/{tenant}/{farm}/{barn}/{station}/session/{session}/{eventType}
  - iot/status/{tenant}/{farm}/{barn}/{device} (retained)
- [x] Validate envelope (required fields + schema_version) + reject bad payloads
  - Uses canonical `ts`; accepts `occurred_at` as legacy alias (warns)
- [x] Dedupe (tenant_id,event_id) TTL using Edge DB table (NO Redis)
- [x] Device auth + device→tenant mapping check (MVP: allowlist table; later sync from cloud)
- [x] Route messages:
  - telemetry → edge-telemetry-timeseries API
  - weighvision/session events → edge-weighvision-session API
  - status → last_seen update table
- [x] Expose ops endpoints only:
  - GET /api/health, GET /api/ready, GET /api-docs
  - GET /api/v1/ingress/stats (rates, last_seen)
- [x] Logging: Winston JSON + traceId/requestId propagation
- [x] Tests: unit test validate+dedupe, integration test subscribe+route (mock services)
- [ ] Evidence: docker build ok, curl /api/health ok, sample MQTT message routes correctly
- [x] Write progress: docs/progress/edge-ingress-gateway.md (endpoints + topics + evidence)

### EDGE: edge-telemetry-timeseries (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Own DB tables: telemetry_raw, telemetry_agg
- [x] Internal API (from ingress):
  - [x] POST /api/v1/telemetry/readings
  - [x] GET  /api/v1/telemetry/readings
  - [x] GET  /api/v1/telemetry/aggregates
  - [x] GET  /api/v1/telemetry/metrics
- [x] Aggregation job (simple: 1m → 5m/hourly) + retention policy
- [x] Write outbox events: telemetry.ingested / telemetry.aggregated
- [x] Logging + traceId
- [x] Tests + Evidence + docs/progress/edge-telemetry-timeseries.md

### EDGE: edge-weighvision-session (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Own DB tables: weight_sessions (+ minimal session_state)
- [x] APIs:
  - [x] POST /api/v1/weighvision/sessions
  - [x] GET  /api/v1/weighvision/sessions/{sessionId}
  - [x] POST /api/v1/weighvision/sessions/{sessionId}/bind-weight
  - [x] POST /api/v1/weighvision/sessions/{sessionId}/bind-media
  - [x] POST /api/v1/weighvision/sessions/{sessionId}/finalize
- [x] Handle event routing from ingress:
  - session.created, weight.recorded, session.finalized
- [x] Reconcile rule: image can arrive before session.created → keep as unbound and bind later
- [x] Write outbox: weighvision.session.created/finalized
- [x] Tests + Evidence + docs/progress/edge-weighvision-session.md

### EDGE: edge-media-store (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Own DB tables: media_objects
- [x] PVC filesystem paths:
  /data/media/{tenant}/{farm}/{barn}/{session}/{timestamp}_{camera}.jpg
- [x] HTTP endpoints:
  - [x] POST /api/v1/media/images/presign + PUT {upload_url} (presigned upload)
  - [x] GET  /api/v1/media/objects/{objectId}
  - [x] GET  /api/v1/media/objects/{objectId}/meta
- [x] Validate metadata: tenant/farm/barn/station/session + traceId
- [x] Emit outbox event: media.stored (includes objectId + path + sessionId)
- [x] Trigger inference job (single path): call edge-vision-inference POST /api/v1/inference/jobs
- [x] Tests + Evidence + docs/progress/edge-media-store.md

### EDGE: edge-vision-inference (Python)
- [ ] Scaffold from Backend-python boilerplate (FastAPI)
- [ ] APIs:
  - POST /api/v1/inference/jobs
  - GET  /api/v1/inference/jobs/{jobId}
  - GET  /api/v1/inference/results?sessionId=...
  - GET  /api/v1/inference/models
- [ ] Read image from PVC (path from media_objects)
- [ ] Run inference (MVP: stub model ok; must return deterministic output + model_version)
- [ ] Write inference_results table + outbox inference.completed
- [ ] Send result to edge-weighvision-session (bind inference result)
- [x] Ensure /api/health alias exists (Python must expose /api/health)
- [ ] Tests + Evidence + docs/progress/edge-vision-inference.md

### EDGE: edge-sync-forwarder (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Own tables: sync_state (+ reads sync_outbox)
- [x] Batch pull outbox, send to cloud-ingestion:
  - [x] POST /api/v1/edge/batch (idempotent)
- [x] Retry policy with backoff + jitter; track last_success_sync_at
- [x] Mark outbox rows acked only after cloud ACK
- [x] Ops endpoints:
  - [x] GET /api/v1/sync/state
  - [x] POST /api/v1/sync/trigger
- [x] Alerts signals: backlog size, last sync age, failures
- [x] Tests + Evidence + docs/progress/edge-sync-forwarder.md

---

### CLOUD: cloud-rabbitmq (infra)
- [ ] Deploy RabbitMQ (helm/k8s) + users/vhosts
- [ ] Define exchanges/queues/DLQ names (align docs/03-messaging-rabbitmq.md)
- [ ] Enable metrics for Datadog
- [ ] Evidence: publish/consume test

### CLOUD: cloud-identity-access (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Endpoints:
  - [x] POST /api/v1/auth/login
  - [x] POST /api/v1/auth/refresh
  - [x] GET  /api/v1/users/me
- [x] JWT/OIDC choice (MVP: local JWT ok) + RBAC roles
- [x] Standard headers + error format + traceId
- [x] OpenAPI (/api-docs) + /api/health
- [x] Tests + Evidence + docs/progress/cloud-identity-access.md

### CLOUD: cloud-tenant-registry (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Own master data:
  tenants, farms, barns, batches/species, devices, stations
- [x] CRUD endpoints:
  /api/v1/tenants, /api/v1/farms, /api/v1/barns, /api/v1/batches, /api/v1/devices, /api/v1/stations
  GET /api/v1/topology
- [x] Multi-tenant scoping (tenant_id required everywhere)
- [x] Platform admin support (can query any tenant)
- [x] OpenAPI + /api/health + /api/ready + logging/tracing
- [x] Tests + Evidence + docs/progress/cloud-tenant-registry.md

### CLOUD: cloud-ingestion (Node)
- [x] Scaffold from Backend-node boilerplate
- [x] Endpoint:
  - [x] POST /api/v1/edge/batch (ONLY entry from edge)
- [x] Dedupe by (tenant_id,event_id) in cloud DB
- [x] Publish normalized events to RabbitMQ (envelope preserved)
- [x] DLQ strategy + metrics for backlog/errors
- [x] Tests + Evidence + docs/progress/cloud-ingestion.md

### CLOUD: cloud-telemetry-service (Node)
- [x] Consumer: telemetry.ingested (+ optional aggregated)
- [x] Write/query telemetry in TimescaleDB
- [x] Query endpoints for BFF:
  - [x] GET /api/v1/telemetry/readings
  - [x] GET /api/v1/telemetry/aggregates
  - [x] GET /api/v1/telemetry/metrics
- [x] Tests + Evidence + docs/progress/cloud-telemetry-service.md

### CLOUD: cloud-analytics-service (Python)
- [ ] Consumer: telemetry + weighvision + inference events
- [ ] Compute KPIs/anomalies/forecasts (MVP: simple rules ok)
- [ ] Persist to analytics_results
- [ ] Query endpoints:
  - GET /api/v1/analytics/kpis
  - GET /api/v1/analytics/anomalies
  - GET /api/v1/analytics/forecasts
- [ ] Tests + Evidence + docs/progress/cloud-analytics-service.md

### CLOUD: cloud-api-gateway-bff (Node)
- [x] Aggregate APIs for frontend:
  - [x] GET /api/v1/dashboard/overview
  - [x] GET /api/v1/dashboard/farms/{farmId}
  - [x] GET /api/v1/dashboard/barns/{barnId}
  - [x] GET /api/v1/dashboard/alerts
  - [x] GET /api/v1/weighvision/sessions (read model for dashboard)
- [x] Calls identity + registry + telemetry + analytics services (no direct DB)
- [x] Add auth middleware + RBAC enforcement
- [x] Tests + Evidence + docs/progress/cloud-api-gateway-bff.md

### FRONTEND: dashboard-web (React)
- [x] Scaffold from Frontend boilerplate
- [x] Auth flow (login + store token) + tenant/farm/barn selection
- [x] Pages:
  - Overview
  - Farm/Barn details
  - Telemetry charts (basic)
  - WeighVision sessions list
  - Alerts view
- [x] API client points ONLY to cloud-api-gateway-bff
- [x] Evidence: run locally + screenshot + smoke navigation
- [x] docs/progress/dashboard-web.md

---

## CHANGELOG

### 2025-12-18
- **Documentation audit and refactor**: Completed comprehensive documentation audit and consistency fixes
  - Created: `docs/dev/01-running-locally.md` - docker-compose local development guide
  - Created: `docs/dev/02-env-vars.md` - Environment variables reference
  - Created: `docs/WORKFLOW.md` - Multi-AI development workflow
  - Updated: `docs/00-index.md` - Fixed paths (edge-layer/cloud-layer), added MQTT-only constraint, added dev guides links
  - Updated: `docs/01-architecture.md` - Fixed paths, enforced MQTT-only, updated mermaid diagram, added port references
  - Updated: All docs to enforce MQTT 100% device→edge (no HTTP fallback except media upload)
  - Updated: All docs to use correct paths (edge-layer/, cloud-layer/, apps/) instead of services/edge/ or services/cloud/
  - Verified: Port plan consistency across all docs (5100+ range)
  - Verified: Event types and envelope match `iot-layer/03-mqtt-topic-map.md` everywhere
  - Verified: No Redis/MinIO/Kafka references remain
  - Verified: Mosquitto broker mentioned consistently (not EMQX)
- Verified: No Redis/MinIO references remain

---

### 2025-12-18 (Round 2)
- **Implemented `edge-mqtt-broker` (Antigravity)**:
  - Deployed Mosquitto v2 for edge MQTT ingestion (port 5100).
  - Configured dev-friendly `mosquitto.conf` with persistence.
  - Provided `aclfile.example` and `passwordfile.example`.
  - Integrated into `edge-layer/docker-compose.yml`.
  - Created `docs/progress/edge-mqtt-broker.md`.

- **Implemented `edge-sync-forwarder` (Antigravity)**:
  - Scaffolded from Node.js boilerplate.
  - Implemented sync logic with batching, retries, and state tracking.
  - Integrated with cloud-ingestion API.
  - Added ops endpoints for state and manual trigger.
  - Configured port 5108 and Winston JSON logging.
  - Created docs/progress/edge-sync-forwarder.md.

- **Implemented `edge-weighvision-session` (Antigravity)**:
  - Scaffolded from Node.js boilerplate.
  - Implemented session lifecycle with idempotency and reconciliation (media before session).
  - Implemented all checklist APIs: create, bind-weight, bind-media, finalize.
  - Emits `weighvision.session.created` and `weighvision.session.finalized` outbox events.
  - Configured port 5105 and Winston JSON logging.
  - Created docs/progress/edge-weighvision-session.md.

- **Implemented `edge-media-store` (Antigravity)**:
  - Scaffolded from Node.js boilerplate.
  - Implemented binary media upload with presign flow.
  - Local PVC storage logic with structured paths.
  - Emits `media.stored` outbox events.
  - Triggers downstream `edge-vision-inference` service.
  - Configured port 5106 and Winston JSON logging.
  - Created docs/progress/edge-media-store.md.

- **Implemented `dashboard-web` (Antigravity)**:
  - Premium React frontend with Glassmorphism design.
  - Integration with `cloud-api-gateway-bff` for auth and stats.
  - Implemented secure Login, Dashboard Overview, and navigation structure.
  - Verified production build.

- **Implemented `cloud-api-gateway-bff` (CursorAI)**:
  - Implemented BFF pattern for frontend aggregation.
  - No direct database access; calls downstream services via HTTP.
  - Implemented dashboard overview, detail, and alert endpoints.
  - Added JWT verification with tenant scoping and RBAC.
  - Configured port 5125 and Winston JSON logging.
  - Created docs/progress/cloud-api-gateway-bff.md.

- **Process Refactor (Antigravity)**:
  - Removed "Locks/Reservations" requirement to enable parallel development.
  - Permitted service owners to update `STATUS.md` checklists directly.
  - Retained Doc Captain role for `00-api-catalog.md` sync and final verification.

### 2025-12-18 (Round 3)
- **Doc Captain Cleanup (Antigravity)**:
  - Reflected `cloud-telemetry-service` as COMPLETE (implemented by CursorAI).
  - Fixed logic mismatch: moved `GET /api/v1/weighvision/sessions` from telemetry checklist to BFF checklist.
  - Aligned changelog dates and cleared expired locks.
  - Updated `shared/00-api-catalog.md` with full telemetry service endpoints.

### 2025-12-18
- **Implemented `edge-telemetry-timeseries` (Antigravity)**:
  - Scaffolded from Node.js boilerplate.
  - Implemented Prisma schema with telemetry_raw, telemetry_agg, and outbox tables.
  - Implemented POST /api/v1/telemetry/readings for batch ingestion from edge-ingress-gateway.
  - Implemented GET endpoints for readings, aggregates, and metrics.
  - Implemented aggregation job (5m and 1h intervals) with automatic scheduler.
  - Added manual aggregation trigger endpoint.
  - Outbox events for telemetry.ingested and telemetry.aggregated.
  - Configured port 5104 and Winston JSON logging.
  - Created docs/progress/edge-telemetry-timeseries.md.
  - Updated docs/shared/00-api-catalog.md.
- **Implemented `cloud-tenant-registry` (CursorAI)**:
  - Scaffolded from Node.js boilerplate.
  - Implemented Prisma schema with tenants, farms, barns, batches, devices, stations.
  - Implemented CRUD endpoints for all entities with multi-tenant isolation.
  - Implemented GET /api/v1/topology for nested structure retrieval.
  - Added JWT auth middleware (pluggable) with platform_admin role support.
  - Added /api/health and /api/ready endpoints.
  - Configured port 5121 and Winston JSON logging.
  - Created docs/progress/cloud-tenant-registry.md.

### 2025-12-18 (Round 1)
- **Implemented `cloud-identity-access` (Antigravity)**:
  - Scaffolded from Node.js boilerplate.
  - Implemented JWT-based authentication (Login, Refresh).
  - Implemented `/api/v1/users/me` with RBAC role expansion.
  - Configured port 5120 and Winston JSON logging.
  - Added `/api/health` and `/api/ready` endpoints.
- **Doc Captaincy (Antigravity)**:
  - Locked Round 1 services in `STATUS.md`.
  - Refined `cloud-identity-access` entry in `shared/00-api-catalog.md`.
  - Created `docs/progress/cloud-identity-access.md`.
- **Implemented `cloud-ingestion` (Antigravity)**:
  - Scaffolded/Refactored from Node.js boilerplate.
  - Implemented `POST /api/v1/edge/batch` with validation and deduplication.
  - Integrated RabbitMQ for event publishing.
  - Configured port 5122 and Winston JSON logging.
  - Created `docs/progress/cloud-ingestion.md`.
---
