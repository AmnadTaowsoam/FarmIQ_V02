# Cloud Barn Records Service

FarmIQ Cloud Barn Records Service - Barn health, welfare, housing, and genetic records

## Overview

This service manages all barn record data including:
- Health events: morbidity, mortality, vaccines, treatments, daily counts
- Welfare checks: gait, lesion, behavior scores
- Housing conditions: stocking density, bedding, ventilation, temperature/humidity
- Genetic profiles: strain, breed line, supplier per batch

## Port

- Default: `3000`
- Production: `5131` (per STATUS.md)

## Endpoints

### Health & Operations
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check (database connectivity)
- `GET /api-docs` - Swagger UI documentation

### Barn Records
- `POST /api/v1/barn-records/morbidity` - Create morbidity event
- `POST /api/v1/barn-records/mortality` - Create mortality event
- `POST /api/v1/barn-records/vaccines` - Create vaccine event
- `POST /api/v1/barn-records/treatments` - Create treatment event
- `POST /api/v1/barn-records/daily-counts` - Create daily count
- `GET  /api/v1/barn-records/daily-counts` - List daily counts (with filters/pagination)
- `POST /api/v1/barn-records/welfare-checks` - Create welfare check
- `POST /api/v1/barn-records/housing-conditions` - Create housing condition
- `POST /api/v1/barn-records/genetics` - Create genetic profile

## Idempotency

All POST endpoints support idempotency via:
- `Idempotency-Key` header (required per contract)
- `external_ref` field in request body
- `event_id` field in request body (for event-driven ingestion)

## Database Schema

All tables use Prisma ORM:
- `barn_morbidity_event`
- `barn_mortality_event`
- `barn_cull_event`
- `barn_vaccine_event`
- `barn_treatment_event`
- `barn_daily_count`
- `barn_welfare_check`
- `barn_housing_condition`
- `barn_genetic_profile`

All tables include:
- `tenant_id` for multi-tenant isolation
- Unique constraints on `(tenant_id, external_ref)` and `(tenant_id, event_id)`
- Indexes for common query patterns

## How to Run Locally

```bash
cd cloud-layer/cloud-barn-records-service
npm install
npm run prisma:generate

# Set up database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/barn_records_db"

# Run migrations
npm run migrate:up

# Start development server
npm run dev
```

Service will run on port 3000 (or APP_PORT env var).

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `APP_PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT secret for token validation (optional in dev)
- `NODE_ENV` - Environment (development/production)
- `DD_SERVICE` - Datadog service name (optional)
- `COMMIT_ID` - Git commit ID for tracing

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Sample cURL Commands

### Create Morbidity Event
```bash
curl -X POST http://localhost:3000/api/v1/barn-records/morbidity \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-bm-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
    "occurredAt": "2025-01-02T06:00:00Z",
    "diseaseCode": "coccidiosis",
    "severity": "medium",
    "animalCount": 20
  }'
```

### Create Daily Count
```bash
curl -X POST http://localhost:3000/api/v1/barn-records/daily-counts \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-bd-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
    "recordDate": "2025-01-02",
    "animalCount": 990,
    "mortalityCount": 5,
    "cullCount": 2
  }'
```

### List Daily Counts
```bash
curl -X GET "http://localhost:3000/api/v1/barn-records/daily-counts?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004&start=2025-01-01&end=2025-01-03&limit=25" \
  -H "Authorization: Bearer <jwt>"
```

## Database Migrations

```bash
# Create a new migration
npm run migrate:up

# Rollback migration
npm run migrate:undo
```

## Documentation

- Contract: `docs/contracts/barn-records-service.contract.md`
- Service Design: `docs/cloud-layer/cloud-barn-records-service.md`
- API Standards: `docs/shared/01-api-standards.md`

