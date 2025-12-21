# Service Progress: cloud-feed-service

**Service**: cloud-feed-service  
**Layer**: cloud  
**Status**: done  
**Owner**: CursorAI  
**Last Updated**: 2025-01-02

---

## Overview

Feed master data and authoritative feed intake records service for FarmIQ. Manages feed formulas, lots, deliveries, quality results, intake records, programs, inventory snapshots, and KPI computation (FCR, ADG, SGR).

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 {"status":"ready"}` (with DB connectivity check) or `503` if DB unavailable
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints

#### Feed Formulas
- `POST /api/v1/feed/formulas` → Create formula
- `GET /api/v1/feed/formulas` → List formulas (with pagination/filters)

#### Feed Lots
- `POST /api/v1/feed/lots` → Create lot
- `GET /api/v1/feed/lots` → List lots (with pagination/filters)
- `GET /api/v1/feed/lots/:id` → Get lot by ID

#### Feed Deliveries
- `POST /api/v1/feed/deliveries` → Create delivery
- `GET /api/v1/feed/deliveries` → List deliveries (with pagination/filters)
- `GET /api/v1/feed/deliveries/:id` → Get delivery by ID

#### Feed Quality Results
- `POST /api/v1/feed/quality-results` → Create quality result
- `GET /api/v1/feed/quality-results` → List quality results (with pagination/filters)
- `GET /api/v1/feed/quality-results/:id` → Get quality result by ID

#### Feed Intake Records
- `POST /api/v1/feed/intake-records` → Create intake record (idempotent via event_id/external_ref/idempotency_key)
- `GET /api/v1/feed/intake-records` → List intake records (with pagination/filters)

#### Feed Programs (Optional)
- `POST /api/v1/feed/programs` → Create program
- `GET /api/v1/feed/programs` → List programs (with pagination/filters)

#### Feed Inventory Snapshots (Optional)
- `POST /api/v1/feed/inventory-snapshots` → Create inventory snapshot
- `GET /api/v1/feed/inventory-snapshots` → List inventory snapshots (with pagination/filters)

#### KPI Endpoint
- `GET /api/v1/kpi/feeding` → Get daily feeding KPIs (FCR, ADG, SGR) for date range

---

## Database Tables

### feed_formula
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `name` (string)
- `species` (string, nullable)
- `phase` (string, nullable)
- `energy_kcal_per_kg` (decimal, nullable)
- `protein_pct` (decimal, nullable)
- `fiber_pct` (decimal, nullable)
- `fat_pct` (decimal, nullable)
- `status` (string: active, inactive)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null

### feed_lot
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `lot_code` (string)
- `feed_formula_id` (uuid, nullable, fk)
- `supplier_name` (string, nullable)
- `manufacture_date` (date, nullable)
- `received_date` (date, nullable)
- `quantity_kg` (decimal, nullable)
- `remaining_kg` (decimal, nullable)
- `status` (string: active, archived)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, farm_id)`, `(tenant_id, feed_formula_id)`

### feed_delivery
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid, nullable)
- `feed_lot_id` (uuid, fk)
- `delivery_ref` (string, nullable)
- `delivered_at` (datetime)
- `quantity_kg` (decimal)
- `unit_cost` (decimal, nullable)
- `currency` (string, nullable)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, delivery_ref)` where delivery_ref is not null
- Indexes: `tenant_id`, `(tenant_id, farm_id)`, `(tenant_id, feed_lot_id)`, `(tenant_id, delivered_at)`

### feed_quality_result
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `feed_lot_id` (uuid, fk)
- `sampled_at` (datetime)
- `metric` (string)
- `value` (decimal)
- `unit` (string, nullable)
- `method` (string, nullable)
- `status` (string: valid, rejected)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, feed_lot_id)`, `(tenant_id, sampled_at)`

### feed_intake_record
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `device_id` (uuid, nullable)
- `source` (string: MANUAL, API_IMPORT, SILO_AUTO)
- `feed_formula_id` (uuid, nullable, fk)
- `feed_lot_id` (uuid, nullable, fk)
- `quantity_kg` (decimal)
- `occurred_at` (datetime)
- `ingested_at` (datetime, nullable)
- `event_id` (uuid, nullable)
- `external_ref` (string, nullable)
- `idempotency_key` (string, nullable)
- `sequence` (integer, nullable)
- `notes` (text, nullable)
- `created_by_user_id` (uuid, nullable)
- `created_at`, `updated_at`
- Unique: `(tenant_id, event_id)` where event_id is not null
- Unique: `(tenant_id, idempotency_key)` where idempotency_key is not null
- Unique: `(tenant_id, external_ref)` where external_ref is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id)`, `(tenant_id, occurred_at)`, `(tenant_id, batch_id)`

### feed_program (Optional)
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid, nullable)
- `barn_id` (uuid, nullable)
- `name` (string)
- `status` (string: active, inactive)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `notes` (text, nullable)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`

### feed_inventory_snapshot (Optional)
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid, nullable)
- `barn_id` (uuid, nullable)
- `feed_lot_id` (uuid, nullable, fk)
- `snapshot_at` (datetime)
- `quantity_kg` (decimal)
- `source` (string: MANUAL, SENSOR)
- `external_ref` (string, nullable)
- `created_at`, `updated_at`

### kpi_daily (for caching)
- `id` (uuid, pk)
- `tenant_id` (uuid)
- `farm_id` (uuid, nullable)
- `barn_id` (uuid)
- `batch_id` (uuid, nullable)
- `record_date` (date)
- `fcr` (decimal, nullable)
- `adg_g` (decimal, nullable)
- `sgr_pct` (decimal, nullable)
- `computed_at` (datetime)
- `created_at`, `updated_at`
- Unique: `(tenant_id, barn_id, batch_id, record_date)` where batch_id is not null
- Indexes: `tenant_id`, `(tenant_id, barn_id, record_date)`

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=5130

# Optional (for JWT validation)
JWT_SECRET=your-secret-key

# Optional (for KPI weight data source)
TELEMETRY_SERVICE_URL=http://cloud-telemetry-service:5123

# Datadog (optional)
DD_SERVICE=cloud-feed-service
DD_ENV=development

# Node environment
NODE_ENV=development
```

---

## Docker Build & Run

```bash
# Build
cd cloud-layer/cloud-feed-service
docker build -t cloud-feed-service .

# Run (standalone for testing)
docker run -p 5130:5130 \
  -e DATABASE_URL=postgresql://farmiq:farmiq_dev@host.docker.internal:5140/farmiq \
  -e APP_PORT=5130 \
  cloud-feed-service

# Or use docker-compose (from repo root)
docker compose --profile infra up -d postgres
docker compose -f cloud-layer/docker-compose.yml up cloud-feed-service --build
```

---

## Evidence Commands

### Health Check
```bash
curl http://localhost:5130/api/health
# Expected: 200 OK

curl http://localhost:5130/api/ready
# Expected: 200 {"status":"ready"} (if DB connected)
```

### API Documentation
```bash
# Open in browser
open http://localhost:5130/api-docs
# Or
start http://localhost:5130/api-docs  # Windows
```

### Create Feed Intake Record (with Idempotency)
```bash
# First request
curl -X POST "http://localhost:5130/api/v1/feed/intake-records" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -H "Idempotency-Key: test-intake-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "source": "MANUAL",
    "quantityKg": 100.5,
    "occurredAt": "2025-01-02T06:00:00Z",
    "externalRef": "test-ext-ref-001"
  }'

# Retry same request (should return same record, not duplicate)
curl -X POST "http://localhost:5130/api/v1/feed/intake-records" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -H "Idempotency-Key: test-intake-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "source": "MANUAL",
    "quantityKg": 100.5,
    "occurredAt": "2025-01-02T06:00:00Z",
    "externalRef": "test-ext-ref-001"
  }'
```

### List Feed Intake Records
```bash
curl "http://localhost:5130/api/v1/feed/intake-records?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003&limit=10"
```

### Create Feed Formula
```bash
curl -X POST "http://localhost:5130/api/v1/feed/formulas" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
    "name": "Starter Feed",
    "species": "broiler",
    "proteinPct": 22.5,
    "energyKcalPerKg": 3000,
    "externalRef": "formula-001"
  }'
```

### Get Feeding KPI
```bash
curl "http://localhost:5130/api/v1/kpi/feeding?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z"
```

### Verification Script
```bash
# Run verification script (requires jq)
cd cloud-layer/cloud-feed-service
chmod +x scripts/verify-service.sh
./scripts/verify-service.sh

# Or with custom base URL
TENANT_ID=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001 \
FARM_ID=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002 \
BARN_ID=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003 \
./scripts/verify-service.sh http://localhost:5130
```

---

## Testing

### Unit Tests
```bash
cd cloud-layer/cloud-feed-service
npm test

# With coverage
npm run test:coverage
```

### Test Coverage
- ✅ Validation schemas (Zod): valid/invalid inputs, constraint enforcement
- ✅ Idempotency: same Idempotency-Key/external_ref does not duplicate rows
- ✅ Tenant scoping: cannot read records from other tenants

---

## Logs

```bash
docker logs farmiq-cloud-feed-service -f
# Should show Winston JSON logs with requestId and traceId
```

---

## Database Connection

```bash
# Direct psql
docker exec -it farmiq-postgres psql -U farmiq -d farmiq

# Prisma Studio (if available)
cd cloud-layer/cloud-feed-service
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
- [x] Database schema defined (Prisma)
- [x] Environment variables documented
- [x] Docker build succeeds
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] All endpoints implemented (14 endpoints)
- [x] Idempotency support (external_ref, event_id, idempotency_key)
- [x] Validation (Zod schemas with constraint enforcement)
- [x] Multi-tenant scoping enforced
- [x] RBAC enforcement on routes
- [x] KPI computation (FCR, ADG, SGR)
- [x] Unit tests for validation, idempotency, tenant scoping
- [x] Verification scripts created
- [x] Progress documented
- [x] RabbitMQ consumer for feed.intake.recorded events
- [x] Integration tests (unit tests for consumer)

---

## Notes

- **Idempotency**: Supports `Idempotency-Key` header, `external_ref` field, and `event_id` field for intake records. Other entities support `external_ref`.
- **KPI Computation**: Currently on-demand computation (MVP). Fetches weight data from `cloud-telemetry-service` via HTTP API. Future enhancement: background rollups and caching.
- **RabbitMQ Integration**: ✅ Implemented - Consumes `feed.intake.recorded` events from `farmiq.sync.exchange` with routing key `feed.intake.recorded`. Consumer validates envelope, deduplicates by `event_id`, and creates feed intake records. See "Patch Plan" section below.
- **Weight Data Source**: KPI endpoint integrates with `cloud-telemetry-service` TelemetryRaw/TelemetryAgg tables via HTTP API.

---

## Related Documentation

- `docs/shared/01-api-standards.md` - API standards
- `docs/contracts/feed-service.contract.md` - Feed service contract
- `docs/cloud-layer/kpi-engine-fcr-adg-sgr.md` - KPI computation formulas
- `docs/STATUS.md` - Overall project status
- `cloud-layer/FEED-MODULE-IMPLEMENTATION-STATUS.md` - Implementation status

