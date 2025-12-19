# Service Progress: cloud-ingestion

**Service**: `cloud-ingestion`  
**Layer**: `cloud`  
**Status**: `done`  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Cloud entry point for all edge events. Responsible for validating MQTT envelopes, deduplicating events at the cloud boundary, and publishing them to RabbitMQ for downstream processing.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 OK` (Prisma check)
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `POST /api/v1/edge/batch` → Ingest batch of events (idempotent)

---

## RabbitMQ Routing

- **Exchange**: `farmiq.{domain}.exchange` (type: `topic`)
- **Routing Key**: `{event_type}` (e.g., `telemetry.ingested`)
- **DLQ Strategy**: 
  - Transient errors: Retry with exponential backoff (amqplib).
  - Permanent errors/NACKs: Route to `farmiq.cloud-ingestion.dlq.queue` for audit.
  - Downstream services handle their own DLQs per `docs/03-messaging-rabbitmq.md`.

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
RABBITMQ_URL=amqp://guest:guest@cloud-rabbitmq:5672

# Tracing
DD_SERVICE=cloud-ingestion
DD_ENV=development
```

---

## Docker Build & Run

```bash
# Build
docker compose build cloud-ingestion

# Run
docker compose up cloud-ingestion
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5122/api/health
```

### Batch Ingestion (Sample)
```powershell
curl -X POST http://localhost:5122/api/v1/edge/batch `
  -H "Content-Type: application/json" `
  -d '{
    "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "edge_id": "edge-01",
    "sent_at": "2025-01-01T10:10:00Z",
    "events": [
      {
        "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
        "event_type": "telemetry.ingested",
        "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
        "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
        "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
        "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
        "occurred_at": "2025-01-01T10:00:00Z",
        "trace_id": "trace-id-123",
        "schema_version": "1.1.0",
        "payload": {
          "metric_type": "temperature",
          "metric_value": 26.4,
          "unit": "C"
        }
      }
    ]
  }'
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] Prisma schema defined (CloudDedupe)
- [x] RabbitMQ utility implemented (Connection/Publish)
- [x] Event validation logic (MQTT envelope)
- [x] Deduplication logic (tenant_id + event_id)
- [x] Health and Ready endpoints
- [x] OpenAPI documentation
- [x] Winston JSON logging with requestId and traceId
- [x] DLQ strategy documented
- [x] Docker build verified
- [x] Progress documented in this file
