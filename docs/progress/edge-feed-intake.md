# Service Progress: edge-feed-intake

**Service**: edge-feed-intake  
**Layer**: edge  
**Status**: done  
**Owner**: CursorAI  
**Last Updated**: 2025-02-04 (Tests added)

---

## Overview

Edge feed intake service that ingests feed intake data from two sources:
- **Mode A**: MQTT `feed.dispensed` events from devices
- **Mode B**: SILO delta computation from `silo.weight` telemetry

All feed intake records are stored locally, deduplicated, and written to `sync_outbox` for cloud ingestion.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 {"status":"ready"}` (with DB connectivity check) or `503` if DB unavailable
- `GET /api-docs` → OpenAPI/Swagger UI

---

## Database Tables

### feed_intake_local
Stores feed intake records locally on edge.

- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid, nullable)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `device_id` (uuid, nullable)
- `source` (string: MANUAL, API_IMPORT, SILO_AUTO, MQTT_DISPENSED)
- `feed_formula_id` (uuid, nullable)
- `feed_lot_id` (uuid, nullable)
- `quantity_kg` (decimal)
- `occurred_at` (datetime)
- `ingested_at` (datetime)
- `event_id` (uuid, nullable, unique)
- `external_ref` (string, nullable)
- `sequence` (integer, nullable)
- `notes` (text, nullable)
- `created_at`, `updated_at`

Unique constraints:
- `unique_tenant_event` on `(tenant_id, event_id)`
- `unique_tenant_external_ref` on `(tenant_id, external_ref)`

Indexes:
- `(tenant_id, barn_id, occurred_at desc)`
- `(tenant_id, device_id, occurred_at desc)`

### feed_intake_dedupe
Deduplication table with TTL (7 days).

- `id` (uuid, pk)
- `tenant_id` (uuid)
- `event_id` (uuid)
- `external_ref` (string, nullable)
- `device_id` (uuid, nullable)
- `processed_at` (datetime)
- `expires_at` (datetime)

Unique constraint: `unique_tenant_event_dedupe` on `(tenant_id, event_id)`

Indexes:
- `(tenant_id, external_ref)`
- `(expires_at)`

### silo_weight_snapshot
Tracks previous silo weight readings for delta computation (Mode B).

- `id` (uuid, pk)
- `tenant_id` (uuid)
- `device_id` (uuid)
- `weight_kg` (decimal)
- `recorded_at` (datetime)
- `created_at`, `updated_at`

Unique constraint: `unique_tenant_device_silo` on `(tenant_id, device_id)`

Indexes:
- `(tenant_id, device_id, recorded_at desc)`

---

## Ingestion Modes

### Mode A: MQTT feed.dispensed Events

Subscribes to: `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/feed.dispensed`

**Example MQTT Message:**
```json
{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "trace_id": "trace-001",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "device-silo-001",
  "event_type": "feed.dispensed",
  "ts": "2025-01-02T06:00:00Z",
  "payload": {
    "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batch_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
    "quantity_kg": 100.5,
    "feed_formula_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0006",
    "feed_lot_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0007"
  }
}
```

**Expected DB Row in `feed_intake_local`:**
- `source`: `MQTT_DISPENSED`
- `event_id`: `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001`
- `quantity_kg`: `100.5`

### Mode B: SILO Delta Computation

Subscribes to: `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/silo.weight`

**Delta Computation Logic:**
1. Retrieve previous weight from `silo_weight_snapshot` table
2. Compute delta = previousWeight - currentWeight (only if weight decreased)
3. If delta >= threshold (0.1kg), create intake record with `source: SILO_AUTO`
4. Update weight snapshot

**Example Telemetry Message:**
```json
{
  "schema_version": "1.0",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "device-silo-001",
  "ts": "2025-01-02T10:00:00Z",
  "payload": {
    "metric_type": "silo.weight",
    "metric_value": 950.5,
    "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004"
  }
}
```

**If previous weight was 1000.0kg:**
- Delta: 1000.0 - 950.5 = 49.5kg
- Creates intake record: `source: SILO_AUTO`, `quantity_kg: 49.5`

---

## Deduplication Strategy

1. **By `event_id`**: Primary deduplication key
   - Unique constraint: `unique_tenant_event` on `(tenant_id, event_id)`
   - Also tracked in `feed_intake_dedupe` table with TTL (7 days)

2. **By `external_ref`**: Secondary deduplication key
   - Unique constraint: `unique_tenant_external_ref` on `(tenant_id, external_ref)`

3. **Idempotency**: Same `event_id` or `external_ref` returns existing record without creating duplicates

---

## Output Event

All feed intake records produce `feed.intake.recorded` events in `sync_outbox`:
- Consumed by `edge-sync-forwarder`
- Forwarded to `cloud-ingestion`
- Processed by `cloud-feed-service` (via RabbitMQ)

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=5109

# Optional - MQTT consumer (Mode A)
MQTT_BROKER_URL=mqtt://localhost:5100
MQTT_CLIENT_ID=edge-feed-intake
MQTT_USERNAME=farmiq
MQTT_PASSWORD=farmiq_dev

# Optional - Datadog
DD_SERVICE=edge-feed-intake
DD_ENV=development
COMMIT_ID=unknown

NODE_ENV=development
```

---

## How to Run in Docker Compose

Add to `edge-layer/docker-compose.yml`:

```yaml
edge-feed-intake:
  build:
    context: ./edge-feed-intake
  container_name: farmiq-edge-feed-intake
  ports:
    - "5109:5109"
  environment:
    - DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
    - APP_PORT=5109
    - MQTT_BROKER_URL=mqtt://mqtt-broker:5100
    - MQTT_CLIENT_ID=edge-feed-intake
    - DD_SERVICE=edge-feed-intake
    - DD_ENV=development
  depends_on:
    - postgres
    - mqtt-broker
  profiles:
    - edge
```

Run:
```bash
cd edge-layer
docker compose --profile edge up edge-feed-intake --build
```

---

## Evidence Commands

```powershell
# Health check
curl http://localhost:5109/api/health

# Ready check
curl http://localhost:5109/api/ready

# Check service logs for MQTT connection
docker logs farmiq-edge-feed-intake | Select-String "MQTT"

# Check service logs for SILO delta service
docker logs farmiq-edge-feed-intake | Select-String "SILO"
```

---

## Implementation Checklist

- [x] Service scaffolded (Node.js/Express/TypeScript)
- [x] Database schema (Prisma): `feed_intake_local`, `feed_intake_dedupe`, `silo_weight_snapshot`
- [x] Health/ready/api-docs endpoints
- [x] MQTT consumer for `feed.dispensed` events (Mode A)
- [x] SILO delta computation (Mode B) - MQTT subscription to `silo.weight` telemetry
- [x] Deduplication via `event_id` and `external_ref`
- [x] sync_outbox writer utility
- [x] Service layer with CRUD operations
- [x] Docker compose integration
- [x] Progress documented

---

## Patch Plan: SILO_AUTO Ingestion Implementation (2025-02-04)

### What Changed

1. **Added SiloWeightSnapshot Table** (`prisma/schema.prisma`):
   - Tracks previous weight readings per `(tenant_id, device_id)`
   - Used for delta computation

2. **Implemented SILO Delta Service** (`src/services/siloDeltaService.ts`):
   - Subscribes to `iot/telemetry/+/+/+/+/silo.weight` MQTT topic
   - Computes delta when weight decreases (feed dispensed)
   - Creates intake records if delta >= threshold (0.1kg)
   - Updates weight snapshot after processing

3. **Updated Service Startup** (`src/index.ts`):
   - Initializes SILO delta service with MQTT config
   - Starts MQTT subscription on service start

### How to Validate

```powershell
# 1. Start service with MQTT broker
cd edge-layer
docker compose --profile edge up edge-feed-intake mqtt-broker postgres -d

# 2. Check service health
curl http://localhost:5109/api/health

# 3. Publish silo.weight telemetry via MQTT
# Topic: iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/silo.weight
# Message:
{
  "schema_version": "1.0",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "device_id": "device-silo-001",
  "ts": "2025-02-04T10:00:00Z",
  "payload": {
    "metric_type": "silo.weight",
    "metric_value": 1000.0,
    "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004"
  }
}

# 4. Publish second reading (weight decreased)
# metric_value: 950.5
# Should create intake record with delta: 49.5kg

# 5. Verify intake record created
# Check feed_intake_local table or sync_outbox
```

### Evidence Commands

```powershell
# Health check
curl http://localhost:5109/api/health

# Ready check
curl http://localhost:5109/api/ready

# Check logs for MQTT subscription
docker logs farmiq-edge-feed-intake | Select-String "silo.weight"
```

---

## Tests

### Unit Tests

Tests are located in `tests/` directory:

- `tests/services/feedIntakeService.spec.ts` - Tests for feed intake service
  - Deduplication by `event_id`
  - Deduplication by `external_ref`
  - Record creation and listing
- `tests/services/siloDeltaService.spec.ts` - Tests for silo delta computation
  - Weight decrease detection
  - Delta threshold enforcement
  - Snapshot updates

### Running Tests

```powershell
# Run all tests
cd edge-layer/edge-feed-intake
npm test

# Run with coverage
npm run test:coverage
```

### Test Coverage

- ✅ Deduplication logic (event_id uniqueness)
- ✅ Deduplication logic (external_ref uniqueness)
- ✅ Silo delta computation (weight decrease detection)
- ✅ Silo delta computation (threshold enforcement)
- ✅ Record listing with filters

---

## Related Documentation

- `docs/shared/01-api-standards.md` - API standards
- `docs/iot-layer/03-mqtt-topic-map.md` - MQTT topic conventions
- `docs/contracts/events-feed-and-barn.contract.md` - Event contracts
- `docs/STATUS.md` - Overall project status
- `edge-layer/edge-feed-intake/EDGE-FEED-INTAKE-IMPLEMENTATION.md` - Implementation details

