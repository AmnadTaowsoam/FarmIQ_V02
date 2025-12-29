Purpose: Gap report + implementation log for edge-layer contracts and production hardening (HTTP+MQTT+outbox).  
Scope: `edge-layer/*` services, plus edge-layer docs and shared API catalog updates.  
Owner: FarmIQ Edge Team  
Status: DOING  
Last updated: 2025-12-29  

---

## GAP REPORT (current repo vs SSOT docs)

SSOT references:
- `docs/edge-layer/01-edge-services.md`
- `docs/edge-layer/02-edge-storage-buffering.md`
- `docs/edge-layer/03-edge-inference-pipeline.md`
- `docs/iot-layer/03-mqtt-topic-map.md`
- `docs/shared/02-observability-datadog.md`
- `docs/shared/00-api-catalog.md`

### Summary (cross-cutting)

- **No SSOT contracts module**: No shared `edge-layer/shared/contracts` package providing canonical TS types + Zod validators for MQTT envelope, standard headers, and event payloads.
- **OpenAPI endpoints incomplete**: Most Node edge services serve Swagger UI at `/api-docs` but do **not** expose `/api-docs/openapi.json` (required by SSOT).
- **Observability inconsistencies**:
  - Some services do not initialize `dd-trace` before app initialization.
  - Not all services propagate `x-trace-id` and log correlation consistently.
- **Outbox idempotency mismatch**:
  - `sync_outbox.id` must be the **event_id** used for cloud idempotency (`tenant_id + event_id`), but at least one producer generates a new UUID instead of using the ingress event id.
- **WeighVision contract mismatch**:
  - Current `edge-weighvision-session` HTTP contract validates IDs as UUIDs, but MQTT topics + SSOT treat device/station/session IDs as **strings** (e.g. `st-01`, `s-123`).
  - Current session service writes to a local `outbox` table instead of the shared `sync_outbox`.

---

## Service-by-service gaps

### `edge-mqtt-broker` (infra)

- Implemented endpoints: N/A (MQTT broker)
- Missing vs docs: N/A
- Contracts: MQTT topic map is doc-only; no shared TS contract module
- DB tables touched: none
- Outbox events written: none
- Observability: broker-level only (outside scope of dd-trace)

### `edge-ingress-gateway` (Node)

- Implemented endpoints:
  - `GET /api/health`
  - `GET /api/ready`
  - `GET /api/v1/ingress/stats`
  - `POST /api/v1/media/images` (returns `410`)
  - `POST /api/v1/media/images/presign` (proxy to `edge-media-store`)
  - `GET /api-docs` (Swagger UI)
- Missing vs docs:
  - `GET /api-docs/openapi.json`
  - SSOT does **not** list media endpoints on ingress (devices call `edge-media-store` directly); current proxy endpoint is a contract mismatch.
- Contracts missing:
  - Shared MQTT envelope schema + event payload schemas (ingress has an internal schema, but not SSOT exported).
  - Shared standard header schema (`x-tenant-id`, `x-request-id`, `x-trace-id`).
- DB tables touched:
  - `ingress_dedupe` (required; TTL via `expires_at`)
  - `device_allowlist`, `station_allowlist` (extra: not in SSOT)
  - `device_last_seen` (extra: not in SSOT)
- Outbox events written: none (correct)
- Observability:
  - `dd-trace` initialized early (✅)
  - Logging: mostly IDs + event_type; no payload logging observed (✅)

### `edge-telemetry-timeseries` (Node)

- Implemented endpoints (base path `/api`):
  - `GET /api/health`
  - `GET /api/ready`
  - `POST /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/aggregates`
  - `GET /api/v1/telemetry/metrics`
  - `GET /api-docs` (Swagger UI)
- Missing vs docs:
  - `GET /api-docs/openapi.json`
- Contracts missing:
  - Shared TelemetryReading event/payload schema for ingestion body and outbox event payloads.
- DB tables touched:
  - `telemetry_raw`, `telemetry_agg` (owned)
  - `sync_outbox` (writes via raw SQL)
- Outbox events written:
  - Writes `telemetry.ingested`, but **uses a generated UUID** instead of using the ingress `event_id` as `sync_outbox.id` (idempotency mismatch).
- Observability:
  - `dd-trace` initialized early (✅)
  - `x-trace-id` propagation: request context middleware sets only `x-request-id` (❌)
  - Logging: does not log full payload (✅)

### `edge-weighvision-session` (Node)

- Implemented endpoints (base path `/api`):
  - `GET /api/health`
  - `GET /api/ready`
  - `POST /api/v1/weighvision/sessions`
  - `GET /api/v1/weighvision/sessions/{sessionId}`
  - `POST /api/v1/weighvision/sessions/{sessionId}/bind-weight`
  - `POST /api/v1/weighvision/sessions/{sessionId}/bind-media`
  - `POST /api/v1/weighvision/sessions/{sessionId}/finalize`
  - `GET /api-docs` (Swagger UI)
- Missing vs docs:
  - `GET /api-docs/openapi.json`
  - SSOT contract expects `POST /api/v1/weighvision/sessions/{sessionId}/finalize` only (bind endpoints are optional/extra; currently present).
- Contracts / implementation mismatches:
  - Validates `tenantId`, `deviceId`, `stationId`, `sessionId` as UUIDs; SSOT MQTT topics use string identifiers (e.g. `st-01`, `s-123`) (❌).
  - Emits domain events into a local `outbox` table, not the shared `sync_outbox` required for `edge-sync-forwarder` (❌).
  - Trace handling uses `requestId` as trace id in several places (❌).
- DB tables touched:
  - `weight_sessions`, `session_weights`, `session_media_bindings`
  - `outbox` (local; should be replaced by `sync_outbox`)
- Outbox events written:
  - `weighvision.session.created`, `weighvision.session.finalized` (but written to `outbox`, not `sync_outbox`) (❌)
- Observability:
  - No early `dd-trace` init at app start (❌)
  - Does not set `x-trace-id` header (❌)

### `edge-sync-forwarder` (Node)

- Implemented endpoints:
  - `GET /api/health`
  - `GET /api/ready`
  - `GET /api/v1/sync/state`
  - `POST /api/v1/sync/trigger`
  - Admin-gated:
    - `GET /api/v1/sync/outbox`
    - `GET /api/v1/sync/dlq`
    - `POST /api/v1/sync/redrive`
    - `POST /api/v1/sync/unclaim-stuck`
  - `GET /api-docs` (Swagger UI)
- Missing vs docs:
  - `GET /api-docs/openapi.json`
  - SSOT names redrive endpoint as `POST /api/v1/sync/dlq/redrive` (catalog) vs current `POST /api/v1/sync/redrive` (mismatch).
- Contracts missing:
  - Shared outbox envelope/payload schema for cloud batch send.
- DB tables touched:
  - `sync_outbox`, `sync_outbox_dlq`
- Outbox events written: none (correct; forwarder consumes only)
- Observability:
  - A `dd-trace` util exists, but is not imported at process start (❌)
  - Logs are structured; no payload logging observed (✅)
- Claim/lease algorithm:
  - `claimBatch()` uses `status IN ('pending','claimed')`, `next_attempt_at <= now`, lease expiry, `ORDER BY priority DESC, occurred_at ASC`, `FOR UPDATE SKIP LOCKED` (✅ matches SSOT).

### `edge-media-store` (Node) — P1

- Implemented endpoints:
  - `GET /api/health`
  - `GET /api/ready`
  - `POST /api/v1/media/images/presign`
  - `GET /api-docs` (Swagger UI)
- Missing vs docs:
  - `GET /api-docs/openapi.json`
  - `GET /api/v1/media/objects/{objectId}` and `/meta`
  - `media_objects` persistence and `media.stored` outbox event
- DB tables touched:
  - Current Prisma schema has only `Example` (❌ missing `media_objects`)
- Outbox events written: none (❌ expected `media.stored`)
- Observability:
  - `dd-trace` util exists but needs early init verification

### `edge-vision-inference` (Python) — P1

- Implemented endpoints:
  - `GET /api/health`
  - `GET /api-docs` (FastAPI Swagger UI)
  - `GET /api-docs/openapi.json` (FastAPI)
  - `POST /api/v1/inference/jobs` (per docs)
- Missing vs docs:
  - `GET /api/ready` (if not implemented)
  - Verify internal call to media-store is via HTTP `GET /api/v1/media/objects/{objectId}`
- DB tables touched:
  - `inference_results`, and it also creates `sync_outbox` table in app init (risk of schema drift vs SSOT)
- Outbox events written:
  - `inference.completed` (verify idempotency key usage)
- Observability:
  - ddtrace init and safe logging needs verification

### `edge-policy-sync` / `edge-retention-janitor` / `edge-observability-agent`

- Implemented endpoints broadly match `docs/shared/00-api-catalog.md` (health/ready/api-docs + service-specific endpoints).
- Missing vs docs:
  - `GET /api-docs/openapi.json` for Node services
- Contracts missing:
  - Shared header schema and standard error schema
- Observability:
  - `dd-trace` util exists; needs consistency checks for early init + `x-trace-id`.

### `edge-feed-intake`

- Implemented endpoints:
  - `GET /api/health`, `GET /api/ready`, `GET /api-docs` (Swagger UI)
- Missing vs docs:
  - `GET /api-docs/openapi.json`
- DB tables touched:
  - `feed_intake_local`, `feed_intake_dedupe` (per Prisma), writes `sync_outbox`
- Outbox events written:
  - `feed.intake.recorded` (verify `sync_outbox.id` = event_id)
- Observability:
  - `dd-trace` init is conditional on `DD_SERVICE`; ensure SSOT alignment (should be initialized consistently in prod)

---

## P0 Plan (next steps)

1) Create `edge-layer/shared/contracts` (TS + Zod validators + tests)  
2) Add `/api-docs/openapi.json` to all Node edge services (serve JSON derived from their `openapi.yaml`)  
3) Fix `edge-ingress-gateway` routing + contract mismatches (especially WeighVision routing + media proxy mismatch)  
4) Fix `edge-telemetry-timeseries` outbox idempotency (`sync_outbox.id = event_id`) and header propagation (`x-trace-id`)  
5) Verify `edge-sync-forwarder` status/claim/lease/backoff matches SSOT and align endpoints with catalog  

---

## Implemented (P0.1 → P0.5)

- **Contracts baseline**: added `edge-layer/shared/contracts/src/index.ts` + schemas under `edge-layer/shared/contracts/src/`.
- **OpenAPI contract plumbing**: Node edge services now expose `GET /api-docs/openapi.json` (in addition to Swagger UI at `/api-docs`).
- **Ingress hardening**:
  - No longer logs DB URL secrets.
  - No longer logs downstream response bodies.
  - Media presign proxy endpoint is now deprecated and returns `410` (devices call `edge-media-store` directly).
- **Telemetry hardening**:
  - Propagates `x-trace-id`.
  - Writes `sync_outbox.id = event_id` for `telemetry.ingested`.
- **WeighVision hardening**:
  - Accepts string IDs (`sessionId`, `stationId`, `deviceId`) consistent with MQTT topic segments.
  - Writes `weighvision.session.created/finalized` to `sync_outbox` using ingress `eventId` as `sync_outbox.id`.
- **Sync-forwarder hardening**:
  - Initializes `dd-trace` at process start.
  - Adds request/trace context middleware.
  - Supports `POST /api/v1/sync/dlq/redrive` (alias of existing redrive).

---

## Evidence (docker compose + curl)

### Start services

```bash
docker compose -f edge-layer/docker-compose.yml -f edge-layer/docker-compose.dev.yml build \
  edge-ingress-gateway edge-telemetry-timeseries edge-weighvision-session edge-sync-forwarder

docker compose -f edge-layer/docker-compose.yml -f edge-layer/docker-compose.dev.yml up -d
```

### Health / Ready / OpenAPI

```bash
curl -fsS http://localhost:5103/api/health
curl -fsS http://localhost:5103/api/ready
curl -fsS http://localhost:5103/api-docs/openapi.json | head

curl -fsS http://localhost:5104/api/health
curl -fsS http://localhost:5104/api/ready
curl -fsS http://localhost:5104/api-docs/openapi.json | head

curl -fsS http://localhost:5105/api/health
curl -fsS http://localhost:5105/api/ready
curl -fsS http://localhost:5105/api-docs/openapi.json | head

curl -fsS http://localhost:5108/api/health
curl -fsS http://localhost:5108/api/ready
curl -fsS http://localhost:5108/api-docs/openapi.json | head
```

### Telemetry ingest (via internal HTTP)

```bash
curl -fsS -X POST http://localhost:5104/api/v1/telemetry/readings \
  -H 'content-type: application/json' \
  -H 'x-request-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001' \
  -H 'x-trace-id: trace-telemetry-1' \
  -d '{
    "events":[
      {
        "schema_version":"1.0",
        "event_id":"018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
        "trace_id":"trace-telemetry-1",
        "tenant_id":"t-001",
        "device_id":"d-001",
        "event_type":"telemetry.reading",
        "ts":"2025-12-17T01:00:00Z",
        "farm_id":"f-001",
        "barn_id":"b-001",
        "payload":{"metric":"temperature","value":26.4,"unit":"C"}
      }
    ]
  }'
```

### WeighVision session create/finalize (internal HTTP)

```bash
curl -fsS -X POST http://localhost:5105/api/v1/weighvision/sessions \
  -H 'content-type: application/json' \
  -H 'x-request-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0200' \
  -H 'x-trace-id: trace-wv-1' \
  -d '{
    "sessionId":"s-123",
    "eventId":"018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0200",
    "tenantId":"t-001",
    "farmId":"f-001",
    "barnId":"b-001",
    "deviceId":"wv-001",
    "stationId":"st-01",
    "startAt":"2025-12-17T01:05:00Z"
  }'

curl -fsS -X POST http://localhost:5105/api/v1/weighvision/sessions/s-123/finalize \
  -H 'content-type: application/json' \
  -H 'x-request-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0201' \
  -H 'x-trace-id: trace-wv-2' \
  -d '{
    "tenantId":"t-001",
    "eventId":"018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0201",
    "occurredAt":"2025-12-17T01:10:00Z"
  }'
```

### Sync-forwarder state + trigger

```bash
curl -fsS http://localhost:5108/api/v1/sync/state
curl -fsS -X POST http://localhost:5108/api/v1/sync/trigger
```

---

## Implemented (P1): Media → Inference → Session bind → Outbox

### End-to-end happy path (dev)

Assumptions:
- `edge-media-store` is configured with MinIO (`MEDIA_ENDPOINT`, `MEDIA_BUCKET`, credentials).
- `edge-sync-forwarder` created the `sync_outbox` table (producers only insert).
- Optional: `TRIGGER_INFERENCE_ON_COMPLETE=true` on `edge-media-store` to auto-trigger inference.

1) Presign → PUT upload

```bash
PRESIGN_JSON=$(curl -fsS -X POST http://localhost:5106/api/v1/media/images/presign \\
  -H 'content-type: application/json' \\
  -H 'x-tenant-id: t-001' \\
  -H 'x-request-id: req-presign-1' \\
  -H 'x-trace-id: trace-media-1' \\
  -d '{\"tenant_id\":\"t-001\",\"farm_id\":\"f-001\",\"barn_id\":\"b-001\",\"device_id\":\"wv-001\",\"content_type\":\"image/jpeg\",\"filename\":\"frame.jpg\"}')\n+\n+UPLOAD_URL=$(echo \"$PRESIGN_JSON\" | jq -r .upload_url)\n+OBJECT_KEY=$(echo \"$PRESIGN_JSON\" | jq -r .object_key)\n+\n+curl -fsS -X PUT \"$UPLOAD_URL\" -H 'Content-Type: image/jpeg' --data-binary @./tests/fixtures/frame.jpg\n+```\n+\n+2) Complete upload (verifies via S3 HEAD, persists `media_objects`, emits `media.stored`)\n+\n+```bash\n+COMPLETE_JSON=$(curl -fsS -X POST http://localhost:5106/api/v1/media/images/complete \\\n+  -H 'content-type: application/json' \\\n+  -H 'x-tenant-id: t-001' \\\n+  -H 'x-request-id: req-complete-1' \\\n+  -H 'x-trace-id: trace-media-2' \\\n+  -d \"{\\\"tenant_id\\\":\\\"t-001\\\",\\\"farm_id\\\":\\\"f-001\\\",\\\"barn_id\\\":\\\"b-001\\\",\\\"device_id\\\":\\\"wv-001\\\",\\\"object_key\\\":\\\"$OBJECT_KEY\\\",\\\"mime_type\\\":\\\"image/jpeg\\\",\\\"session_id\\\":\\\"s-123\\\"}\")\n+\n+MEDIA_ID=$(echo \"$COMPLETE_JSON\" | jq -r .media_id)\n+EVENT_ID=$(echo \"$COMPLETE_JSON\" | jq -r .event_id)\n+echo \"media_id=$MEDIA_ID event_id=$EVENT_ID\"\n+```\n+\n+3) Inference job (manual trigger if not auto-triggered)\n+\n+```bash\n+curl -fsS -X POST http://localhost:8000/api/v1/inference/jobs \\\n+  -H 'content-type: application/json' \\\n+  -H 'x-tenant-id: t-001' \\\n+  -H 'x-request-id: req-infer-1' \\\n+  -H 'x-trace-id: trace-infer-1' \\\n+  -d \"{\\\"tenant_id\\\":\\\"t-001\\\",\\\"farm_id\\\":\\\"f-001\\\",\\\"barn_id\\\":\\\"b-001\\\",\\\"device_id\\\":\\\"wv-001\\\",\\\"session_id\\\":\\\"s-123\\\",\\\"media_id\\\":\\\"$MEDIA_ID\\\"}\"\n+```\n+\n+4) Session bind (if you want explicit attach, or for manual backfill)\n+\n+```bash\n+curl -fsS -X POST http://localhost:5105/api/v1/weighvision/sessions/s-123/attach \\\n+  -H 'content-type: application/json' \\\n+  -H 'x-tenant-id: t-001' \\\n+  -H 'x-request-id: req-attach-1' \\\n+  -H 'x-trace-id: trace-attach-1' \\\n+  -d \"{\\\"media_id\\\":\\\"$MEDIA_ID\\\"}\"\n+```\n+\n+5) Verify outbox backlog and trigger send\n+\n+```bash\n+curl -fsS http://localhost:5108/api/v1/sync/state\n+curl -fsS -X POST http://localhost:5108/api/v1/sync/trigger\n+```
