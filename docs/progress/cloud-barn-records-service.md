# Service Progress: cloud-barn-records-service

**Service**: cloud-barn-records-service  
**Layer**: cloud  
**Status**: done  
**Owner**: CursorAI  
**Last Updated**: 2025-01-02

---

## Overview

Barn health, welfare, housing, and genetic records service for FarmIQ. Manages morbidity, mortality, vaccines, treatments, daily counts, welfare checks, housing conditions, and genetic profiles with proper multi-tenant isolation and idempotency support.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 {"status":"ready"}` (with DB connectivity check) or `503` if DB unavailable
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints

#### Morbidity Events
- `POST /api/v1/barn-records/morbidity` → Create morbidity event (idempotent via external_ref/event_id/Idempotency-Key)

#### Mortality Events
- `POST /api/v1/barn-records/mortality` → Create mortality event (idempotent)

#### Vaccine Events
- `POST /api/v1/barn-records/vaccines` → Create vaccine event (idempotent)

#### Treatment Events
- `POST /api/v1/barn-records/treatments` → Create treatment event (idempotent)

#### Daily Counts
- `POST /api/v1/barn-records/daily-counts` → Create daily count (idempotent)
- `GET /api/v1/barn-records/daily-counts` → List daily counts (with pagination/filters)

#### Welfare Checks
- `POST /api/v1/barn-records/welfare-checks` → Create welfare check (idempotent)

#### Housing Conditions
- `POST /api/v1/barn-records/housing-conditions` → Create housing condition (idempotent)

#### Genetic Profiles
- `POST /api/v1/barn-records/genetics` → Create genetic profile (idempotent)

---

## Database Tables

### barn_morbidity_event
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `occurred_at` (datetime)
- `disease_code` (string, nullable)
- `severity` (string: low, medium, high, nullable)
- `animal_count` (integer)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `event_id` (uuid, nullable)
- `created_by_user_id` (uuid, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Unique: `(tenant_id, event_id)` where event_id is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id, occurred_at)`

### barn_mortality_event
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `occurred_at` (datetime)
- `cause_code` (string, nullable)
- `animal_count` (integer)
- `disposal_method` (string, nullable)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `event_id` (uuid, nullable)
- `created_by_user_id` (uuid, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Unique: `(tenant_id, event_id)` where event_id is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id, occurred_at)`

### barn_vaccine_event
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `occurred_at` (datetime)
- `vaccine_name` (string)
- `dose_ml` (decimal, nullable)
- `route` (string, nullable)
- `administered_by` (string, nullable)
- `animal_count` (integer)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `event_id` (uuid, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Unique: `(tenant_id, event_id)` where event_id is not null

### barn_treatment_event
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `occurred_at` (datetime)
- `treatment_name` (string)
- `dose_ml` (decimal, nullable)
- `route` (string, nullable)
- `duration_days` (integer, nullable)
- `animal_count` (integer)
- `withdrawal_days` (integer, nullable)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `event_id` (uuid, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Unique: `(tenant_id, event_id)` where event_id is not null

### barn_daily_count
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `record_date` (date)
- `animal_count` (integer)
- `average_weight_kg` (decimal, nullable)
- `mortality_count` (integer, nullable)
- `cull_count` (integer, nullable)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, barn_id, record_date)` - one count per barn per day
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id, record_date)`

### barn_welfare_check
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `occurred_at` (datetime)
- `gait_score` (integer, 0-5, nullable)
- `lesion_score` (integer, 0-5, nullable)
- `behavior_score` (integer, 0-5, nullable)
- `observer` (string, nullable)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id, occurred_at)`

### barn_housing_condition
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `occurred_at` (datetime)
- `stocking_density` (decimal, nullable)
- `bedding_type` (string, nullable)
- `ventilation_mode` (string, nullable)
- `temperature_c` (decimal, nullable)
- `humidity_pct` (decimal, nullable)
- `ammonia_ppm` (decimal, nullable)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id, occurred_at)`

### barn_genetic_profile
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `batch_id` (uuid)
- `strain` (string, nullable)
- `breed_line` (string, nullable)
- `supplier` (string, nullable)
- `hatch_date` (date, nullable)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, batch_id)` - one profile per batch
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, batch_id)`

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=5131

# Optional (for JWT validation)
JWT_SECRET=your-secret-key

# Optional (for RabbitMQ publisher)
RABBITMQ_URL=amqp://farmiq:farmiq_dev@rabbitmq:5672

# Datadog (optional)
DD_SERVICE=cloud-barn-records-service
DD_ENV=development

# Node environment
NODE_ENV=development
```

---

## Docker Build & Run

```bash
# Build
cd cloud-layer/cloud-barn-records-service
docker build -t cloud-barn-records-service .

# Run (standalone for testing)
docker run -p 5131:5131 \
  -e DATABASE_URL=postgresql://farmiq:farmiq_dev@host.docker.internal:5140/farmiq \
  -e APP_PORT=5131 \
  cloud-barn-records-service

# Or use docker-compose (from repo root)
docker compose --profile infra up -d postgres
docker compose -f cloud-layer/docker-compose.yml up cloud-barn-records-service --build
```

---

## Evidence Commands

### Health Check
```bash
curl http://localhost:5131/api/health
# Expected: 200 OK

curl http://localhost:5131/api/ready
# Expected: 200 {"status":"ready"} (if DB connected)
```

### API Documentation
```bash
# Open in browser
open http://localhost:5131/api-docs
# Or
start http://localhost:5131/api-docs  # Windows
```

### Create Morbidity Event (with Idempotency)
```bash
# First request
curl -X POST "http://localhost:5131/api/v1/barn-records/morbidity" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -H "Idempotency-Key: test-morb-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "occurredAt": "2025-01-02T06:00:00Z",
    "diseaseCode": "coccidiosis",
    "severity": "medium",
    "animalCount": 20,
    "externalRef": "test-morb-ref-001"
  }'

# Retry same request (should return same event, not duplicate)
curl -X POST "http://localhost:5131/api/v1/barn-records/morbidity" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -H "Idempotency-Key: test-morb-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "occurredAt": "2025-01-02T06:00:00Z",
    "diseaseCode": "coccidiosis",
    "severity": "medium",
    "animalCount": 20,
    "externalRef": "test-morb-ref-001"
  }'
```

### Create Daily Count
```bash
curl -X POST "http://localhost:5131/api/v1/barn-records/daily-counts" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "recordDate": "2025-01-02",
    "animalCount": 1000,
    "averageWeightKg": 2.5,
    "externalRef": "test-count-ref-001"
  }'
```

### List Daily Counts
```bash
curl "http://localhost:5131/api/v1/barn-records/daily-counts?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003&limit=10"
```

### Create Mortality Event
```bash
curl -X POST "http://localhost:5131/api/v1/barn-records/mortality" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "occurredAt": "2025-01-02T07:00:00Z",
    "causeCode": "disease",
    "animalCount": 5,
    "externalRef": "test-mort-ref-001"
  }'
```

### Verification Script
```bash
# Run verification script (requires jq)
cd cloud-layer/cloud-barn-records-service
chmod +x scripts/verify-service.sh
./scripts/verify-service.sh

# Or with custom base URL
TENANT_ID=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001 \
FARM_ID=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002 \
BARN_ID=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003 \
./scripts/verify-service.sh http://localhost:5131
```

---

## Testing

### Unit Tests
```bash
cd cloud-layer/cloud-barn-records-service
npm test

# With coverage
npm run test:coverage
```

### Test Coverage
- ✅ Validation schemas (Zod): valid/invalid inputs, constraint enforcement (animalCount >= 0, scores 0-5, dates, enums)
- ✅ Idempotency: same Idempotency-Key/external_ref does not duplicate rows
- ✅ Tenant scoping: cannot read records from other tenants

---

## Logs

```bash
docker logs farmiq-cloud-barn-records-service -f
# Should show Winston JSON logs with requestId and traceId
```

---

## Database Connection

```bash
# Direct psql
docker exec -it farmiq-postgres psql -U farmiq -d farmiq

# Prisma Studio (if available)
cd cloud-layer/cloud-barn-records-service
npx prisma studio
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200 with DB check
- [x] `/api-docs` accessible
- [x] Winston/JSON logging configured
- [x] Datadog tracing configured
- [x] Database schema defined (Prisma, 9 tables)
- [x] Environment variables documented
- [x] Docker build succeeds
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] All endpoints implemented (9 endpoints)
- [x] Idempotency support (external_ref, event_id, Idempotency-Key header)
- [x] Validation (Zod schemas with constraint enforcement)
- [x] Multi-tenant scoping enforced
- [x] RBAC enforcement on routes
- [x] Unit tests for validation, idempotency, tenant scoping
- [x] Verification scripts created
- [x] Progress documented
- [x] RabbitMQ publisher for barn.record.created events
- [x] Integration tests (unit tests for publisher)

---

## Notes

- **Idempotency**: Supports `Idempotency-Key` header, `external_ref` field, and `event_id` field for all POST endpoints.
- **Daily Counts**: Unique constraint on `(tenant_id, barn_id, record_date)` ensures one count per barn per day.
- **Genetic Profiles**: Unique constraint on `(tenant_id, batch_id)` ensures one profile per batch.
- **RabbitMQ Integration**: ✅ Implemented - Publishes `barn.record.created` events to `farmiq.sync.exchange` with routing key `barn.record.created` after successful record creation. Event publishing is non-blocking (failures don't break API). See "Patch Plan" section below.

---

## Related Documentation

- `docs/shared/01-api-standards.md` - API standards
- `docs/contracts/barn-records-service.contract.md` - Barn records service contract
- `docs/STATUS.md` - Overall project status
- `cloud-layer/FEED-MODULE-IMPLEMENTATION-STATUS.md` - Implementation status

---

## Patch Plan: RabbitMQ Publisher Implementation (2025-02-04)

### What Changed

1. **Added RabbitMQ Publisher** (`src/utils/rabbitmq.ts`, `src/utils/eventPublisher.ts`):
   - Publishes `barn.record.created` events to `farmiq.sync.exchange` with routing key `barn.record.created`
   - Event envelope includes: event_id, event_type, tenant_id, farm_id, barn_id, batch_id, occurred_at, trace_id, payload
   - Non-blocking: Publishing failures are logged but don't break API responses

2. **Updated Service Functions** (`src/services/barnRecordsService.ts`):
   - All create functions (morbidity, mortality, vaccine, treatment, daily_count, welfare_check, housing_condition, genetic_profile) now publish events after successful record creation
   - Idempotency: Events are only published for new records (not duplicates)

3. **Updated Service Startup** (`src/index.ts`):
   - Connects to RabbitMQ on service start (non-blocking if unavailable)
   - Graceful shutdown closes RabbitMQ connection

4. **Added Tests** (`tests/utils/eventPublisher.spec.ts`):
   - Unit tests for event envelope structure
   - Error handling (non-throwing)

### How to Validate

```powershell
# 1. Start service with RabbitMQ
cd cloud-layer
docker compose up cloud-barn-records-service rabbitmq -d

# 2. Check service health
curl http://localhost:5131/api/health

# 3. Create a mortality event (should publish event)
curl -X POST http://localhost:5131/api/v1/barn-records/mortality `
  -H "Content-Type: application/json" `
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002" `
  -H "Idempotency-Key: test-mortality-001" `
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "occurredAt": "2025-02-04T10:00:00Z",
    "causeCode": "disease",
    "animalCount": 5,
    "externalRef": "test-mortality-ref-001"
  }'

# 4. Check RabbitMQ queue for published event
# Exchange: farmiq.sync.exchange
# Routing key: barn.record.created
# Should see event with record_type: "mortality", record_id: <created-id>

# 5. Test idempotency (retry same request - should NOT publish duplicate event)
# Should return existing record without publishing new event
```

### Evidence Commands

```powershell
# Health check
curl http://localhost:5131/api/health

# Create morbidity event
curl -X POST http://localhost:5131/api/v1/barn-records/morbidity `
  -H "Content-Type: application/json" `
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002" `
  -H "Idempotency-Key: test-morb-001" `
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "occurredAt": "2025-02-04T06:00:00Z",
    "diseaseCode": "coccidiosis",
    "severity": "medium",
    "animalCount": 20,
    "externalRef": "test-morb-ref-001"
  }'
```

