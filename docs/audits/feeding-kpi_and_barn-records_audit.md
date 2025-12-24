# Feeding KPI and Barn Records Audit

Scope: Barn Health & Records, Feeding Module, Feeding KPI Dashboard, WeighVision read model / weight aggregates.

## Executive Summary
- What works: Frontend routes exist for Barn Records, Feeding Intake, and Feeding KPI; BFF exposes matching endpoints; barn records and feed services implement create/list and KPI computation; WeighVision read model exposes analytics with weight trends and percentiles; seed scripts and docker-compose include the required services.
- What is missing: Date filter param mismatch for daily counts and intake lists; Feeding KPI response lacks fields the frontend renders (total feed, weight gain, flags, animal count); KPI logic depends on telemetry weight rather than WeighVision aggregates or barn daily counts; analytics-service does not implement FCR/ADG/SGR KPI series; WeighVision analytics lacks sample_count and quality_pass_rate for daily aggregates.
- Biggest blockers: API/FE date-filter mismatch, KPI response shape gaps, and missing analytics-service KPI capability.

## Required Capabilities Checklist

### MUST
- [x] FE route `/feeding/kpi` exists and calls KPI API. Evidence: `apps/dashboard-web/src/App.tsx:155`, `apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx:49`.
- [x] FE route `/feeding/intake` exists and calls intake APIs. Evidence: `apps/dashboard-web/src/App.tsx:157`, `apps/dashboard-web/src/features/feeding/pages/FeedingIntakePage.tsx:61`.
- [x] FE route `/barns/records` exists and calls barn records APIs. Evidence: `apps/dashboard-web/src/App.tsx:127`, `apps/dashboard-web/src/features/barns/pages/BarnRecordsPage.tsx:41`.
- [~] BFF exposes GET/POST daily counts; FE filters use `startDate/endDate`, but service expects `start/end`. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/barnRecordsRoutes.ts:65`, `apps/dashboard-web/src/features/barns/pages/BarnRecordsPage.tsx:330`, `cloud-layer/cloud-barn-records-service/src/controllers/barnRecordsController.ts:442`.
- [~] BFF exposes GET/POST feed intake; FE filters use `startDate/endDate`, but service expects `start/end`. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/feedRoutes.ts:32`, `apps/dashboard-web/src/features/feeding/pages/FeedingIntakePage.tsx:113`, `cloud-layer/cloud-feed-service/src/controllers/feedController.ts:212`.
- [x] BFF exposes KPI series endpoint `/api/v1/kpi/feeding`. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/feedRoutes.ts:27`.
- [~] Feed KPI computation exists, but response missing fields required by FE. Evidence: `cloud-layer/cloud-feed-service/src/services/kpiService.ts:251`, `apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx:118`.
- [~] WeighVision analytics provides weight trends and percentiles, but lacks sample_count and quality_pass_rate. Evidence: `cloud-layer/cloud-weighvision-readmodel/src/services/weighvisionService.ts:775`.
- [ ] Analytics-service does not compute FCR/ADG/SGR KPI series. Evidence: `cloud-layer/cloud-analytics-service/app/routes.py:13`, `cloud-layer/cloud-analytics-service/app/analytics/compute.py:58`.

### SHOULD
- [~] Barn health optional endpoints (morbidity/vaccines/treatments/welfare/housing/genetics) are POST-only; no list endpoints. Evidence: `cloud-layer/cloud-barn-records-service/src/routes/barnRecordsRoutes.ts:11`.
- [~] Weight data should come from WeighVision aggregates or barn daily counts if available; current KPI uses telemetry-only. Evidence: `cloud-layer/cloud-feed-service/src/services/kpiService.ts:42`.

## Frontend Route to API Mapping (Trace)
- `/feeding/kpi` -> `GET /api/v1/kpi/feeding?tenantId&barnId&batchId&startDate&endDate`. Expected KPI item fields: `recordDate`, `fcr`, `adgG`, `sgrPct`, `totalFeedKg`, `weightGainKg`, `animalCount`, `intakeMissingFlag`, `weightMissingFlag`. Evidence: `apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx:20`, `apps/dashboard-web/src/features/feeding/api.ts:60`.
- `/feeding/intake` -> `GET /api/v1/feed/intake-records` (list), `POST /api/v1/feed/intake-records` (create). FE expects `{ items: [...], nextCursor }`, and POST payload fields include `tenantId`, `farmId`, `barnId`, `batchId`, `source`, `quantityKg`, `occurredAt`, `feedLotId`, `feedFormulaId`, `notes`. Evidence: `apps/dashboard-web/src/features/feeding/pages/FeedingIntakePage.tsx:100`, `apps/dashboard-web/src/features/feeding/api.ts:66`.
- `/barns/records` -> `GET /api/v1/barn-records/daily-counts` (list), `POST /api/v1/barn-records/*` (create per tab). FE list expects `items` with `recordDate`, `animalCount`, `mortalityCount`, `cullCount`, `averageWeightKg`. Evidence: `apps/dashboard-web/src/features/barns/pages/BarnRecordsPage.tsx:61`, `apps/dashboard-web/src/api/barnRecords.ts:66`.
- `/weighvision/analytics` -> `GET /api/v1/weighvision/analytics?tenantId&farm_id&barn_id&start_date&end_date`. FE expects `data.weight_trend` and `data.statistics`. Evidence: `apps/dashboard-web/src/features/weighvision/pages/AnalyticsPage.tsx:25`.

## Per-Service Audit

### cloud-api-gateway-bff
- Implemented endpoints:
  - `GET /api/v1/kpi/feeding` -> feed-service. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/feedRoutes.ts:27`.
  - `GET/POST /api/v1/feed/intake-records`, `/feed/lots`, `/feed/deliveries`, `/feed/quality-results`, `/feed/formulas`, `/feed/programs`. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/feedRoutes.ts:32`.
  - `GET/POST /api/v1/barn-records/daily-counts` and POST for other barn records. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/barnRecordsRoutes.ts:32`.
  - `GET /api/v1/weighvision/sessions`, `/analytics`. Evidence: `cloud-layer/cloud-api-gateway-bff/src/routes/weighvisionRoutes.ts:18`.
- Database models/tables used: N/A (proxy service).
- Key business logic:
  - KPI validation expects `barnId`, `startDate`, `endDate`. Evidence: `cloud-layer/cloud-api-gateway-bff/src/controllers/feedController.ts:64`.
  - Pass-through list parameters without normalization. Evidence: `cloud-layer/cloud-api-gateway-bff/src/controllers/barnRecordsController.ts:459`, `cloud-layer/cloud-api-gateway-bff/src/controllers/feedController.ts:194`.
- Missing items + severity:
  - IMPORTANT: No normalization of `startDate/endDate` to `start/end` for list endpoints, leading to unfiltered results downstream.
- Evidence: `cloud-layer/cloud-api-gateway-bff/src/controllers/barnRecordsController.ts:459`, `cloud-layer/cloud-api-gateway-bff/src/controllers/feedController.ts:194`.

### cloud-barn-records-service
- Implemented endpoints:
  - `POST /api/v1/barn-records/daily-counts` and `GET /api/v1/barn-records/daily-counts`. Evidence: `cloud-layer/cloud-barn-records-service/src/routes/barnRecordsRoutes.ts:42`.
  - `POST /api/v1/barn-records/mortality|morbidity|vaccines|treatments|welfare-checks|housing-conditions|genetics`. Evidence: `cloud-layer/cloud-barn-records-service/src/routes/barnRecordsRoutes.ts:11`.
- Database models/tables used:
  - `BarnDailyCount`, `BarnMortalityEvent`, `BarnMorbidityEvent`, `BarnVaccineEvent`, `BarnTreatmentEvent`, `BarnWelfareCheck`, `BarnHousingCondition`, `BarnGeneticProfile`. Evidence: `cloud-layer/cloud-barn-records-service/prisma/schema.prisma:12`, `cloud-layer/cloud-barn-records-service/prisma/schema.prisma:157`.
- Key business logic:
  - Create daily counts with idempotency/externalRef. Evidence: `cloud-layer/cloud-barn-records-service/src/controllers/barnRecordsController.ts:373`.
  - List daily counts with `start/end` filters. Evidence: `cloud-layer/cloud-barn-records-service/src/controllers/barnRecordsController.ts:444`, `cloud-layer/cloud-barn-records-service/src/services/barnRecordsService.ts:574`.
- Missing items + severity:
  - IMPORTANT: No GET list endpoints for mortality/morbidity/vaccines/treatments/welfare/housing/genetics (only POST). This blocks historical views if required.
- Evidence: `cloud-layer/cloud-barn-records-service/src/routes/barnRecordsRoutes.ts:11`.

### cloud-feed-service
- Implemented endpoints:
  - `GET /api/v1/kpi/feeding` (KPI series). Evidence: `cloud-layer/cloud-feed-service/src/routes/kpiRoutes.ts:9`.
  - `GET/POST /api/v1/feed/intake-records`, `/feed/lots`, `/feed/deliveries`, `/feed/quality-results`, `/feed/formulas`, `/feed/programs`, `/feed/inventory-snapshots`. Evidence: `cloud-layer/cloud-feed-service/src/controllers/feedController.ts:118`.
- Database models/tables used:
  - `FeedIntakeRecord`, `FeedLot`, `FeedDelivery`, `FeedFormula`, `FeedProgram`, `FeedQualityResult`, `KpiDaily`. Evidence: `cloud-layer/cloud-feed-service/prisma/schema.prisma:17`, `cloud-layer/cloud-feed-service/prisma/schema.prisma:117`, `cloud-layer/cloud-feed-service/prisma/schema.prisma:203`.
- Key business logic:
  - KPI computation uses feed intake + telemetry aggregates/readings. Evidence: `cloud-layer/cloud-feed-service/src/services/kpiService.ts:42`.
  - KPI output contains only `recordDate`, `fcr`, `adgG`, `sgrPct`. Evidence: `cloud-layer/cloud-feed-service/src/services/kpiService.ts:251`.
- Missing items + severity:
  - IMPORTANT: KPI output missing `totalFeedKg`, `weightGainKg`, `animalCount`, `intakeMissingFlag`, `weightMissingFlag` expected by FE.
  - IMPORTANT: KPI uses telemetry weight only; no WeighVision or barn daily count integration for weights/animal counts.
  - NICE: ADG and mortality adjustments are TODO and not computed.
- Evidence: `cloud-layer/cloud-feed-service/src/services/kpiService.ts:237`, `cloud-layer/cloud-feed-service/src/services/kpiService.ts:334`.

### cloud-weighvision-readmodel
- Implemented endpoints:
  - `GET /api/v1/weighvision/sessions` and `GET /api/v1/weighvision/analytics`. Evidence: `cloud-layer/cloud-weighvision-readmodel/src/routes/weighvisionRoutes.ts:72`.
- Database models/tables used:
  - WeighVision session/measurement/media/inference tables (Prisma schema + raw SQL). Evidence: `cloud-layer/cloud-weighvision-readmodel/src/services/weighvisionService.ts:645`.
- Key business logic:
  - Analytics aggregates weights into `weight_trend` and percentiles. Evidence: `cloud-layer/cloud-weighvision-readmodel/src/services/weighvisionService.ts:775`.
- Missing items + severity:
  - IMPORTANT: No explicit daily aggregate response fields `sample_count` and `quality_pass_rate` required by spec.
- Evidence: `cloud-layer/cloud-weighvision-readmodel/src/services/weighvisionService.ts:781`.

### cloud-telemetry-service (dependency for KPI weights)
- Implemented endpoints:
  - `GET /api/v1/telemetry/readings`, `GET /api/v1/telemetry/aggregates`. Evidence: `cloud-layer/cloud-telemetry-service/src/routes/telemetryRoutes.ts:63`.
- Database models/tables used: telemetry raw/aggregate tables (not enumerated here).
- Key business logic:
  - KPI fetch uses telemetry aggregates with `metric=weight` and `bucket=1d`. Evidence: `cloud-layer/cloud-feed-service/src/services/kpiService.ts:59`.
- Missing items + severity:
  - NICE: No percentiles or quality metrics in telemetry aggregates for weight.
- Evidence: `cloud-layer/cloud-telemetry-service/src/routes/telemetryRoutes.ts:65`.

### cloud-analytics-service
- Implemented endpoints:
  - `GET /api/v1/kpis`, `/anomalies`, `/forecasts` (generic telemetry KPIs). Evidence: `cloud-layer/cloud-analytics-service/app/routes.py:13`.
- Database models/tables used:
  - `AnalyticsResult` (generic KPI records). Evidence: `cloud-layer/cloud-analytics-service/app/models.py:18`.
- Key business logic:
  - Computes KPIs from telemetry and weighvision events, not feeding KPIs. Evidence: `cloud-layer/cloud-analytics-service/app/analytics/compute.py:58`.
- Missing items + severity:
  - BLOCKER (per requirements): No FCR/ADG/SGR KPI time-series endpoint or computation.
- Evidence: `cloud-layer/cloud-analytics-service/app/routes.py:13`.

## Data Availability and Infra
- Seed scripts exist for feed intake and barn daily counts. Evidence: `cloud-layer/cloud-feed-service/prisma/seed.ts:166`, `cloud-layer/cloud-barn-records-service/prisma/seed.ts:200`.
- WeighVision read model seed exists for sessions/measurements. Evidence: `cloud-layer/cloud-weighvision-readmodel/prisma/seed.ts:42`.
- docker-compose includes analytics, feed, barn-records, weighvision-readmodel, and BFF services. Evidence: `cloud-layer/docker-compose.yml:179`, `cloud-layer/docker-compose.yml:329`, `cloud-layer/docker-compose.yml:361`, `cloud-layer/docker-compose.yml:393`, `cloud-layer/docker-compose.yml:430`.

## Curl Verification Commands (Must-Have Endpoints)

### Barn Records: Daily Counts
```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5125/api/v1/barn-records/daily-counts?tenantId=TENANT&barnId=BARN&start=2024-01-01&end=2024-01-31&limit=25"
```
Expected 200 JSON shape:
```json
{ "items": [ { "recordDate": "2024-01-01", "animalCount": 1000, "mortalityCount": 2, "cullCount": 1, "averageWeightKg": "1.25" } ], "nextCursor": null }
```

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"tenantId":"TENANT","farmId":"FARM","barnId":"BARN","batchId":"BATCH","recordDate":"2024-01-01","animalCount":1000,"mortalityCount":2,"cullCount":1,"averageWeightKg":1.25}' \
  "http://localhost:5125/api/v1/barn-records/daily-counts"
```
Expected 201 JSON shape:
```json
{ "id": "...", "animalCount": 1000 }
```

### Feeding: Daily Intake
```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5125/api/v1/feed/intake-records?tenantId=TENANT&barnId=BARN&start=2024-01-01&end=2024-01-31&limit=25"
```
Expected 200 JSON shape:
```json
{ "items": [ { "id": "...", "quantityKg": "50.0", "occurredAt": "2024-01-01T06:00:00.000Z" } ], "nextCursor": null }
```

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"tenantId":"TENANT","farmId":"FARM","barnId":"BARN","batchId":"BATCH","source":"MANUAL","quantityKg":50,"occurredAt":"2024-01-01T06:00:00.000Z"}' \
  "http://localhost:5125/api/v1/feed/intake-records"
```
Expected 201 JSON shape:
```json
{ "id": "...", "quantityKg": "50", "occurredAt": "2024-01-01T06:00:00.000Z" }
```

### Feeding: Lots and Deliveries
```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5125/api/v1/feed/lots?tenantId=TENANT&farmId=FARM&limit=25"
```
Expected 200 JSON shape:
```json
{ "items": [ { "id": "...", "lotCode": "LOT-..." } ], "nextCursor": null }
```

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"tenantId":"TENANT","farmId":"FARM","lotCode":"LOT-0001","quantityKg":1000,"receivedDate":"2024-01-01"}' \
  "http://localhost:5125/api/v1/feed/lots"
```
Expected 201 JSON shape:
```json
{ "id": "...", "lotCode": "LOT-0001", "status": "active" }
```

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5125/api/v1/feed/deliveries?tenantId=TENANT&barnId=BARN&limit=25"
```
Expected 200 JSON shape:
```json
{ "items": [ { "id": "...", "feedLotId": "...", "quantityKg": "100" } ], "nextCursor": null }
```

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"tenantId":"TENANT","farmId":"FARM","barnId":"BARN","feedLotId":"LOT","deliveredAt":"2024-01-01T06:00:00.000Z","quantityKg":100}' \
  "http://localhost:5125/api/v1/feed/deliveries"
```
Expected 201 JSON shape:
```json
{ "id": "...", "feedLotId": "...", "quantityKg": "100" }
```

### Feeding KPI Series
```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5125/api/v1/kpi/feeding?tenantId=TENANT&barnId=BARN&startDate=2024-01-01&endDate=2024-01-31"
```
Expected 200 JSON shape:
```json
{ "items": [ { "recordDate": "2024-01-01", "fcr": 1.6, "adgG": 42.0, "sgrPct": 1.1 } ] }
```

### WeighVision Analytics
```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5125/api/v1/weighvision/analytics?tenantId=TENANT&barn_id=BARN&start_date=2024-01-01&end_date=2024-01-31&aggregation=daily"
```
Expected 200 JSON shape:
```json
{ "data": { "weight_trend": [ { "date": "2024-01-01", "avg_weight_kg": 1.2, "p50_weight_kg": 1.1 } ], "statistics": { "current_avg_weight_kg": 1.2 } } }
```

## Gap List (Actionable)
1. Date filter param mismatch for daily counts list.
   - Missing: FE uses `startDate/endDate`, service expects `start/end`.
   - Where: `cloud-api-gateway-bff` or FE `apps/dashboard-web/src/features/barns/pages/BarnRecordsPage.tsx`.
   - Suggested endpoint shape: accept both `startDate/endDate` and map to `start/end` in BFF.
   - Suggested DB fields: none.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/barn-records/daily-counts?tenantId=T&barnId=B&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - Priority: IMPORTANT.

2. Date filter param mismatch for feed intake list.
   - Missing: FE uses `startDate/endDate`, service expects `start/end`.
   - Where: `cloud-api-gateway-bff` or FE `apps/dashboard-web/src/features/feeding/pages/FeedingIntakePage.tsx`.
   - Suggested endpoint shape: accept both `startDate/endDate` and map to `start/end` in BFF.
   - Suggested DB fields: none.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/feed/intake-records?tenantId=T&barnId=B&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - Priority: IMPORTANT.

3. Feeding KPI response missing fields expected by FE.
   - Missing: `totalFeedKg`, `weightGainKg`, `animalCount`, `intakeMissingFlag`, `weightMissingFlag`.
   - Where: `cloud-feed-service/src/services/kpiService.ts` and `cloud-feed-service/src/routes/kpiRoutes.ts`.
   - Suggested endpoint shape:
     ```json
     { "items": [ { "recordDate": "YYYY-MM-DD", "fcr": 1.6, "adgG": 42, "sgrPct": 1.1, "totalFeedKg": 120, "weightGainKg": 75, "animalCount": 1000, "intakeMissingFlag": false, "weightMissingFlag": false } ] }
     ```
   - Suggested DB fields: reuse `KpiDaily` columns in `cloud-feed-service/prisma/schema.prisma`.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/kpi/feeding?tenantId=T&barnId=B&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - Priority: IMPORTANT.

4. KPI weight sourcing does not use WeighVision aggregates or daily counts.
   - Missing: weight daily aggregates with percentiles/quality, or fallback to barn daily counts avg weight.
   - Where: `cloud-feed-service/src/services/kpiService.ts` and/or `cloud-weighvision-readmodel/src/services/weighvisionService.ts`.
   - Suggested endpoint shape: add `GET /api/v1/weighvision/aggregates?tenantId&barnId&startDate&endDate` returning `avg_weight_kg`, `p10`, `p50`, `p90`, `sample_count`, `quality_pass_rate`.
   - Suggested DB fields: none (derive from measurements) or add materialized table in read model.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/weighvision/aggregates?tenantId=T&barnId=B&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - Priority: IMPORTANT.

5. Analytics-service missing FCR/ADG/SGR KPI series endpoint.
   - Missing: KPI computation across feed intake + weight for charts.
   - Where: `cloud-analytics-service` (new endpoint, or extend `/kpis`).
   - Suggested endpoint shape:
     ```json
     GET /api/v1/analytics/kpis/feeding?tenantId&barnId&startDate&endDate -> { "items": [ { "recordDate": "YYYY-MM-DD", "fcr": 1.6, "adgG": 42, "sgrPct": 1.1 } ] }
     ```
   - Suggested DB fields: optional cached series table.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/analytics/kpis/feeding?tenantId=T&barnId=B&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - Priority: BLOCKER.

6. FE feeding KPI page does not enforce barn selection but API requires barnId.
   - Missing: client-side guard or API fallback to farm scope.
   - Where: `apps/dashboard-web/src/App.tsx` and `apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx`.
   - Suggested endpoint shape: allow `farmId`-scoped KPI or require barn selection in FE.
   - Suggested DB fields: none.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/kpi/feeding?tenantId=T&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - Priority: IMPORTANT.

7. Barn records history for mortality/morbidity/vaccines/treatments/welfare/housing lacks list endpoints.
   - Missing: `GET /api/v1/barn-records/{type}` for each type.
   - Where: `cloud-barn-records-service/src/routes/barnRecordsRoutes.ts`.
   - Suggested endpoint shape:
     ```json
     GET /api/v1/barn-records/mortality?tenantId&barnId&start&end -> { "items": [ { "occurredAt": "...", "animalCount": 2 } ], "nextCursor": null }
     ```
   - Suggested DB fields: none.
   - Suggested tests:
     ```bash
     curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:5125/api/v1/barn-records/mortality?tenantId=T&barnId=B&start=2024-01-01&end=2024-01-31"
     ```
   - Priority: NICE.
