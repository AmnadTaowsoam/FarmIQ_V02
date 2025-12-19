# Service Progress: cloud-telemetry-service

**Service**: cloud-telemetry-service  
**Layer**: cloud  
**Status**: done  
**Owner**: CursorAI  
**Last Updated**: 2025-01-18

---

## Overview

Telemetry ingestion, storage, and query service for FarmIQ. Consumes telemetry events from RabbitMQ (published by cloud-ingestion), persists to database, and provides query APIs for the BFF. Supports multi-tenant isolation and platform_admin role.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 {"status":"ready"}` (with DB connectivity check) or `503` if DB unavailable
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints

#### Telemetry Readings
- `GET /api/v1/telemetry/readings?tenantId=...&farmId=...&barnId=...&deviceId=...&metric=...&from=...&to=...&limit=...` → Get telemetry readings with filters
  - Required: `tenantId`
  - Optional filters: `farmId`, `barnId`, `deviceId`, `metric`, `from` (ISO date-time), `to` (ISO date-time)
  - `limit`: max 10000 (default: 1000)

#### Telemetry Aggregates
- `GET /api/v1/telemetry/aggregates?tenantId=...&farmId=...&barnId=...&deviceId=...&metric=...&from=...&to=...&bucket=5m|1h|1d` → Get telemetry aggregates
  - Required: `tenantId`, `from`, `to`
  - Optional filters: `farmId`, `barnId`, `deviceId`, `metric`
  - `bucket`: aggregation window size (`5m`, `1h`, `1d`), default: `1h`

#### Available Metrics
- `GET /api/v1/telemetry/metrics?tenantId=...&farmId=...&barnId=...&deviceId=...` → Get list of available metrics
  - Required: `tenantId`
  - Optional filters: `farmId`, `barnId`, `deviceId`

---

## Database Tables

### telemetry_raw
- `id` (uuid, pk)
- `tenantId` (string)
- `farmId` (string, nullable)
- `barnId` (string, nullable)
- `deviceId` (string)
- `batchId` (string, nullable)
- `metric` (string) - e.g., "temperature", "humidity", "weight"
- `value` (decimal(10,2))
- `unit` (string, nullable) - e.g., "C", "F", "%", "kg"
- `occurredAt` (timestamp)
- `traceId` (string, nullable)
- `eventId` (string) - For deduplication
- `createdAt` (timestamp)
- Unique: `(tenantId, eventId)`
- Indexes: `(tenantId, occurredAt DESC)`, `(tenantId, farmId, barnId, occurredAt DESC)`, `(tenantId, deviceId, occurredAt DESC)`, `(tenantId, metric, occurredAt DESC)`

### telemetry_agg
- `id` (uuid, pk)
- `tenantId` (string)
- `farmId` (string, nullable)
- `barnId` (string, nullable)
- `deviceId` (string)
- `metric` (string)
- `bucketStart` (timestamp) - Start of aggregation window
- `bucketSize` (string) - e.g., "5m", "1h", "1d"
- `avgValue` (decimal(10,2))
- `minValue` (decimal(10,2))
- `maxValue` (decimal(10,2))
- `count` (int) - Number of samples in bucket
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- Unique: `(tenantId, farmId, barnId, deviceId, metric, bucketStart, bucketSize)`
- Indexes: `(tenantId, bucketStart DESC)`, `(tenantId, farmId, barnId, bucketStart DESC)`, `(tenantId, deviceId, metric, bucketStart DESC)`

---

## RabbitMQ Configuration

### Exchange
- **Name**: `farmiq.telemetry.exchange`
- **Type**: `topic`
- **Durable**: `true`

### Queue
- **Name**: `farmiq.cloud-telemetry-service.ingest.queue`
- **Durable**: `true`
- **DLQ**: `farmiq.cloud-telemetry-service.dlq.queue`
- **Routing Key**: `telemetry.ingested`

### Event Envelope
Events from `cloud-ingestion` follow this format:
```json
{
  "event_id": "uuid-v7",
  "event_type": "telemetry.ingested",
  "tenant_id": "uuid-v7",
  "farm_id": "uuid-v7",
  "barn_id": "uuid-v7",
  "device_id": "uuid-v7",
  "occurred_at": "2025-01-01T10:00:00Z",
  "trace_id": "trace-id-123",
  "payload": {
    "metric_type": "temperature",
    "metric_value": 26.4,
    "unit": "C"
  }
}
```

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=3000
RABBITMQ_URL=amqp://farmiq:farmiq_dev@rabbitmq:5672

# Optional (for JWT validation)
JWT_SECRET=your-secret-key

# Datadog (optional)
DD_SERVICE=cloud-telemetry-service
DD_ENV=development

# Node environment
NODE_ENV=development
```

---

## Docker Build & Run

```bash
# Build
cd cloud-layer/cloud-telemetry-service
docker build -t cloud-telemetry-service .

# Run (standalone for testing)
docker run -p 5123:3000 \
  -e DATABASE_URL=postgresql://farmiq:farmiq_dev@host.docker.internal:5140/farmiq \
  -e RABBITMQ_URL=amqp://farmiq:farmiq_dev@host.docker.internal:5150 \
  -e APP_PORT=3000 \
  cloud-telemetry-service

# Or use docker-compose (from repo root)
docker compose --profile infra up -d postgres rabbitmq
docker compose -f cloud-layer/docker-compose.yml up cloud-telemetry-service --build
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5123/api/health
# Expected: 200 OK

curl http://localhost:5123/api/ready
# Expected: 200 {"status":"ready"} (if DB connected)
```

### API Documentation
```powershell
# Open in browser
start http://localhost:5123/api-docs
```

### Publish Test Message to RabbitMQ
```powershell
# Install amqplib if needed
cd cloud-layer/cloud-telemetry-service
npm install amqplib uuid

# Run test script
node scripts/publish-test-message.js

# Or manually publish using RabbitMQ Management UI:
# 1. Go to http://localhost:5151
# 2. Login: farmiq / farmiq_dev
# 3. Go to Exchanges → farmiq.telemetry.exchange
# 4. Publish message with routing key: telemetry.ingested
```

### Query Telemetry Readings
```powershell
# Get readings for tenant
curl "http://localhost:5123/api/v1/telemetry/readings?tenantId=test-tenant-001" `
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get readings with filters
curl "http://localhost:5123/api/v1/telemetry/readings?tenantId=test-tenant-001&farmId=test-farm-001&metric=temperature&from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z&limit=100" `
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Query Telemetry Aggregates
```powershell
# Get 1-hour aggregates
curl "http://localhost:5123/api/v1/telemetry/aggregates?tenantId=test-tenant-001&from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z&bucket=1h" `
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get 5-minute aggregates
curl "http://localhost:5123/api/v1/telemetry/aggregates?tenantId=test-tenant-001&from=2025-01-01T00:00:00Z&to=2025-01-01T12:00:00Z&bucket=5m&metric=temperature" `
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Get Available Metrics
```powershell
curl "http://localhost:5123/api/v1/telemetry/metrics?tenantId=test-tenant-001" `
  -H "Authorization: Bearer <JWT_TOKEN>"
# Expected: {"metrics": ["temperature", "humidity", ...]}
```

### Logs
```powershell
docker logs farmiq-cloud-telemetry-service -f
# Should show Winston JSON logs with requestId and traceId
# Should show RabbitMQ consumer messages
```

### Database Connection
```powershell
# Direct psql
docker exec -it farmiq-postgres psql -U farmiq -d farmiq

# Check telemetry_raw table
SELECT COUNT(*) FROM telemetry_raw WHERE tenant_id = 'test-tenant-001';

# Check telemetry_agg table
SELECT * FROM telemetry_agg WHERE tenant_id = 'test-tenant-001' ORDER BY bucket_start DESC LIMIT 10;
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200 (with DB check)
- [x] `/api-docs` accessible
- [x] Winston/JSON logging configured
- [x] Datadog tracing configured (dd-trace)
- [x] Database schema defined (Prisma: telemetry_raw, telemetry_agg)
- [x] RabbitMQ consumer implemented (telemetry.ingested)
- [x] Telemetry persistence service (idempotent via unique constraint)
- [x] Aggregation service (on-the-fly computation)
- [x] Query endpoints implemented (readings, aggregates, metrics)
- [x] JWT auth middleware (pluggable)
- [x] Platform admin support (can query any tenant)
- [x] Multi-tenant isolation enforced
- [x] Environment variables documented
- [x] Docker build succeeds
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] Test script for publishing sample message
- [x] Progress documented in this file

---

## Notes

- **Deduplication**: Handled at database level via unique constraint `(tenantId, eventId)`. Duplicate events are silently ignored (idempotent).
- **Aggregation**: Aggregates can be computed on-the-fly or retrieved from pre-computed `telemetry_agg` table. Pre-computation can be done in a background job (not implemented in MVP).
- **Multi-tenant Isolation**: All queries filter by `tenant_id` to ensure proper isolation. Platform admins can query any tenant.
- **JWT Auth**: Currently pluggable - allows requests without auth in development mode. In production, should enforce JWT validation. Extracts `tenant_id` and `roles` from JWT payload.
- **Platform Admin**: Users with `platform_admin` role can query any tenant by providing `tenantId` in query.
- **Error Handling**: All errors follow standard format with `traceId` and `requestId` for correlation.
- **Logging**: Winston JSON logs with `requestId` and `traceId` for distributed tracing.
- **RabbitMQ**: Consumer uses manual ack. Failed messages are nacked and requeued (will go to DLQ after max retries).

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings (port 5123)
- `docs/shared/01-api-standards.md` - API standards
- `docs/03-messaging-rabbitmq.md` - RabbitMQ configuration
- `docs/iot-layer/03-mqtt-topic-map.md` - MQTT envelope schema
- `docs/STATUS.md` - Overall project status

