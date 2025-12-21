# Cloud WeighVision Read Model Service - Progress

**Service**: `cloud-weighvision-readmodel`  
**Port**: 5132 (host) / 3000 (container)  
**Status**: ✅ **COMPLETE**  
**Owner**: CursorAI  
**Created**: 2025-12-21

---

## Summary

Read model service for WeighVision sessions, measurements, and media. Consumes RabbitMQ events and provides query endpoints for session data.

---

## Implementation Checklist

- [x] Service structure created (Node/TS, following existing patterns)
- [x] Prisma schema with weighvision tables
  - [x] `weighvision_session` (sessions)
  - [x] `weighvision_measurement` (weight readings)
  - [x] `weighvision_media` (images/videos)
  - [x] `weighvision_inference` (AI model results)
  - [x] `weighvision_event_dedupe` (idempotency)
- [x] Health/ready/api-docs endpoints
- [x] Sessions endpoints (GET list, GET by id)
- [x] RabbitMQ consumers for weighvision events
  - [x] `weighvision.session.created`
  - [x] `weighvision.session.finalized`
  - [x] `weight.recorded` (optional)
  - [x] `media.stored` (optional)
  - [x] `inference.completed` (optional)
- [x] Docker Compose integration (dev + prod)
- [x] BFF proxy routes for weighvision sessions
- [x] OpenAPI documentation

---

## How to Run Locally

### Prerequisites

- Docker and Docker Compose
- PostgreSQL (via docker-compose)
- RabbitMQ (via docker-compose)

### Start Service

```powershell
# Start service with dependencies
cd cloud-layer
docker compose -f docker-compose.dev.yml up -d --build cloud-weighvision-readmodel

# Check logs
docker compose -f docker-compose.dev.yml logs -f cloud-weighvision-readmodel
```

### Database Migration

```powershell
# Run migrations
cd cloud-layer/cloud-weighvision-readmodel
npx prisma migrate dev --name init

# Or via docker
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-weighvision-readmodel npx prisma migrate deploy
```

---

## API Endpoints

### Health & Readiness

```powershell
# Health check
curl http://localhost:5132/api/health

# Readiness check (verifies DB connection)
curl http://localhost:5132/api/ready

# API documentation
curl http://localhost:5132/api-docs
```

### WeighVision Sessions

```powershell
# Get sessions (via BFF)
curl -X GET "http://localhost:5125/api/v1/weighvision/sessions?tenantId=<uuid>" \
  -H "Authorization: Bearer <token>"

# Get sessions with filters
curl -X GET "http://localhost:5125/api/v1/weighvision/sessions?tenantId=<uuid>&barnId=<uuid>&status=RUNNING" \
  -H "Authorization: Bearer <token>"

# Get session by ID
curl -X GET "http://localhost:5125/api/v1/weighvision/sessions/<session-id>?tenantId=<uuid>" \
  -H "Authorization: Bearer <token>"
```

### Direct Service Calls (for testing)

```powershell
# Get sessions (direct)
curl -X GET "http://localhost:5132/api/v1/weighvision/sessions?tenantId=<uuid>" \
  -H "Authorization: Bearer <token>"

# Get session by ID (direct)
curl -X GET "http://localhost:5132/api/v1/weighvision/sessions/<session-id>?tenantId=<uuid>" \
  -H "Authorization: Bearer <token>"
```

---

## Example Response Payloads

### GET /api/v1/weighvision/sessions

```json
{
  "items": [
    {
      "id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
      "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
      "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
      "stationId": "STATION-01",
      "sessionId": "SESSION-2025-01-01-001",
      "startedAt": "2025-01-01T10:00:00Z",
      "endedAt": null,
      "status": "RUNNING",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T10:00:00Z",
      "measurements": [
        {
          "id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0010",
          "ts": "2025-01-01T10:05:00Z",
          "weightKg": 2.5,
          "source": "scale"
        }
      ],
      "media": [],
      "inferences": []
    }
  ],
  "nextCursor": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "hasMore": false
}
```

### GET /api/v1/weighvision/sessions/:sessionId

```json
{
  "id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "stationId": "STATION-01",
  "sessionId": "SESSION-2025-01-01-001",
  "startedAt": "2025-01-01T10:00:00Z",
  "endedAt": "2025-01-01T10:30:00Z",
  "status": "FINALIZED",
  "createdAt": "2025-01-01T10:00:00Z",
  "updatedAt": "2025-01-01T10:30:00Z",
  "measurements": [
    {
      "id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0010",
      "ts": "2025-01-01T10:05:00Z",
      "weightKg": 2.5,
      "source": "scale",
      "metaJson": null
    }
  ],
  "media": [
    {
      "id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0020",
      "objectId": "s3://bucket/path/image.jpg",
      "path": "https://storage.example.com/image.jpg",
      "ts": "2025-01-01T10:10:00Z"
    }
  ],
  "inferences": [
    {
      "id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0030",
      "modelVersion": "v1.0.0",
      "resultJson": "{\"weight\": 2.5, \"confidence\": 0.95}",
      "ts": "2025-01-01T10:15:00Z"
    }
  ]
}
```

---

## RabbitMQ Events

The service consumes the following events from `farmiq.weighvision.exchange`:

- `weighvision.session.created` - Creates a new session
- `weighvision.session.finalized` - Finalizes a session
- `weight.recorded` - Records a weight measurement
- `media.stored` - Records media associated with a session
- `inference.completed` - Records AI inference results

All events are idempotent (deduplicated by `tenant_id` + `event_id`).

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq

# RabbitMQ
RABBITMQ_URL=amqp://farmiq:farmiq_dev@rabbitmq:5672

# Service
APP_PORT=3000
NODE_ENV=development

# Datadog (optional)
DD_ENV=dev
DD_SERVICE=cloud-weighvision-readmodel
DD_VERSION=local
DD_AGENT_HOST=datadog
DD_TRACE_AGENT_PORT=8126
DD_LOGS_INJECTION=true
```

---

## Files Created

- `cloud-layer/cloud-weighvision-readmodel/` - Service root
- `src/index.ts` - Main entry point
- `src/routes/weighvisionRoutes.ts` - Route definitions
- `src/controllers/weighvisionController.ts` - Request handlers
- `src/services/weighvisionService.ts` - Business logic
- `src/services/rabbitmqConsumer.ts` - RabbitMQ event handlers
- `src/utils/rabbitmq.ts` - RabbitMQ connection utilities
- `prisma/schema.prisma` - Database schema
- `openapi.yaml` - API documentation

---

## BFF Integration

BFF proxy routes added:
- `GET /api/v1/weighvision/sessions` → `cloud-weighvision-readmodel`
- `GET /api/v1/weighvision/sessions/:sessionId` → `cloud-weighvision-readmodel`

BFF environment variable:
- `WEIGHVISION_READMODEL_BASE_URL=http://cloud-weighvision-readmodel:3000`

---

## Verification Commands

```powershell
# 1. Build and start service
cd cloud-layer
docker compose -f docker-compose.dev.yml up -d --build cloud-weighvision-readmodel cloud-api-gateway-bff

# 2. Check health
curl http://localhost:5132/api/health

# 3. Check API docs
curl http://localhost:5132/api-docs

# 4. Test BFF proxy (should return 200, even if empty list)
curl http://localhost:5125/api/v1/weighvision/sessions?tenantId=<uuid> \
  -H "Authorization: Bearer <token>"
```

---

## Next Steps

- [ ] Add unit tests for service logic
- [ ] Add integration tests for RabbitMQ consumers
- [ ] Add pagination tests
- [ ] Add tenant isolation tests
- [ ] Performance testing for large session lists

---

**Last Updated**: 2025-12-21

