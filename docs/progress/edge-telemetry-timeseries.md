# Service Progress: edge-telemetry-timeseries

**Service**: edge-telemetry-timeseries  
**Layer**: edge  
**Status**: done  
**Owner**: Antigravity  
**Last Updated**: 2025-01-18

---

## Overview

Edge telemetry time-series service for FarmIQ. Receives telemetry readings via HTTP from `edge-ingress-gateway`, persists to database, and provides query APIs. Includes aggregation job (5m and 1h buckets) and outbox events for `edge-sync-forwarder`.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 {"status":"healthy"}`
- `GET /api/ready` → `200 {"status":"ready"}` (with DB connectivity check) or `503` if DB unavailable
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints

#### Ingest Telemetry Readings
- `POST /api/v1/telemetry/readings` → Ingest telemetry readings batch
  - Request body: `{ "events": [TelemetryEnvelope, ...] }`
  - Response: `{ "accepted": number, "duplicated": number }`
  - Validates envelope per mqtt-topic-map schema
  - Idempotent via unique constraint `(tenantId, eventId)`

#### Get Telemetry Readings
- `GET /api/v1/telemetry/readings?tenantId=...&farmId=...&barnId=...&deviceId=...&metric=...&from=...&to=...&limit=...` → Get telemetry readings with filters
  - Required: `tenantId`
  - Optional filters: `farmId`, `barnId`, `deviceId`, `metric`, `from` (ISO date-time), `to` (ISO date-time)
  - `limit`: max 10000 (default: 1000)

#### Get Telemetry Aggregates
- `GET /api/v1/telemetry/aggregates?tenantId=...&farmId=...&barnId=...&deviceId=...&metric=...&from=...&to=...&bucket=5m|1h` → Get telemetry aggregates
  - Required: `tenantId`, `from`, `to`
  - Optional filters: `farmId`, `barnId`, `deviceId`, `metric`
  - `bucket`: aggregation window size (`5m`, `1h`), default: all buckets

#### Get Available Metrics
- `GET /api/v1/telemetry/metrics?tenantId=...&farmId=...&barnId=...&deviceId=...` → Get list of available metrics
  - Required: `tenantId`
  - Optional filters: `farmId`, `barnId`, `deviceId`
  - Response: `{ "metrics": ["temperature", "humidity", ...] }`

#### Trigger Aggregation (Manual)
- `POST /api/v1/telemetry/aggregates/trigger` → Manually trigger aggregation job
  - Request body: `{ "bucket": "5m" | "1h" }`
  - Response: `{ "message": "Aggregation triggered for 5m", "traceId": "..." }`

---

## Database Tables

### telemetry_raw
- `id` (uuid, pk)
- `tenantId` (string)
- `farmId` (string)
- `barnId` (string)
- `deviceId` (string)
- `metric` (string) - e.g., "temperature", "humidity", "weight"
- `value` (decimal(10,2))
- `unit` (string, nullable) - e.g., "C", "F", "%", "kg"
- `occurredAt` (timestamp)
- `traceId` (string)
- `eventId` (string) - For deduplication
- `createdAt` (timestamp)
- Unique: `(tenantId, eventId)`
- Indexes: `(tenantId, occurredAt DESC)`, `(tenantId, deviceId, metric, occurredAt DESC)`

### telemetry_agg
- `id` (uuid, pk)
- `tenantId` (string)
- `farmId` (string)
- `barnId` (string)
- `deviceId` (string)
- `metric` (string)
- `bucketStart` (timestamp) - Start of aggregation window
- `bucketSize` (string) - e.g., "5m", "1h"
- `avg` (decimal(10,2))
- `min` (decimal(10,2))
- `max` (decimal(10,2))
- `count` (int) - Number of samples in bucket
- `createdAt` (timestamp)
- Unique: `(tenantId, farmId, barnId, deviceId, metric, bucketStart, bucketSize)`
- Indexes: `(tenantId, bucketStart DESC)`

### outbox
- `id` (uuid, pk)
- `eventType` (string) - e.g., "telemetry.ingested", "telemetry.aggregated"
- `payload` (json) - Event payload
- `traceId` (string)
- `tenantId` (string)
- `processed` (boolean) - Default: false
- `createdAt` (timestamp)

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=3000

# Datadog (optional)
DD_SERVICE=edge-telemetry-timeseries
DD_ENV=development

# Node environment
NODE_ENV=development
```

---

## Docker Build & Run

```bash
# Build
cd edge-layer/edge-telemetry-timeseries
docker build -t edge-telemetry-timeseries .

# Run (standalone for testing)
docker run -p 5104:3000 \
  -e DATABASE_URL=postgresql://farmiq:farmiq_dev@host.docker.internal:5140/farmiq \
  -e APP_PORT=3000 \
  edge-telemetry-timeseries

# Or use docker-compose (from repo root)
docker compose --profile infra up -d postgres
docker compose -f edge-layer/docker-compose.yml up edge-telemetry-timeseries --build
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5104/api/health
# Expected: 200 {"status":"healthy"}

curl http://localhost:5104/api/ready
# Expected: 200 {"status":"ready"} (if DB connected)
```

### API Documentation
```powershell
# Open in browser
start http://localhost:5104/api-docs
```

### Post Telemetry Readings
```powershell
# Create a test telemetry event
$testEvent = @{
    events = @(
        @{
            schema_version = "1.0"
            event_id = (New-Guid).ToString()
            trace_id = (New-Guid).ToString()
            tenant_id = "test-tenant-001"
            farm_id = "test-farm-001"
            barn_id = "test-barn-001"
            device_id = "test-device-001"
            event_type = "telemetry.reading"
            ts = (Get-Date).ToUniversalTime().ToString("o")
            payload = @{
                metric = "temperature"
                value = 26.5
                unit = "C"
            }
        }
    )
} | ConvertTo-Json -Depth 10

# Post to service
Invoke-RestMethod -Method POST -Uri "http://localhost:5104/api/v1/telemetry/readings" `
  -ContentType "application/json" `
  -Body $testEvent

# Verify in database
docker exec -it farmiq-postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM telemetry_raw WHERE tenant_id = 'test-tenant-001';"
```

### Query Telemetry Readings
```powershell
# Get readings for tenant
curl "http://localhost:5104/api/v1/telemetry/readings?tenantId=test-tenant-001"

# Get readings with filters
curl "http://localhost:5104/api/v1/telemetry/readings?tenantId=test-tenant-001&farmId=test-farm-001&metric=temperature&from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z&limit=100"
```

### Query Telemetry Aggregates
```powershell
# Get 1-hour aggregates
curl "http://localhost:5104/api/v1/telemetry/aggregates?tenantId=test-tenant-001&from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z&bucket=1h"

# Get 5-minute aggregates
curl "http://localhost:5104/api/v1/telemetry/aggregates?tenantId=test-tenant-001&from=2025-01-01T00:00:00Z&to=2025-01-01T12:00:00Z&bucket=5m&metric=temperature"
```

### Get Available Metrics
```powershell
curl "http://localhost:5104/api/v1/telemetry/metrics?tenantId=test-tenant-001"
# Expected: {"metrics": ["temperature", "humidity", ...]}
```

### Trigger Aggregation Manually
```powershell
# Trigger 5-minute aggregation
Invoke-RestMethod -Method POST -Uri "http://localhost:5104/api/v1/telemetry/aggregates/trigger" `
  -ContentType "application/json" `
  -Body '{"bucket":"5m"}'

# Trigger 1-hour aggregation
Invoke-RestMethod -Method POST -Uri "http://localhost:5104/api/v1/telemetry/aggregates/trigger" `
  -ContentType "application/json" `
  -Body '{"bucket":"1h"}'

# Verify aggregates in database
docker exec -it farmiq-postgres psql -U farmiq -d farmiq -c "SELECT * FROM telemetry_agg WHERE tenant_id = 'test-tenant-001' ORDER BY bucket_start DESC LIMIT 10;"
```

### Logs
```powershell
docker logs farmiq-edge-telemetry-timeseries -f
# Should show Winston JSON logs with requestId and traceId
# Should show aggregation job logs every 5 minutes and 1 hour
```

### Database Connection
```powershell
# Direct psql
docker exec -it farmiq-postgres psql -U farmiq -d farmiq

# Check telemetry_raw table
SELECT COUNT(*) FROM telemetry_raw WHERE tenant_id = 'test-tenant-001';

# Check telemetry_agg table
SELECT * FROM telemetry_agg WHERE tenant_id = 'test-tenant-001' ORDER BY bucket_start DESC LIMIT 10;

# Check outbox table
SELECT event_type, COUNT(*) FROM outbox WHERE tenant_id = 'test-tenant-001' GROUP BY event_type;
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200 (with DB check)
- [x] `/api-docs` accessible
- [x] Winston/JSON logging configured
- [x] Datadog tracing configured (dd-trace)
- [x] Database schema defined (Prisma: telemetry_raw, telemetry_agg, outbox)
- [x] POST /api/v1/telemetry/readings implemented (with envelope validation)
- [x] GET /api/v1/telemetry/readings implemented
- [x] GET /api/v1/telemetry/aggregates implemented
- [x] GET /api/v1/telemetry/metrics implemented
- [x] Aggregation job implemented (5m and 1h intervals)
- [x] Manual aggregation trigger endpoint
- [x] Outbox table for telemetry.ingested and telemetry.aggregated events
- [x] Environment variables documented
- [x] Docker build succeeds
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] Progress documented in this file

---

## Notes

- **Deduplication**: Handled at database level via unique constraint `(tenantId, eventId)`. Duplicate events are silently ignored (idempotent).
- **Aggregation**: Runs automatically every 5 minutes (5m buckets) and every 1 hour (1h buckets). Can also be triggered manually via POST endpoint.
- **Outbox**: Events are written to outbox table for `edge-sync-forwarder` to pick up later. Events: `telemetry.ingested` (on POST) and `telemetry.aggregated` (on aggregation job).
- **Multi-tenant Isolation**: All queries filter by `tenant_id` to ensure proper isolation.
- **Error Handling**: All errors follow standard format with `traceId` and `requestId` for correlation.
- **Logging**: Winston JSON logs with `requestId` and `traceId` for distributed tracing.
- **Envelope Validation**: Validates against mqtt-topic-map schema (schema_version, event_id, trace_id, tenant_id, device_id, event_type, ts, farm_id, barn_id, payload.metric, payload.value).

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings (port 5104)
- `docs/shared/01-api-standards.md` - API standards
- `docs/iot-layer/03-mqtt-topic-map.md` - MQTT envelope schema
- `docs/STATUS.md` - Overall project status
