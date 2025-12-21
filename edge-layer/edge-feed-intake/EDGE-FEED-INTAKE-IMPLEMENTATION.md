# Edge Feed Intake Service - Implementation Summary

**Date**: 2025-01-02  
**Status**: ✅ **MVP Skeleton Complete**

---

## Files Created

### Root Files
1. `package.json` - Dependencies and scripts
2. `tsconfig.json` - TypeScript configuration
3. `Dockerfile` - Multi-stage build (dev/prod)
4. `openapi.yaml` - OpenAPI specification
5. `README.md` - Service documentation

### Prisma
6. `prisma/schema.prisma` - Database schema:
   - `FeedIntakeLocal` - Feed intake records (local edge storage)
   - `FeedIntakeDedupe` - Deduplication table with TTL
7. `prisma/seed.ts` - Seed file placeholder

### Source Files
8. `src/index.ts` - Express app setup with MQTT consumer and SILO delta service
9. `src/utils/` - logger, datadog, swagger, syncOutbox
10. `src/middlewares/requestContext.ts` - Request ID middleware
11. `src/services/feedIntakeService.ts` - Service layer with CRUD operations and deduplication
12. `src/services/mqttFeedConsumer.ts` - MQTT consumer for feed.dispensed events (Mode A)
13. `src/services/siloDeltaService.ts` - SILO delta computation stub (Mode B)
14. `src/routes/healthRoutes.ts` - Health/ready endpoints

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

## Example MQTT Message + Expected DB Row

### MQTT Message

**Topic**: `iot/event/018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002/018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003/018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004/device-silo-001/feed.dispensed`

**Payload**:
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

### Expected DB Row in `feed_intake_local`

| Column | Value |
|--------|-------|
| `id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e9999` (auto-generated UUID) |
| `tenant_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002` |
| `farm_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003` |
| `barn_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004` |
| `batch_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005` |
| `device_id` | `device-silo-001` |
| `source` | `MQTT_DISPENSED` |
| `feed_formula_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0006` |
| `feed_lot_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0007` |
| `quantity_kg` | `100.5` |
| `occurred_at` | `2025-01-02T06:00:00Z` |
| `event_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001` |
| `ingested_at` | Current timestamp |

### Expected Row in `feed_intake_dedupe`

| Column | Value |
|--------|-------|
| `tenant_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002` |
| `event_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001` |
| `external_ref` | `null` |
| `device_id` | `device-silo-001` |
| `processed_at` | Current timestamp |
| `expires_at` | Current timestamp + 7 days |

### Expected Event in `sync_outbox`

| Column | Value |
|--------|-------|
| `tenant_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002` |
| `farm_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003` |
| `barn_id` | `018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004` |
| `device_id` | `device-silo-001` |
| `event_type` | `feed.intake.recorded` |
| `occurred_at` | `2025-01-02T06:00:00Z` |
| `trace_id` | `trace-001` |
| `payload_json` | JSON containing feed_intake_id, tenant_id, farm_id, barn_id, quantity_kg, occurred_at, etc. |
| `status` | `pending` |

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
- Processed by `cloud-feed-service`

---

## Implementation Status

- ✅ Service scaffolded (Node.js/Express/TypeScript)
- ✅ Database schema (Prisma): `feed_intake_local`, `feed_intake_dedupe`
- ✅ Health/ready/api-docs endpoints
- ✅ MQTT consumer for `feed.dispensed` events (Mode A)
- ✅ SILO delta computation stub (Mode B) - TODO for future implementation
- ✅ Deduplication via `event_id` and `external_ref`
- ✅ sync_outbox writer utility
- ✅ Service layer with CRUD operations
- ⚠️ SILO delta computation logic (stub only)

---

## Next Steps

1. **Implement SILO delta computation (Mode B)**:
   - Subscribe to `silo.weight` telemetry
   - Track previous weight readings
   - Compute delta on weight decrease
   - Create intake records

2. **Add integration tests**:
   - MQTT message processing
   - Deduplication behavior
   - sync_outbox writing

3. **Add cleanup job**:
   - Remove expired rows from `feed_intake_dedupe` (TTL: 7 days)

---

**Last Updated**: 2025-01-02

