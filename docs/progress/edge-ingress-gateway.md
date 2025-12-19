Purpose: Progress report and evidence checklist for `edge-ingress-gateway`.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-19  

---

# edge-ingress-gateway — Progress Report (Round 1)

## Scope implemented

- MQTT-only device → edge ingestion (no HTTP telemetry ingestion).
- Subscribes to canonical topics from `docs/iot-layer/03-mqtt-topic-map.md`.
- Validates MQTT envelope (required fields + schema_version enforcement; generates `trace_id` if missing).
- Enforces allowlists:
  - telemetry/event/status: `device_allowlist`
  - weighvision: `station_allowlist` (station_id is treated as a separate identity from device_id)
- Deduplicates by `(tenant_id, event_id)` via `ingress_dedupe` (Edge DB; no Redis; TTL with `expires_at`).
- Routes validated messages to internal edge services via HTTP:
  - Telemetry → `edge-telemetry-timeseries` `POST /api/v1/telemetry/readings`
  - WeighVision events → `edge-weighvision-session` session APIs
- Updates device last-seen from retained status messages: `device_last_seen`.
- Exposes ops/admin endpoints only.

## Endpoints

- `GET /api/health` → `OK`
- `GET /api/ready` → JSON readiness (DB + MQTT connectivity)
- `GET /api/v1/ingress/stats` → counters + MQTT connectivity snapshot
- `GET /api-docs` → Swagger UI from `openapi.yaml`

## MQTT topics subscribed (QoS 1)

- `iot/telemetry/+/+/+/+/+`
- `iot/event/+/+/+/+/+`
- `iot/weighvision/+/+/+/+/session/+/+`
- `iot/status/+/+/+/+` (retained status)

## Envelope validation (MQTT)

Required fields:
- `schema_version`
- `event_id`
- `tenant_id`
- `device_id`
- `event_type`
- `ts` (ISO-8601)
- `payload`
- `trace_id` (if missing, gateway generates and logs it)

Notes:
- For migration only: if `ts` is missing but `occurred_at` is present, the gateway treats `occurred_at` as `ts` and logs a warning.

Schema version rule:
- `schema_version` must be `"1.0"`; anything else is dropped.

## Edge DB tables (MVP)

- `ingress_dedupe(tenant_id, event_id, first_seen_at, expires_at, topic, hash)`
  - Unique: `(tenant_id, event_id)`
  - If `expires_at > now()`: message is dropped as deduped.
  - Cleanup: best-effort timer deletes rows where `expires_at < now()`.
- `device_allowlist(tenant_id, device_id, farm_id?, barn_id?, enabled, notes)`
  - Telemetry/event/status topics are dropped if device is missing/disabled or scope mismatch.
- `station_allowlist(tenant_id, station_id, farm_id?, barn_id?, enabled, notes)`
  - WeighVision topics are dropped if station is missing/disabled or scope mismatch.
- `device_last_seen(tenant_id, device_id, last_seen_at, last_topic, last_payload_hash, updated_at)`
  - Updated from retained status messages.

Note: Tables are created on startup if missing (no Prisma migration dependency).

## Environment variables

Required:
- `APP_PORT` (container port, must be `3000` in compose)
- `DATABASE_URL` (edge Postgres)
- `MQTT_BROKER_URL` (default `mqtt://localhost:5100`; in compose `mqtt://edge-mqtt-broker:1883`)

Optional:
- `MQTT_CLIENT_ID` (default `edge-ingress-gateway`)
- `MQTT_USERNAME`, `MQTT_PASSWORD`
- `EDGE_TELEMETRY_TIMESERIES_URL` (default `http://edge-telemetry-timeseries:3000`)
- `EDGE_WEIGHVISION_SESSION_URL` (default `http://edge-weighvision-session:3000`)
- `DOWNSTREAM_TIMEOUT_MS` (default `5000`)
- `DEDUPE_TTL_MS` (default `259200000` = 72 hours)
- `DEDUPE_CLEANUP_INTERVAL_MS` (default `60000`)

## Evidence steps (local dev)

### 1) Build ✅

From repo root:

```powershell
cd edge-layer
docker compose build edge-ingress-gateway
```

**Expected**: Build succeeds without errors.

Note: Requires Docker Desktop/Engine running (the `docker` CLI must be able to reach the daemon).

### 2) Run + health checks ✅

```powershell
cd edge-layer
docker compose up -d edge-mqtt-broker edge-ingress-gateway

# Health check
curl http://localhost:5103/api/health
# Expected: "OK" (200 OK)

# Ready check
curl http://localhost:5103/api/ready
# Expected: {"status":"ready","db":"up","mqtt":true} (200 OK)

# API docs
curl http://localhost:5103/api-docs
# Expected: Swagger UI HTML

# Stats endpoint
curl http://localhost:5103/api/v1/ingress/stats
# Expected: JSON with counters and MQTT connectivity status
```

**Expected results**:
- Health endpoint returns `200 OK`
- Ready endpoint returns `{"status":"ready","db":"up","mqtt":true}` when both DB and MQTT are connected
- API docs accessible at `/api-docs`
- Stats endpoint shows message counters and MQTT connection status

### 3) Publish a sample MQTT telemetry message ✅

**Prerequisites**: Seed allowlist in database (see Allowlist seeding section below).

Option A (npm script):

```powershell
cd edge-layer/edge-ingress-gateway
npm run publish:sample
```

Option B (`mosquitto_pub`):

```powershell
mosquitto_pub -h localhost -p 5100 -q 1 `
  -t "iot/telemetry/t-001/f-001/b-001/d-001/temperature" `
  -m "{\"schema_version\":\"1.0\",\"event_id\":\"e-001\",\"trace_id\":\"trace-e-001\",\"tenant_id\":\"t-001\",\"device_id\":\"d-001\",\"event_type\":\"telemetry.reading\",\"ts\":\"2025-12-18T00:00:00Z\",\"payload\":{\"value\":26.4,\"unit\":\"C\"}}"
```

**Expected results**:
- `edge-ingress-gateway` logs show message received and processed
- Message is validated, deduplicated, and routed to downstream service
- If `edge-telemetry-timeseries` is running, gateway calls `POST /api/v1/telemetry/readings`
- Stats endpoint shows incremented message counters
- Database `ingress_dedupe` table contains the event (if not already seen)
- Database `device_last_seen` table is updated (for status messages)

### 4) Verify message routing ✅

With downstream services running:

```powershell
# Start downstream services
docker compose up -d edge-telemetry-timeseries edge-weighvision-session

# Publish telemetry message (see step 3)
# Check edge-telemetry-timeseries logs for received message
docker compose logs edge-telemetry-timeseries | Select-String "telemetry"

# Publish weighvision message
mosquitto_pub -h localhost -p 5100 -q 1 `
  -t "iot/weighvision/t-001/f-001/b-001/st-01/session/sess-001/session.created" `
  -m "{\"schema_version\":\"1.0\",\"event_id\":\"e-002\",\"trace_id\":\"trace-e-002\",\"tenant_id\":\"t-001\",\"device_id\":\"st-01\",\"event_type\":\"session.created\",\"ts\":\"2025-12-18T00:00:00Z\",\"payload\":{}}"

# Check edge-weighvision-session logs
docker compose logs edge-weighvision-session | Select-String "session"
```

**Expected results**:
- Telemetry messages are routed to `edge-telemetry-timeseries`
- WeighVision messages are routed to `edge-weighvision-session`
- Status messages update `device_last_seen` table
- All messages are deduplicated by `(tenant_id, event_id)`

## Allowlist seeding (required for local testing)

The gateway drops telemetry/event/status messages unless the device exists + enabled in `device_allowlist`.

Example:

```sql
insert into device_allowlist (tenant_id, device_id, farm_id, barn_id, enabled, notes)
values ('t-001', 'd-001', 'f-001', 'b-001', true, 'dev allowlist');

insert into station_allowlist (tenant_id, station_id, farm_id, barn_id, enabled, notes)
values ('t-001', 'st-01', 'f-001', 'b-001', true, 'dev allowlist');
```

## Quick DB verification (psql)

```sql
select tenant_id, event_id, first_seen_at, expires_at, topic
from ingress_dedupe
order by first_seen_at desc
limit 20;

select tenant_id, device_id, last_seen_at, last_topic
from device_last_seen
order by last_seen_at desc
limit 20;
```
