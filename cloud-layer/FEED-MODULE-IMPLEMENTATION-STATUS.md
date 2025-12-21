# Feed Module Implementation Status

**Date**: 2025-01-02  
**Status**: 🚧 **IN PROGRESS** - Feed service complete, barn-records service complete, edge intake pending

---

## ✅ Completed

### 1. cloud-feed-service - Core Structure ✅ COMPLETE
- ✅ Prisma schema created with all feed tables:
  - FeedFormula, FeedLot, FeedDelivery, FeedQualityResult
  - FeedIntakeRecord, FeedProgram, FeedInventorySnapshot
  - KpiDaily (for KPI computation)
- ✅ package.json, tsconfig.json, Dockerfile structure
- ✅ Base Express app (index.ts) with health/ready endpoints
- ✅ Middleware: auth, transactionId, tenant scope
- ✅ Utils: logger, swagger, datadog
- ✅ **Validation Middleware**: Zod schemas for all request types

### 1.1. cloud-feed-service - Service Layer ✅ COMPLETE
- ✅ createFeedFormula (with idempotency via external_ref)
- ✅ listFeedFormulas (with pagination/filters)
- ✅ createFeedLot (with idempotency via external_ref)
- ✅ listFeedLots (with pagination/filters)
- ✅ getFeedLotById
- ✅ createFeedDelivery (with idempotency via external_ref/deliveryRef)
- ✅ listFeedDeliveries (with pagination/filters)
- ✅ createFeedQualityResult (with idempotency via external_ref)
- ✅ listFeedQualityResults (with pagination/filters)
- ✅ createFeedIntakeRecord (with idempotency via event_id/idempotency_key/external_ref)
- ✅ listFeedIntakeRecords (with pagination/filters)
- ✅ createFeedProgram (with idempotency via external_ref)
- ✅ listFeedPrograms (with pagination/filters)
- ✅ createFeedInventorySnapshot (with idempotency via external_ref)
- ✅ listFeedInventorySnapshots (with pagination/filters)

### 1.2. cloud-feed-service - Controllers ✅ COMPLETE
- ✅ POST /api/v1/feed/formulas
- ✅ GET /api/v1/feed/formulas
- ✅ GET /api/v1/kpi/feeding
- ✅ POST /api/v1/feed/lots
- ✅ GET /api/v1/feed/lots
- ✅ POST /api/v1/feed/deliveries
- ✅ GET /api/v1/feed/deliveries
- ✅ POST /api/v1/feed/quality-results
- ✅ GET /api/v1/feed/quality-results
- ✅ POST /api/v1/feed/intake-records
- ✅ GET /api/v1/feed/intake-records
- ✅ POST /api/v1/feed/programs
- ✅ GET /api/v1/feed/programs
- ✅ POST /api/v1/feed/inventory-snapshots
- ✅ GET /api/v1/feed/inventory-snapshots

### 1.3. cloud-feed-service - Routes ✅ COMPLETE
- ✅ All endpoints with RBAC enforcement
- ✅ Validation middleware applied to all POST endpoints
- ✅ Proper role restrictions per contract
- ✅ KPI route: GET /api/v1/kpi/feeding

### 1.4. cloud-feed-service - KPI Service ✅ COMPLETE
- ✅ computeKpiSeries: On-demand KPI computation
- ✅ Fetches feed intake from local DB (FeedIntakeRecord table)
- ✅ Fetches weight data from telemetry service via HTTP API
- ✅ Computes FCR, ADG, SGR per daily series
- ✅ Corner cases handled: weight_gain <= 0, missing intake/weight
- ⚠️ Animal count/mortality: Placeholder logic (TODO: integrate barn-records-service)

---

## 🚧 In Progress / TODO

### cloud-feed-service - Remaining Features

1. **KPI Endpoint**: ✅ **COMPLETE** (MVP)
   - ✅ GET /api/v1/kpi/feeding implemented
   - ✅ KPI computation logic (FCR/ADG/SGR per docs/kpi-engine-fcr-adg-sgr.md)
   - ✅ Integration with telemetry service for weight data (HTTP calls)
   - ⚠️ **TODOs for enhancement**:
     - Integrate with barn-records-service for animal count and mortality adjustments
     - Optional: Background rollups for performance (kpi_daily table upserts)
     - Optional: Caching layer for frequently queried date ranges

### cloud-feed-service - Enhancements (Non-blocking)

1. **Idempotency Header Support**:
   - ✅ Idempotency via `external_ref` implemented for all entities
   - ✅ Idempotency via `idempotency_key` for intake records
   - ⚠️ Idempotency-Key header support for other endpoints (can use external_ref as workaround)
   - 💡 **Note**: Contracts allow either Idempotency-Key header OR external_ref; current implementation supports external_ref

2. **Validation**:
   - ✅ Zod schemas implemented for all request types
   - ✅ Constraints enforced (quantityKg >= 0, date validations, enum validations)
   - ✅ Error envelopes aligned with API standards

3. **RabbitMQ Consumer**:
   - ❌ Consume feed.intake.recorded events from cloud-rabbitmq
   - ❌ Upsert intake records from events

4. **Database Migrations**:
   - ⚠️ Create Prisma migration
   - ⚠️ Seed file for test data

5. **OpenAPI Spec**:
   - ❌ Create openapi.yaml with all endpoint definitions

6. **Testing**:
   - ❌ Unit tests for services
   - ❌ Integration tests for endpoints

---

## ❌ Not Started

### 2. cloud-barn-records-service ✅ **COMPLETE**
- ✅ Create service directory structure
  - ✅ package.json, tsconfig.json, Dockerfile
  - ✅ Base Express app (index.ts) with health/ready endpoints
  - ✅ Middleware: auth, transactionId, tenant scope
  - ✅ Utils: logger, swagger, datadog
- ✅ Prisma schema (9 models):
  - barn_morbidity_event, barn_mortality_event, barn_cull_event
  - barn_vaccine_event, barn_treatment_event
  - barn_daily_count, barn_welfare_check
  - barn_housing_condition, barn_genetic_profile
- ✅ Service layer, controllers, routes
- ✅ All endpoints per barn-records-service.contract.md:
  - POST /api/v1/barn-records/morbidity
  - POST /api/v1/barn-records/mortality
  - POST /api/v1/barn-records/vaccines
  - POST /api/v1/barn-records/treatments
  - POST /api/v1/barn-records/daily-counts
  - GET  /api/v1/barn-records/daily-counts (with pagination/filters)
  - POST /api/v1/barn-records/welfare-checks
  - POST /api/v1/barn-records/housing-conditions
  - POST /api/v1/barn-records/genetics
- ✅ Idempotency: external_ref and event_id support (Idempotency-Key header support)
- ✅ Validation: Zod schemas for all request types with constraint enforcement
- ✅ RBAC: Role-based access control per contract
- ✅ OpenAPI spec created

### 3. KPI Computation Engine
- ❌ Implement KPI computation logic:
  - FCR = total_feed_kg / weight_gain_kg
  - ADG = (avg_weight_today - avg_weight_prev) / days
  - SGR = ((ln(Wt) - ln(W0)) / days) * 100
- ❌ Handle corner cases (weight_gain <= 0, missing intake, mortality adjustments)
- ❌ Daily rollup scheduler (nightly at 00:00 local time)
- ❌ Real-time incremental updates

### 4. edge-feed-intake
- ❌ Create service directory structure
- ❌ TypeORM entities for feed_intake_local, feed_intake_dedupe
- ❌ MQTT consumer (consume feed events from edge-ingress-gateway)
- ❌ SILO_AUTO ingestion logic (delta computation from silo.weight telemetry)
- ❌ Write to sync_outbox for edge-sync-forwarder
- ❌ Health/ready endpoints

### 5. BFF Integration
- ❌ Add feed service proxy to cloud-api-gateway-bff
- ❌ Add barn-records service proxy
- ❌ Create deprecation aliases for /api/v1/feeding/fcr and /api/v1/feeding/daily

### 6. Docker Compose
- ❌ Add cloud-feed-service to docker-compose.yml
- ❌ Add cloud-barn-records-service to docker-compose.yml
- ❌ Add edge-feed-intake to edge docker-compose.yml
- ❌ Configure service URLs and environment variables

---

## 📝 Implementation Notes

### Idempotency Strategy

**Current Implementation:**
- **FeedIntakeRecord**: Supports idempotency via `event_id`, `idempotency_key`, or `external_ref`
- **FeedFormula**: Uses `external_ref` for idempotency (or name uniqueness per tenant)
- **FeedLot**: Uses `external_ref` for idempotency
- **FeedDelivery**: Uses `external_ref` or `deliveryRef` for idempotency
- **FeedQualityResult**: Uses `external_ref` for idempotency
- **FeedProgram**: Uses `external_ref` for idempotency (or name uniqueness per tenant)
- **FeedInventorySnapshot**: Uses `external_ref` for idempotency

**Note**: Contracts allow either `Idempotency-Key` header OR `external_ref`/`event_id`. Current implementation supports `external_ref` consistently. For full `Idempotency-Key` header support, an idempotency cache table could be added, but `external_ref` provides production-grade idempotency as per contract.

### Database Schema Notes

- All tables include `tenant_id` with indexes for multi-tenant isolation
- Unique constraints on `(tenant_id, external_ref)` where applicable
- KpiDaily table ready (currently used for optional caching; MVP computes on-demand)

### KPI Computation Notes

**Weight Data Source**: 
- Fetched from `cloud-telemetry-service` via HTTP API
- Uses `/api/v1/telemetry/aggregates` (daily bucket) when available, falls back to `/api/v1/telemetry/readings`
- Query filters: `metric='weight'`, `barnId`, optional `batchId`, date range

**Corner Cases Handled**:
- ✅ `weight_gain <= 0`: FCR set to `null` (not infinity)
- ✅ Missing intake: FCR omitted (intakeMissingFlag logic)
- ✅ Missing weight: weightMissingFlag logic
- ⚠️ Animal count changes/mortality adjustments: Placeholder logic (TODO: integrate with barn-records-service)

**KPI Formulas**:
- FCR = `total_feed_kg / weight_gain_kg` (null if weight_gain <= 0)
- ADG = `weight_gain_kg / animal_count * 1000` (grams/day, null if no count available)
- SGR = `((ln(Wt) - ln(W0)) / days) * 100` (percentage, requires previous day weight)

### Next Steps (Priority Order)

1. **High Priority**:
   - ✅ Complete remaining feed service endpoints (lots, deliveries, quality) - **DONE**
   - ✅ Implement KPI computation and GET /api/v1/kpi/feeding - **DONE (MVP)**
   - ✅ Create cloud-barn-records-service - **DONE**
   - Enhance KPI computation: integrate animal count and mortality from barn-records-service

2. **Medium Priority**:
   - Implement edge-feed-intake service
   - Add RabbitMQ consumers
   - BFF integration

3. **Lower Priority**:
   - OpenAPI specs
   - Comprehensive testing
   - Performance optimization

---

## 🔧 How to Run (Current State)

```bash
cd cloud-layer/cloud-feed-service
npm install
npm run prisma:generate
npm run migrate:up  # After schema is finalized
npm run dev
```

Service will run on port 3000 (or APP_PORT env var).

---

**Last Updated**: 2025-01-02

---

## 📋 cloud-barn-records-service Summary

### Endpoints Implemented

**Total: 9 endpoints**

1. **POST /api/v1/barn-records/morbidity** - Create morbidity event
2. **POST /api/v1/barn-records/mortality** - Create mortality event
3. **POST /api/v1/barn-records/vaccines** - Create vaccine event
4. **POST /api/v1/barn-records/treatments** - Create treatment event
5. **POST /api/v1/barn-records/daily-counts** - Create daily count
6. **GET  /api/v1/barn-records/daily-counts** - List daily counts (with pagination/filters)
7. **POST /api/v1/barn-records/welfare-checks** - Create welfare check
8. **POST /api/v1/barn-records/housing-conditions** - Create housing condition
9. **POST /api/v1/barn-records/genetics** - Create genetic profile

### Prisma Migration Summary

**Tables**: 9 tables created
- All tables include `tenant_id` for multi-tenant isolation
- Unique constraints: `(tenant_id, external_ref)`, `(tenant_id, event_id)` where applicable
- Special constraints:
  - `barn_daily_count`: `unique(tenant_id, barn_id, record_date)` - one count per barn per day
  - `barn_genetic_profile`: `unique(tenant_id, batch_id)` - one profile per batch
- Indexes: Created for common query patterns (tenant_id, occurred_at, farm_id, barn_id, batch_id)

**Migration Command**:
```bash
cd cloud-layer/cloud-barn-records-service
npm run migrate:up
```

### How to Run Locally

```bash
cd cloud-layer/cloud-barn-records-service
npm install
npm run prisma:generate

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/barn_records_db"

# Run migrations
npm run migrate:up

# Start service
npm run dev
```

Service runs on port 3000 (or APP_PORT env var).

### Idempotency Strategy

**Current Implementation:**
- All POST endpoints support idempotency via:
  - `Idempotency-Key` header (mapped to `external_ref` if provided)
  - `external_ref` field in request body
  - `event_id` field in request body (for event-driven ingestion)
- Service checks for existing records before creating
- Returns existing record with 201 status on duplicate (idempotent retry)
- Unique constraints in DB prevent duplicate entries

### Files Created

1. **Root files**: package.json, tsconfig.json, Dockerfile, openapi.yaml, README.md
2. **Prisma**: schema.prisma, seed.ts
3. **Source files**:
   - src/index.ts
   - src/utils/ (logger, datadog, swagger, tenantScope)
   - src/middlewares/ (transactionId, authMiddleware, validationMiddleware)
   - src/services/ (barnRecordsService.ts)
   - src/controllers/ (barnRecordsController.ts)
   - src/routes/ (barnRecordsRoutes.ts, index.ts)

### Sample cURL Commands

See README.md in `cloud-layer/cloud-barn-records-service/` for detailed examples.


---

## 📋 Sample cURL Commands

### Create Feed Formula (Idempotent)
```bash
curl -X POST http://localhost:3000/api/v1/feed/formulas \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-ff-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "name": "Broiler Starter A",
    "species": "broiler",
    "phase": "starter",
    "energyKcalPerKg": 3000,
    "proteinPct": 22.5,
    "externalRef": "SAP-FORMULA-001"
  }'
```

### Create Feed Lot (Idempotent)
```bash
curl -X POST http://localhost:3000/api/v1/feed/lots \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-fl-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "lotCode": "LOT-2025-001",
    "feedFormulaId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
    "quantityKg": 5000,
    "externalRef": "SAP-LOT-777"
  }'
```

### Create Feed Delivery
```bash
curl -X POST http://localhost:3000/api/v1/feed/deliveries \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-fd-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "feedLotId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
    "deliveredAt": "2025-01-02T08:00:00Z",
    "quantityKg": 1200,
    "deliveryRef": "DELIV-2025-001"
  }'
```

### Create Feed Quality Result
```bash
curl -X POST http://localhost:3000/api/v1/feed/quality-results \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-fq-001" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "feedLotId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
    "sampledAt": "2025-01-02T09:00:00Z",
    "metric": "protein_pct",
    "value": 22.1,
    "unit": "%"
  }'
```

### List Feed Intake Records (with pagination)
```bash
curl -X GET "http://localhost:3000/api/v1/feed/intake-records?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004&start=2025-01-01&end=2025-01-03&limit=25" \
  -H "Authorization: Bearer <jwt>"
```

### List Feed Lots (with filters)
```bash
curl -X GET "http://localhost:3000/api/v1/feed/lots?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&farmId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003&status=active&limit=25" \
  -H "Authorization: Bearer <jwt>"
```

