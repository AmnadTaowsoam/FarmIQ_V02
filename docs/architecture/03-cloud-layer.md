# Cloud Layer Architecture

**Purpose**: Detailed architecture for cloud layer of FarmIQ platform  
**Scope**: Cloud services, APIs, data models, and integration patterns  
**Owner**: FarmIQ Architecture Team  
**Last updated**: 2026-02-05

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Service Architecture](#3-service-architecture)
4. [API Standards](#4-api-standards)
5. [Security & RBAC](#5-security--rbac)
6. [Data Requirements](#6-data-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Integration Requirements](#8-integration-requirements)

---

## 1. Overview

### 1.1 Purpose

The cloud layer is the central, multi-tenant platform for FarmIQ that provides:
- Public APIs for dashboards and integrations
- Multi-tenant master data management (tenant/farm/barn/batch/device)
- Durable telemetry storage and query
- Analytics and derived KPIs
- Optional cloud media retention (PVC-based, not object storage)

### 1.2 Key Characteristics

- Kubernetes-based, horizontally scalable stateless services
- **RabbitMQ** is the cloud event bus (`cloud-rabbitmq`) for internal events
- Strong security posture via OIDC/JWT + RBAC
- All services must be stateless and HPA-friendly

### 1.3 Canonical Cloud Services (MVP)

**Infrastructure:**
| Service | Purpose |
|---------|---------|
| `cloud-rabbitmq` | Central message broker for cloud events |

**Business Services:**
| Service | Purpose | Platform |
|---------|---------|----------|
| `cloud-api-gateway-bff` | Single public API entrypoint and BFF | Node |
| `cloud-identity-access` | Authentication and authorization service | Node |
| `cloud-tenant-registry` | Master data owner (tenant/farm/barn/batch/device) | Node |
| `cloud-standards-service` | Reference/standard/target master data | Node |
| `cloud-ingestion` | Cloud ingress owner (single entry from edge) | Node |
| `cloud-telemetry-service` | Telemetry storage and query | Node |
| `cloud-analytics-service` | Anomaly/forecast/KPI + insights orchestration | Python |
| `cloud-llm-insights-service` | Generates structured insights from feature summaries | Python |
| `cloud-notification-service` | In-app notifications and delivery jobs | Node |
| `cloud-feed-service` | Feed master data and intake records | Node |
| `cloud-barn-records-service` | Barn records management | Node |
| `cloud-ml-model-service` | Hosts prediction/forecast models (optional) | Python |
| `cloud-media-store` | PVC-based cloud image storage (optional) | Node |

**Ownership Guards (Non-negotiable):**
- **Cloud ingress owner**: `cloud-ingestion` ONLY
- **Multi-tenant master data owner**: `cloud-tenant-registry`

---

## 2. Architecture

### 2.1 Cloud Message Flow

```mermaid
flowchart LR
  edge_sync["edge-sync-forwarder"] -->|HTTPS batched events| cloud_ingest["cloud-ingestion"]
  cloud_ingest -->|validate and dedupe| cloud_ingest
  cloud_ingest -->|publish events| cloud_rmq["cloud-rabbitmq"]

  cloud_rmq --> cloud_ts["cloud-telemetry-service"]
  cloud_rmq --> cloud_analytics["cloud-analytics-service"]
  cloud_rmq --> cloud_media["cloud-media-store optional"]

  cloud_ts --> cloud_api["cloud-api-gateway-bff"]
  cloud_tenant["cloud-tenant-registry"] --> cloud_api
  cloud_media --> cloud_api
  cloud_auth["cloud-identity-access"] --> cloud_api
  cloud_analytics --> cloud_api
  cloud_notify["cloud-notification-service"] --> cloud_api
  cloud_feed["cloud-feed-service"] --> cloud_api
  cloud_standards["cloud-standards-service"] --> cloud_api

  cloud_analytics -->|feature summaries| cloud_llm["cloud-llm-insights-service"]
  cloud_analytics -->|optional predictions| cloud_ml["cloud-ml-model-service optional"]
  cloud_analytics -->|best-effort| cloud_notify

  style edge_sync fill:#e1f5ff
  style cloud_ingest fill:#ffe1e1
  style cloud_rmq fill:#e1ffe1
```

**Flow Steps:**
1. `edge-sync-forwarder` sends batched events to `cloud-ingestion` over HTTPS
2. `cloud-ingestion` validates and deduplicates by `(tenant_id, event_id)`
3. `cloud-ingestion` publishes events to `cloud-rabbitmq`
4. Consumers (`cloud-telemetry-service`, `cloud-analytics-service`, optional `cloud-media-store`) process events idempotently and write to their owned stores

### 2.2 Synchronous Insight Flow

This flow is **synchronous** and **user-driven**:

```mermaid
sequenceDiagram
  participant Dashboard as dashboard-web
  participant BFF as cloud-api-gateway-bff
  participant Analytics as cloud-analytics-service
  participant LLM as cloud-llm-insights-service
  participant ML as cloud-ml-model-service
  participant Notify as cloud-notification-service

  Dashboard->>BFF: POST /api/v1/dashboard/insights/generate
  BFF->>Analytics: Forward request
  Analytics->>Analytics: Aggregate feature summaries
  
  Analytics->>ML: Optional predictions/forecasts
  ML-->>Analytics: Return predictions
  
  Analytics->>LLM: POST /api/v1/llm-insights/analyze
  Note over Analytics,LLM: Feature summaries only<br/>No raw telemetry
  LLM-->>Analytics: Return structured insight
  
  Analytics->>Notify: POST /api/v1/notifications/send
  Note over Analytics,Notify: Best-effort only
  
  Analytics-->>BFF: Return combined insight
  BFF-->>Dashboard: Return insight
```

**Important guardrails:**
- `cloud-llm-insights-service` MUST NOT receive raw telemetry; it only receives **feature summaries**
- All requests enforce tenant scope + RBAC and propagate `x-request-id` end-to-end

### 2.3 In-App Notification Flow (MVP)

- **Inbox listing (dashboard)**: dashboard-web → BFF → cloud-notification-service
- **Insight → Notification creation (best-effort)**: After successful LLM insight generation, analytics-service calls notification-service to create an in-app notification
- Notification creation is **best-effort** and MUST NOT block the main insight response

---

## 3. Service Architecture

### 3.1 cloud-rabbitmq

**Purpose**: Cloud event bus for FarmIQ

**Requirements:**
- AMQP endpoints (internal)
- Hosts exchanges and queues for telemetry, analytics, and media
- No DB tables owned
- High availability configuration

**Exchanges:**
| Exchange | Type | Purpose |
|----------|------|---------|
| `telemetry` | topic | Telemetry events |
| `analytics` | topic | Analytics events |
| `media` | topic | Media events |
| `inference` | topic | Inference results |
| `sync` | topic | Sync events |

### 3.2 cloud-api-gateway-bff

**Purpose**: Single public API entrypoint and BFF for the React dashboard

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/dashboard/overview` | GET | Dashboard overview |
| `/api/v1/dashboard/farms/{farmId}` | GET | Farm dashboard |
| `/api/v1/dashboard/barns/{barnId}` | GET | Barn dashboard |
| `/api/v1/dashboard/alerts` | GET | Alerts |
| `/api/v1/notifications/inbox` | GET | Notification inbox |
| `/api/v1/notifications/history` | GET | Notification history |
| `/api/v1/notifications/send` | POST | Send notification |
| `/api/v1/dashboard/insights/generate` | POST | Generate insights |
| `/api/v1/dashboard/insights` | GET | List insights |
| `/api/v1/dashboard/insights/:insightId` | GET | Get insight |

**Data Requirements:**
- No DB tables owned (aggregation layer)

**Integration Requirements:**
- Proxies/aggregates data from downstream services
- Enforces auth + tenant scoping for dashboard features
- Implements BFF patterns for dashboard UI

**Boilerplate**: `boilerplates/Backend-node`

### 3.3 cloud-identity-access

**Purpose**: Authentication and authorization service

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/auth/login` | POST | Email/password login (MVP) |
| `/api/v1/auth/refresh` | POST | Refresh token exchange |
| `/api/v1/users/me` | GET | Current user profile with roles |

**Data Requirements:**
- DB tables owned:
  - `user` - id, email, password, tenant_id, created_at, updated_at
  - `role` - id, name
  - `user_role` - many-to-many join table
  - `audit_log` (optional)

**Security Requirements:**
- Issues/validates JWTs with tenant and role claims
- Enforces RBAC per endpoint
- Password hashing (bcrypt or similar)

**Boilerplate**: `boilerplates/Backend-node`

### 3.4 cloud-tenant-registry

**Purpose**: Own tenant/farm/barn/batch/device canonical data for multi-tenant isolation

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/tenants` | GET/POST | Tenant collection |
| `/api/v1/farms` | GET/POST | Farm collection |
| `/api/v1/barns` | GET/POST | Barn collection |
| `/api/v1/batches` | GET/POST | Batch collection |
| `/api/v1/devices` | GET/POST | Device collection |
| `/api/v1/topology` | GET | Topology view |

**Data Requirements:**
- DB tables owned:
  - `tenant` - id, name, status, created_at, updated_at
  - `farm` - id, tenant_id, name, location, status, created_at, updated_at
  - `barn` - id, tenant_id, farm_id, name, animal_type, status, created_at, updated_at
  - `batch` - id, tenant_id, farm_id, barn_id, species, start_date, end_date, status
  - `device` - id, tenant_id, farm_id, barn_id, batch_id, device_type, serial_no, status, metadata
  - `station` - id, tenant_id, farm_id, barn_id, name, station_type, status
  - `sensors` - id, tenant_id, sensor_id, type, unit, label, barn_id, zone, enabled
  - `sensor_bindings` - id, tenant_id, binding_id, sensor_id, device_id, protocol, channel, sampling_rate, effective_from, effective_to, enabled
  - `sensor_calibrations` - id, tenant_id, calibration_id, sensor_id, method, offset, gain, performed_at, performed_by, notes

**Ownership Requirements:**
- Multi-tenant master data owner
- Enforces tenant isolation
- Provides lookups by IDs

**Boilerplate**: `boilerplates/Backend-node`

### 3.5 cloud-standards-service

**Purpose**: Store and serve reference/standard/target master data

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/standards/sets` | GET/POST | Standard sets |
| `/api/v1/standards/sets/{setId}` | GET/PATCH/DELETE | Standard set details |
| `/api/v1/standards/sets/{setId}/rows` | GET/PUT | Standard set rows |
| `/api/v1/standards/resolve` | POST | Resolve standards with scope precedence |
| `/api/v1/standards/imports/csv` | POST | Import from CSV |
| `/api/v1/standards/sets/{setId}/clone` | POST | Clone standard set |
| `/api/v1/standards/sets/{setId}/adjust` | POST | Adjust standard set |

**Data Requirements:**
- DB tables owned:
  - `standard_sets`
  - `standard_rows`
  - `source_documents`
  - `import_jobs`

**Boilerplate**: `boilerplates/Backend-node`

### 3.6 cloud-ingestion

**Purpose**: The only entrypoint for edge-to-cloud sync traffic

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/edge/batch` | POST | Accept array of standard event envelopes |

**Data Requirements:**
- DB tables owned:
  - `ingestion_dedupe` or `ingested_event` - tenant_id, event_id, first_seen_at
- Dedupe key: `(tenant_id, event_id)` (mandatory safety net)

**RabbitMQ Requirements:**
- Producer: publishes to domain exchanges (telemetry, weighvision, media, inference, sync)

**Boilerplate**: `boilerplates/Backend-node`

### 3.7 cloud-telemetry-service

**Purpose**: Consume telemetry-related events and provide query APIs

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/telemetry/readings` | GET | Telemetry readings |
| `/api/v1/telemetry/aggregates` | GET | Aggregated telemetry |
| `/api/v1/telemetry/metrics` | GET | Telemetry metrics |
| `/api/v1/weighvision/sessions` | GET | WeighVision sessions |

**Data Requirements:**
- DB tables owned:
  - `telemetry_raw` - tenant_id, farm_id, barn_id, device_id, batch_id, metric, value, unit, occurred_at, event_id
  - `telemetry_agg` - tenant_id, farm_id, barn_id, device_id, metric, bucket_start, bucket_size, avg/min/max/count
  - `consumer_offset` (optional for idempotent consumption)

**RabbitMQ Consumers:**
- Routing keys: `telemetry.ingested`, `telemetry.aggregated`, `weighvision.session.finalized`

**Boilerplate**: `boilerplates/Backend-node`

### 3.8 cloud-analytics-service

**Purpose**: Consume events and compute anomalies/forecasts/KPIs; also acts as the orchestrator for synchronous insights generation

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/analytics/kpis` | GET | KPIs |
| `/api/v1/analytics/anomalies` | GET | Anomalies |
| `/api/v1/analytics/forecasts` | GET | Forecasts |
| `/api/v1/analytics/insights/generate` | POST | Generate insights |
| `/api/v1/analytics/insights` | GET | List insights |
| `/api/v1/analytics/insights/{insightId}` | GET | Get insight |

**Data Requirements:**
- DB tables owned:
  - `analytics_results` - kpi/anomaly/forecast materialization
  - `analytics_anomaly`
  - `analytics_insight` (optional; combined response cache/history)
  - `analytics_insight_run` (optional; audit of downstream calls)
  - `analytics_event_dedupe` - tenant_id, event_id, first_seen_at

**RabbitMQ Consumers:**
- Routing keys: `telemetry.ingested`, `telemetry.aggregated`, `inference.completed`, `weighvision.session.finalized`

**Sync Dependencies:**
- Calls `cloud-llm-insights-service` with **feature summaries only** (no raw telemetry payloads)
- Optionally calls `cloud-ml-model-service` for prediction/forecast

**Boilerplate**: `boilerplates/Backend-python`

### 3.9 cloud-llm-insights-service

**Purpose**: Generate structured insights from analytics feature summaries

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/llm-insights/analyze` | POST | Generate insight |
| `/api/v1/llm-insights/history` | GET | Insight history |
| `/api/v1/llm-insights/{insightId}` | GET | Get insight |
| `/api/v1/llm-insights/templates` | GET | Prompt templates (optional) |

**Data Requirements:**
- DB tables owned:
  - `llm_insight`
  - `llm_insight_run` (audit)
  - `llm_prompt_template` (optional)

**RabbitMQ**: None for MVP (synchronous)

**Boilerplate**: `boilerplates/Backend-python`

### 3.10 cloud-ml-model-service (optional)

**Purpose**: Host and version ML models and serve predictions

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/ml/predict` | POST | Predict |
| `/api/v1/ml/forecast` | POST | Forecast |
| `/api/v1/ml/models` | GET | List models |
| `/api/v1/ml/models/{modelKey}` | GET | Get model |

**Data Requirements:**
- DB tables owned (optional):
  - `ml_model_registry` (optional)
  - `ml_prediction_log` (optional)

**RabbitMQ**: None for MVP (synchronous)

**Boilerplate**: `boilerplates/Backend-python`

### 3.11 cloud-notification-service

**Purpose**: Store and serve notifications (in-app) and manage delivery attempts

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/notifications/send` | POST | Send notification |
| `/api/v1/notifications/history` | GET | Notification history |
| `/api/v1/notifications/inbox` | GET | Notification inbox |

**Data Requirements:**
- DB tables owned:
  - `notifications`
  - `notification_targets`
  - `notification_delivery_attempts`

**RBAC Requirements:**
- Send: `tenant_admin`, `farm_manager`
- History/Inbox: `tenant_admin`, `farm_manager`, `house_operator`, `viewer`

**Severity Levels**: `info` | `warning` | `critical`

**Idempotency & Dedupe:**
- `Idempotency-Key` header is stored as `idempotency_key` and unique per tenant
- `externalRef` is unique per tenant (recommended for entity-based de-duplication)
- `dedupeKey` is stored for additional grouping but is not the unique idempotency mechanism

**Async:**
- Non-`in_app` channels are enqueued via RabbitMQ jobs
- `in_app` channel is stored with status `sent` immediately (no queue)

**Boilerplate**: `boilerplates/Backend-node`

### 3.12 cloud-feed-service

**Purpose**: Define the cloud service that owns feed master data and authoritative feed intake records

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/feed/formulas` | GET/POST | Feed formulas |
| `/api/v1/feed/lots` | GET/POST | Feed lots |
| `/api/v1/feed/deliveries` | GET/POST | Feed deliveries |
| `/api/v1/feed/quality-results` | GET/POST | Quality results |
| `/api/v1/feed/intake-records` | GET/POST | Intake records |
| `/api/v1/feed/programs` | GET/POST | Feed programs (optional) |

**Data Requirements:**
- DB tables owned:
  - `feed_formula` - id, tenant_id, name, species, phase, energy_kcal_per_kg, protein_pct, fiber_pct, fat_pct, status
  - `feed_lot` - id, tenant_id, farm_id, supplier_name, lot_code, feed_formula_id, manufacture_date, received_date, quantity_kg, remaining_kg, status
  - `feed_delivery` - id, tenant_id, farm_id, barn_id, feed_lot_id, delivery_ref, delivered_at, quantity_kg, unit_cost, currency
  - `feed_quality_result` - id, tenant_id, feed_lot_id, sampled_at, metric, value, unit, method, status
  - `feed_intake_record` - id, tenant_id, farm_id, barn_id, batch_id, device_id, source, feed_formula_id, feed_lot_id, quantity_kg, occurred_at, event_id, idempotency_key, sequence, notes, created_by_user_id
  - `feed_program` (optional)
  - `feed_inventory_snapshot` (optional)

**Idempotency Requirements:**
- `event_id` + `tenant_id` for edge events
- `Idempotency-Key` for HTTP writes

**Boilerplate**: `boilerplates/Backend-node`

### 3.13 cloud-barn-records-service

**Purpose**: Barn records management service

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/barn-records` | GET/POST | Barn records |
| `/api/v1/barn-records/{recordId}` | GET/PATCH/DELETE | Barn record details |

**Data Requirements:**
- DB tables owned (see schema for full list)

**Boilerplate**: `boilerplates/Backend-node`

### 3.14 cloud-media-store (optional)

**Purpose**: Store and serve media in the cloud on PVC (if cloud retention required)

**API Requirements:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ready` | GET | Readiness check |
| `/api-docs` | GET | API documentation |
| `/api/v1/media/images` | POST | Upload image |
| `/api/v1/media/objects/{objectId}` | GET | Get object |
| `/api/v1/media/objects/{objectId}/meta` | GET | Get object metadata |

**Data Requirements:**
- DB tables owned:
  - `media_object_cloud`

**RabbitMQ Consumers:**
- Routing keys: `media.stored`, `weighvision.session.finalized`

**PVC Usage:**
- Mount: `/data/media`
- No object storage

**Boilerplate**: `boilerplates/Backend-node`

---

## 4. API Standards

### 4.1 Required Endpoints

Every HTTP service must expose:
- **Health**: `GET /api/health`
  - Response: `200 OK` with a simple payload (or `OK` text)
- **Ready** (recommended): `GET /api/ready`
  - Response: `200 OK` when service is ready to serve traffic
- **OpenAPI docs**: `GET /api-docs`
  - Swagger UI backed by OpenAPI definition
  - OpenAPI spec at `GET /api-docs/openapi.json`

### 4.2 Base Path and Routing Conventions

- Base path for APIs: **`/api`**
- Business endpoints MUST be under: **`/api/v1/...`**
- Resource naming:
  - Use nouns and plural resources: `/api/devices`, `/api/sessions`
  - Use path params for identifiers: `/api/devices/{device_id}`
  - Use `GET` for reads, `POST` for create/actions, `PATCH` for partial update

### 4.3 Correlation and Tracing Headers

**Required headers (request):**
- **`x-request-id`**: Unique ID for request correlation across logs
- **`x-trace-id`**: Trace correlation header

**Required fields (logs):**
- `requestId` (from `x-request-id`)
- `traceId` (from tracer / `x-trace-id`)
- `service`, `env`, and `version` (recommended)

### 4.4 Standard Error Response Format

All APIs must return errors in this JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "farm_id is invalid",
    "traceId": "trace-id-123"
  }
}
```

**Suggested error codes:**
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

### 4.5 Request Validation

- Node services should validate payloads with Zod
- Python services should validate with Pydantic (FastAPI)
- Reject invalid payloads with `400` and `VALIDATION_ERROR`

### 4.6 List Endpoint Standards

All list endpoints MUST support:
| Parameter | Type | Default | Description |
|-----------|--------|---------|-------------|
| `page` | Integer | 1 | 1-based index |
| `limit` | Integer | 20-25 | Items per page |
| `sort_by` | String | - | Field name |
| `sort_dir` | String | - | `asc` or `desc` |
| `q` | String | - | Search query |
| `start_time` | ISO 8601 | - | Time range start |
| `end_time` | ISO 8601 | - | Time range end |

**Response format**:
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 120,
    "hasNext": true
  }
}
```

### 4.7 Multi-Tenant Headers

All requests MUST include:
1. `Authorization`: `Bearer <token>`
2. `x-request-id`: UUID v4 (Generated by FE for tracing)
3. `tenant_id`: Query param (BFF validation)

---

## 5. Security & RBAC

### 5.1 Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `platform_admin` | System Owner | Manage Tenants, provisioning, global system health |
| `tenant_admin` | Farm Owner | Manage Farms, Users, Devices, Billing. Full access to own tenant |
| `farm_manager` | Vet / Manager | View all farm data, acknowledge alerts, edit thresholds. No user management |
| `house_operator` | Farm Hand | View telemetry, alerts, and sessions. Read-only mostly |
| `viewer` | Auditor / Guest | Read-only access to specific dashboard pages |
| `device_agent` | Machine identity | Used by edge services and IoT agents (no human UI permissions) |

### 5.2 RBAC Authorization Matrix

| Role | Tenant registry R | Tenant registry W | Telemetry R | Telemetry W | WeighVision R | WeighVision W | Media R | Media W | Analytics R | Analytics W |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `platform_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tenant_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `farm_manager` | ✅ | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ |
| `house_operator` | ✅ | ❌ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ❌ |
| `viewer` | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| `device_agent` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ⚠️ | ❌ | ❌ |

### 5.3 Permission Matrix (Quick Reference)

| Action | Platform Admin | Tenant Admin | Farm Manager | House Operator | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Create Tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Farm | ✅ | ✅ | ❌ | ❌ | ❌ |
| Provision Device | ✅ | ✅ | ❌ | ❌ | ❌ |
| Acknowledge Alert | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Telemetry | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |

### 5.4 Scope Constraints

- **`farm_manager`** write scope is limited to **assigned farms/barns**
- **`house_operator`** write scope is limited to **assigned barns/houses** and only operational actions
- **`device_agent`**:
  - Device → edge ingestion is **MQTT-only**
  - The only allowed device HTTP calls are for **media upload via presigned URL**
  - May request a presigned upload URL and upload media bytes, but must not list arbitrary media objects

### 5.5 Enforcement Guidance

- Enforce tenant and farm/barn scope in the authorization middleware
- All write operations SHOULD be audited (actor id, role, tenant, resource id, action, trace id)
- Prefer explicit permissions (domain + action) over implicit role checks when implementing new APIs

### 5.6 Auth Implementation Rules

1. **Source of Truth**: The permissions source is the `/api/v1/users/me` endpoint, which returns a `roles: string[]` array
2. **Route Guards**:
   - **Level 1**: Check `isAuthenticated`. Redirect to `/login` if false
   - **Level 2**: Check `hasRole`. Redirect to `/403` if false
3. **Feature Flags**: Hide/Disable buttons if the user lacks the role

### 5.7 Token Storage (Dashboard)

- **Access Tokens**: Store in **Memory** (React Context / Redux state)
- **Refresh Token**: Store in `httpOnly` cookie (preferred) or `localStorage`

### 5.8 XSS Prevention

- **Rule**: Never use `dangerouslySetInnerHTML`
- **Sanitization**: If rich text is absolutely required, use `DOMPurify` before rendering

---

## 6. Data Requirements

### 6.1 Database Landscape

- **Primary RDBMS**: PostgreSQL (Prisma-managed schemas per service)
- **Time-series**: TimescaleDB (if enabled) for high-volume telemetry tables
- **File storage**: PVC-backed media storage for edge and optional cloud media
- **Schema separation**: Prefer separate databases or schemas per service for isolation

### 6.2 Core Domain Entities

Required identifiers:
- `tenant_id`, `farm_id`, `barn_id`, `device_id`
- Optional: `batch_id`, `session_id`

### 6.3 Data Ownership Map

| Layer | Owned Data |
|-------|-----------|
| **Cloud** | auth, tenant registry, ingestion dedupe, telemetry, analytics, media |
| **Edge** | ingress dedupe, telemetry, weigh sessions, media objects, inference, sync outbox/state |

### 6.4 Table Categories

- **Master data**: tenants, farms, barns, batches, devices, stations
- **Operational**: sessions, media objects, inference results, device status
- **Telemetry/time-series**: raw readings, aggregates, rollups
- **Idempotency**: dedupe tables for ingress/ingestion/analytics
- **Integration**: outbox tables for reliable sync

### 6.5 Keys, Constraints, and Naming

- **Primary keys**: UUID v7 for high-write tables
- **Foreign keys**: enforce tenant-scoped relationships where relations exist
- **Naming**: snake_case tables/columns; consistent suffixes (e.g., `_id`, `_at`)
- **Unique constraints**:
  - Master data: `(tenant_id, name)` on farms/barns/stations where appropriate
  - Dedupe: `(tenant_id, event_id)` in ingress/ingestion/analytics
  - Telemetry agg: `(tenant_id, farm_id, barn_id, device_id, metric, bucket_start, bucket_size)`

### 6.6 Indexing and Partitioning

- **Telemetry raw**: `(tenant_id, occurred_at DESC)` and `(tenant_id, device_id, metric, occurred_at DESC)`
- **Telemetry agg**: `(tenant_id, bucket_start DESC)` and `(tenant_id, device_id, metric, bucket_start DESC)`
- **Ingress dedupe**: `(expires_at)` for TTL cleanup
- **Partitioning**: range partition by time for large telemetry tables

### 6.7 Retention, Archiving, and Cleanup

| Data Type | Retention |
|-----------|-----------|
| Edge telemetry raw | 30-90 days |
| Edge telemetry agg | 6-12 months |
| Edge media | 30-90 days by default |
| Outbox | Keep acked rows 7-30 days for audit |
| Ingress dedupe | TTL 24-72 hours |
| Cloud telemetry raw | 2-7 years typical (compliance) |
| Cloud telemetry agg | Archive to datalake if required |

### 6.8 Idempotency and Event Consistency

- **Ingress/ingestion**: `(tenant_id, event_id)` enforced in `ingress_dedupe` and `CloudDedupe`
- **Telemetry**: `telemetry_raw` unique on `(tenant_id, event_id)` (cloud)
- **Analytics**: `analytics_event_dedupe` + unique `(tenant_id, type, source_event_id, metric)` in `analytics_results`
- **Outbox**: edge services write to `sync_outbox`; `edge-sync-forwarder` batches and retries

### 6.9 Migrations and Schema Management

- **Node services**: Prisma migrations per service (migration files tracked in Git)
- **Python analytics**: DDL created in `cloud-layer/cloud-analytics-service/app/db.py`
- **Edge shared DB**: ensure a single migration source for shared tables
- **Deployment order**: apply migrations before service rollout

### 6.10 Backup and DR

| Parameter | Value |
|-----------|-------|
| RPO | 15 minutes (cloud), 60 minutes (edge) |
| RTO | 2-4 hours for cloud services; 2 hours for a single edge site |
| Coverage | cloud DBs (schema + data + roles), edge DBs (outbox + dedupe + minimal metadata) |
| Non-goal | raw media bytes on PVCs are not primary backup targets |

### 6.11 Security and Compliance

- **Access control**: least-privilege DB users per service
- **Encryption**: TLS in transit; at-rest encryption per platform policy
- **PII**: avoid storing sensitive fields in telemetry or media metadata; audit access paths

---

## 7. Non-Functional Requirements

### 7.1 Scalability

- All cloud and edge services are stateless (except DBs and PVC-backed storage)
- Horizontally scalable under Kubernetes
- HPA should be configured per service

### 7.2 Offline and Intermittent Connectivity

- Edge services must operate when cloud is unreachable
- `edge-telemetry-timeseries`, `edge-weighvision-session`, and `edge-media-store` provide sufficient local buffering until sync resumes
- `edge-sync-forwarder` maintains `sync_state` for retrying batches

### 7.3 Observability

- Node services: Winston JSON logs → stdout; `dd-trace` for distributed tracing
- Python services: JSON structured logs → stdout; `ddtrace` for tracing
- Datadog Agent runs as a DaemonSet, collecting logs, metrics, and traces

### 7.4 Performance

| Metric | Target |
|--------|--------|
| Telemetry query latency | < 500ms for typical queries |
| Insight generation | 8-12s timeout for LLM calls |
| API response time | < 200ms for simple queries |

### 7.5 Availability

| Component | Target |
|-----------|--------|
| Cloud services | 99.5% uptime |
| Edge services | Operate offline with sync when connectivity restored |

### 7.6 Rate Limiting

- Enforce per-user limits; return 429 on breach
- Different limits per role (e.g., higher for service accounts)

### 7.7 Retry Policy

| Permitted | Forbidden |
|----------|-----------|
| Network Failure, 502, 503, 504 (Max 3 retries, exponential backoff) | 400, 401, 403, 404 (Do not retry logic errors) |

### 7.8 Polling Policy (Dashboard MVP)

| Page | Interval | Notes |
|------|----------|-------|
| Dashboard Overview | 60s | Poll every 60s |
| Barn/Device Detail | 30s | Poll every 30s |
| Alerts | 60s | Poll every 60s |
| Global | - | No global polling |
| Visibility | - | Pause polling when `document.visibilityState === 'hidden'` |

---

## 8. Integration Requirements

### 8.1 Edge to Cloud Integration

**Message Flow:**
1. `edge-sync-forwarder` sends batched events to `cloud-ingestion` over HTTPS
2. `cloud-ingestion` validates and deduplicates by `(tenant_id, event_id)`
3. `cloud-ingestion` publishes events to `cloud-rabbitmq`
4. Consumers process events idempotently

**Idempotency:**
- Edge dedupes at `edge-ingress-gateway` level
- Cloud dedupes at `cloud-ingestion` level (safety net)
- Both use `(tenant_id, event_id)` as dedupe key

### 8.2 Dashboard Integration

**Rule**: `dashboard-web` MUST call **only** the `cloud-api-gateway-bff` for all data requirements

**Exception**: Auth endpoints (`/auth/login`) may be called directly if the Gateway proxies them transparently

### 8.3 Insights Integration

**Rule**: `dashboard-web` MUST call **only** `cloud-api-gateway-bff` for insights generation (no direct calls to analytics/LLM/ML services)

**BFF Endpoints:**
- `POST /api/v1/dashboard/insights/generate`
- `GET /api/v1/dashboard/insights?tenant_id=...&farm_id=...&barn_id=...&start_time=...&end_time=...&page=...&limit=...`
- `GET /api/v1/dashboard/insights/:insightId?tenant_id=...`

### 8.4 Notifications Integration

**Rule**: `dashboard-web` MUST call **only** `cloud-api-gateway-bff` for in-app notifications

**BFF Endpoints:**
- `GET /api/v1/notifications/inbox?tenantId=...&topic=&cursor=&limit=`
- `GET /api/v1/notifications/history?tenantId=...&farmId=&barnId=&batchId=&severity=&channel=&status=&startDate=&endDate=&cursor=&limit=`
- `POST /api/v1/notifications/send` (optional; admin only)

**UX Requirements:**
- Polling: refresh inbox every 60s; pause when `document.visibilityState === 'hidden'`
- Required headers: `Authorization: Bearer <jwt>`, `x-request-id: <uuid>`

---

## Related Documents

- [Architecture Overview](./00-overview.md)
- [IoT Layer Architecture](./01-iot-layer.md)
- [Edge Layer Architecture](./02-edge-layer.md)
- [Data Flows](./04-data-flows.md)
- [Security Architecture](./05-security.md)
