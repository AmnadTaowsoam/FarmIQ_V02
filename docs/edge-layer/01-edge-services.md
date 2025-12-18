Purpose: Define the canonical FarmIQ edge services, their responsibilities, and ownership boundaries.  
Scope: Per-service purpose, APIs, owned tables, outbox events, PVC usage, and boilerplate mapping.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-17  

---

## Canonical edge services (MVP)

Edge runs on Kubernetes/k3s. The canonical MVP services are:
- `edge-mqtt-broker` (EMQX/Mosquitto)
- `edge-ingress-gateway` (Node)
- `edge-telemetry-timeseries` (Node)
- `edge-weighvision-session` (Node)
- `edge-media-store` (Node)
- `edge-vision-inference` (Python)
- `edge-sync-forwarder` (Node)

### Required edge infrastructure components (not business microservices)

Edge RabbitMQ is **optional** (cloud RabbitMQ is mandatory). If used, the edge cluster can run:
- **RabbitMQ (Edge, optional)**: internal broker for async processing (e.g., inference job queue).  
  This is a platform component and is not part of the “canonical service list” above.

Edge still uses the **DB-based outbox** (`sync_outbox`) as the authoritative mechanism for cloud sync.

---

## Ownership guards (non-negotiable)

- **Session owner (Edge)**: `edge-weighvision-session`
- **Media owner (Edge)**: `edge-media-store` (files on PVC)
- **Inference owner (Edge)**: `edge-vision-inference` (results)
- **Sync owner (Edge)**: `edge-sync-forwarder` ONLY (single path to cloud)

---

## Service-by-service design

### `edge-mqtt-broker` (EMQX/Mosquitto)

- **Purpose**: Receive MQTT telemetry from IoT devices (`iot-sensor-agent`) and forward to `edge-ingress-gateway`.
- **APIs**:
  - MQTT TCP/TLS ports as per cluster configuration.
- **DB tables owned**: None.
- **Outbox events**: None.
- **PVC usage**: Optional (broker persistence), but avoid heavy retention; edge DB is the primary durable store.
- **Boilerplate**: N/A (off-the-shelf broker).

### `edge-ingress-gateway` (Node)

- **Purpose**: Single device-facing HTTP API and MQTT normalizer; validates and routes device data to internal edge services.
- **Does / does not**
  - **Does**: Consume MQTT topics (telemetry + events), validate the standard MQTT envelope, enrich `trace_id` if missing, and route to internal edge services.
  - **Does**: Expose operational and admin HTTP endpoints only (no telemetry ingestion).
  - **Does not**: Own domain tables (routes to owners).
- **MQTT topics consumed (authoritative patterns)**:
  - Telemetry: `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`
  - Generic events: `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`
  - WeighVision: `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`
  - Status (retained): `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}`
- **Idempotency / duplicate handling (mandatory)**:
  - Treat MQTT as at-least-once delivery.
  - Dedupe by `(tenant_id, event_id)` using an Edge DB TTL cache:
    - Table: `ingress_dedupe(event_id, tenant_id, first_seen_at)`
    - Cleanup job drops rows older than TTL (configurable).
  - If duplicate detected: skip downstream processing and log a lightweight dedupe message (no sensitive payload logging).
- **Validation and security**:
  - Validate envelope contains `tenant_id`, `farm_id`, `barn_id`, `device_id`, `event_id`, `occurred_at`, `trace_id`.
  - If `trace_id` missing, generate and attach before routing.
  - Never log full payload; log `event_type`, ids, `trace_id`, and payload size only.
- **Public APIs (device-facing)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
- **Business/ops APIs**
  - `GET /api/v1/ingress/stats`
  - `POST /api/v1/devices/config/publish` (optional admin; publish config to MQTT)
- **Internal calls**:
  - Writes telemetry to `edge-telemetry-timeseries` (HTTP/gRPC).
  - Creates/finalizes sessions via `edge-weighvision-session`.
  - Uploads media to `edge-media-store`.
- **DB tables owned**: None (stateless gateway).
- **Outbox events**: None (do not emit business events here; route to owners).
- **PVC usage**: None.
- **Boilerplate**: `boilerplates/Backend-node`

### `edge-telemetry-timeseries` (Node)

- **Purpose**: Own telemetry persistence and aggregation on edge; provide local telemetry query endpoints.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/aggregates`
  - `GET /api/v1/telemetry/metrics`
- **DB tables owned**:
  - `telemetry_raw`
  - `telemetry_agg`
- **Outbox events written**:
  - `telemetry.ingested`
  - `telemetry.aggregated` (optional on edge; cloud can also aggregate)
- **PVC usage**:
  - Uses DB storage on `edge-db-volume` (if DB is hosted locally on PVC).
- **Boilerplate**: `boilerplates/Backend-node`

### `edge-weighvision-session` (Node) — Session owner

- **Purpose**: Own the WeighVision session lifecycle and binding between weights, media, and inference results.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/weighvision/sessions` (internal; created from MQTT events)
  - `GET /api/v1/weighvision/sessions/{sessionId}` (internal)
  - `POST /api/v1/weighvision/sessions/{sessionId}/finalize` (internal)
- **DB tables owned**:
  - `weight_sessions`
- **Outbox events written**:
  - `weighvision.session.created`
  - `weighvision.session.finalized`
- **PVC usage**: None directly (media stored via `edge-media-store`).
- **Boilerplate**: `boilerplates/Backend-node`

### `edge-media-store` (Node) — Media owner

- **Purpose**: Persist images to PVC filesystem and maintain metadata; expose controlled read APIs for internal services.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/media/images`
  - `GET /api/v1/media/objects/{objectId}`
  - `GET /api/v1/media/objects/{objectId}/meta`
- **DB tables owned**:
  - `media_objects`
- **Outbox events written**:
  - `media.stored`
- **PVC usage (required)**:
  - Mount: `/data/media`
  - Path convention: `/data/media/{tenant_id}/{farm_id}/{barn_id}/{session_id}/{captured_at}_{media_id}.jpg`
- **Boilerplate**: `boilerplates/Backend-node`

### `edge-vision-inference` (Python) — Inference owner

- **Purpose**: Run ML inference on images and write results to the edge DB.
- **APIs**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `POST /api/v1/inference/jobs`
  - `GET /api/v1/inference/jobs/{jobId}`
  - `GET /api/v1/inference/results`
  - `GET /api/v1/inference/models`
- **Asynchronous processing (recommended)**:
  - Consumes inference jobs from **Edge RabbitMQ** queue (e.g., `farmiq.edge-vision-inference.jobs.queue`).
  - Fetches media from `edge-media-store` (internal HTTP) and writes results to DB.
- **DB tables owned**:
  - `inference_results`
- **Outbox events written**:
  - `inference.completed`
- **PVC usage**: None directly (reads images via `edge-media-store`).
- **Boilerplate**: `boilerplates/Backend-python`

### `edge-sync-forwarder` (Node) — Sync owner

- **Purpose**: Reliably send outbox events to cloud using HTTPS with idempotency.
- **APIs (internal edge)**:
  - `GET /api/health`
  - `GET /api/ready` (recommended)
  - `GET /api-docs`
  - `GET /api-docs/openapi.json` (or `openapi.yaml`)
  - `GET /api/v1/sync/state`
  - `POST /api/v1/sync/trigger` (admin/debug)
  - `GET /api/v1/sync/outbox` (admin/debug)
- **DB tables owned**:
  - `sync_outbox` (read/claim/update)
  - `sync_state`
- **Outbox events written**:
  - `sync.batch.sent`
  - `sync.batch.acked`
- **PVC usage**:
  - Uses DB storage on `edge-db-volume` (if DB is hosted locally on PVC).
- **Boilerplate**: `boilerplates/Backend-node`

---

## Implementation Notes

- All Node edge services MUST:
  - Use Winston JSON logging to stdout (collected by Datadog agent).
  - Use `dd-trace` and propagate `x-request-id` and `x-trace-id`.
  - Serve APIs under `/api` with `GET /api/health` and `/api-docs`.
- No external in-memory cache/session store and no object storage are permitted. Durable media storage is via PVC filesystem only.


