# Edge Feed Intake Service

FarmIQ Edge Feed Intake Service - Feed intake ingestion from MQTT and silo telemetry.

## Overview

This service ingests feed intake data from two sources:

- **Mode A**: MQTT `feed.dispensed` events from devices
- **Mode B**: SILO delta computation from `silo.weight` telemetry (TODO - stub implementation)

All feed intake records are:
- Stored locally in `feed_intake_local` table
- Deduplicated using `feed_intake_dedupe` table
- Written to `sync_outbox` as `feed.intake.recorded` events for cloud ingestion

## Port

**5109** (default, configurable via `APP_PORT`)

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

# Node environment
NODE_ENV=development
```

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

Unique constraints:
- `unique_tenant_event` on `(tenant_id, event_id)`
- `unique_tenant_external_ref` on `(tenant_id, external_ref)`

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
- `tenant_id`: `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002`
- `farm_id`: `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003`
- `barn_id`: `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004`
- `device_id`: `device-silo-001`
- `source`: `MQTT_DISPENSED`
- `quantity_kg`: `100.5`
- `occurred_at`: `2025-01-02T06:00:00Z`
- `event_id`: `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001`

**sync_outbox Event:**
- `event_type`: `feed.intake.recorded`
- `payload`: Contains feed_intake_id, tenant_id, farm_id, barn_id, quantity_kg, occurred_at, etc.

### Mode B: SILO Delta Computation (Stub)

**TODO**: Implement delta computation from `silo.weight` telemetry.

The service should:
1. Subscribe to `silo.weight` telemetry from edge-telemetry-timeseries or MQTT
2. Track previous weight readings per silo/device
3. Compute delta when weight decreases (feed dispensed)
4. Create feed intake records via `FeedIntakeService`

Current implementation is a stub with stable interface.

## How to Run

### Local Development

```bash
cd edge-layer/edge-feed-intake
npm install
npm run prisma:generate

# Set environment variables
export DATABASE_URL="postgresql://farmiq:farmiq_dev@localhost:5140/farmiq"
export APP_PORT=5109
export MQTT_BROKER_URL="mqtt://localhost:5100"

# Run migrations
npm run migrate:up

# Start development server
npm run dev
```

### Docker Compose

```yaml
# Add to edge-layer/docker-compose.yml
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

## Endpoints

- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check (DB connectivity)
- `GET /api-docs` - OpenAPI/Swagger UI

## Testing

```bash
# Health check
curl http://localhost:5109/api/health

# Ready check
curl http://localhost:5109/api/ready
```

## Related Documentation

- `docs/iot-layer/03-mqtt-topic-map.md` - MQTT topic map and envelope schema
- `docs/STATUS.md` - Service status and checklist
- `edge-layer/edge-sync-forwarder/README-OUTBOX.md` - sync_outbox table documentation

