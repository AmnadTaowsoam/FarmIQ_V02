# Frontend: Feeding Module and Barn Records

## Purpose
Define FE menus, routes, page responsibilities, and API dependencies for the Feeding module and Barn Records.

## Scope
- Sidebar menu structure and routing
- Page specs for feeding and barn records
- API dependencies and permissions

## Non-goals
- UI design system details
- Backend implementation

## Routing and Menu Structure

### Canonical routes
- Feeding KPI page canonical route: `/feeding/kpi`
- Legacy route `/feeding-fcr` must redirect to `/feeding/kpi` (client-side redirect + server rewrite).
- All feeding pages live under `/feeding/*`.

### Sidebar menu

| menu | page | route | roles | API calls |
|---|---|---|---|---|
| Feeding Module | KPI Dashboard | /feeding/kpi | viewer+ | GET /api/v1/kpi/feeding, GET /api/v1/feed/intake-records |
| Feeding Module | Daily Feed Intake | /feeding/intake | house_operator+ | POST /api/v1/feed/intake-records, GET /api/v1/feed/intake-records |
| Feeding Module | Feed Lots & Deliveries | /feeding/lots | farm_manager+ | POST /api/v1/feed/lots, POST /api/v1/feed/deliveries, GET /api/v1/feed/lots |
| Feeding Module | Feed Quality Results | /feeding/quality | farm_manager+ | POST /api/v1/feed/quality-results, GET /api/v1/feed/quality-results |
| Feeding Module | Feed Program (optional) | /feeding/programs | farm_manager+ | POST /api/v1/feed/programs, GET /api/v1/feed/programs |
| Barn Records | Health Events | /barn-records/health | house_operator+ | POST /api/v1/barn-records/morbidity, POST /api/v1/barn-records/mortality, POST /api/v1/barn-records/treatments, POST /api/v1/barn-records/vaccines |
| Barn Records | Welfare Checks | /barn-records/welfare | house_operator+ | POST /api/v1/barn-records/welfare-checks |
| Barn Records | Housing Conditions | /barn-records/housing | house_operator+ | POST /api/v1/barn-records/housing-conditions |
| Admin | Master Data | /admin/master-data | tenant_admin+ | POST /api/v1/feed/formulas, POST /api/v1/barn-records/genetics |

## Page Specifications

### 1) Feeding KPI Dashboard (/feeding/kpi)
- Fields: date range, barn filter, batch filter.
- Validations: startDate <= endDate; max range 180 days.
- UX notes: show FCR/ADG/SGR cards, trend chart, missing data flags.
- API calls: GET /api/v1/kpi/feeding, GET /api/v1/feed/intake-records (for drilldown).
- Permissions: viewer+.
- Offline/retry: cache last 7 days locally; retry on 429 with backoff.

### 2) Daily Feed Intake (/feeding/intake)
- Fields: occurredAt, barn, batch, source, quantityKg, feedLotId, feedFormulaId, notes.
- Validations: quantityKg >= 0; occurredAt not future; barn required.
- UX notes: bulk entry grid for daily rows; show dedupe warnings.
- API calls: POST /api/v1/feed/intake-records, GET /api/v1/feed/intake-records.
- Permissions: house_operator+.
- Offline/retry: queue entries locally with Idempotency-Key; sync when online.

### 3) Feed Lots & Deliveries (/feeding/lots)
- Fields (lot): lotCode, supplierName, feedFormulaId, manufactureDate, receivedDate, quantityKg.
- Fields (delivery): feedLotId, deliveredAt, quantityKg, unitCost.
- Validations: lotCode unique per tenant; quantityKg >= 0.
- UX notes: lot list + delivery history; show remaining_kg.
- API calls: POST /api/v1/feed/lots, POST /api/v1/feed/deliveries, GET /api/v1/feed/lots.
- Permissions: farm_manager+.
- Offline/retry: allow draft creation; submit when online.

### 4) Feed Quality Results (/feeding/quality)
- Fields: feedLotId, sampledAt, metric, value, unit, method.
- Validations: value >= 0; sampledAt <= now.
- UX notes: per-lot results table with status tags.
- API calls: POST /api/v1/feed/quality-results, GET /api/v1/feed/quality-results.
- Permissions: farm_manager+.
- Offline/retry: block creation when offline.

### 5) Feed Program (optional) (/feeding/programs)
- Fields: name, status, startDate, endDate, notes.
- Validations: endDate >= startDate.
- UX notes: allow toggle feature flag; hide menu if disabled.
- API calls: POST /api/v1/feed/programs, GET /api/v1/feed/programs.
- Permissions: farm_manager+.
- Offline/retry: block creation when offline.

### 6) Health Events (/barn-records/health)
- Fields: event type (morbidity/mortality/vaccine/treatment/cull), occurredAt, animalCount, details.
- Validations: animalCount >= 0; occurredAt <= now.
- UX notes: segmented forms per event type; show batch context.
- API calls: POST /api/v1/barn-records/morbidity, POST /api/v1/barn-records/mortality, POST /api/v1/barn-records/vaccines, POST /api/v1/barn-records/treatments.
- Permissions: house_operator+.
- Offline/retry: queue submissions with Idempotency-Key.

### 7) Welfare Checks (/barn-records/welfare)
- Fields: gaitScore, lesionScore, behaviorScore, occurredAt.
- Validations: scores 0-5.
- UX notes: quick form + trend chart.
- API calls: POST /api/v1/barn-records/welfare-checks.
- Permissions: house_operator+.
- Offline/retry: queue submissions.

### 8) Housing Conditions (/barn-records/housing)
- Fields: stockingDensity, beddingType, ventilationMode, temperatureC, humidityPct, ammoniaPpm, occurredAt.
- Validations: humidityPct 0-100.
- UX notes: show latest conditions with threshold indicators.
- API calls: POST /api/v1/barn-records/housing-conditions.
- Permissions: house_operator+.
- Offline/retry: queue submissions.

### 9) Master Data (/admin/master-data)
- Fields: feed formulas, genetic profiles mapping to batches.
- Validations: unique name per tenant.
- UX notes: admin-only tabs.
- API calls: POST /api/v1/feed/formulas, POST /api/v1/barn-records/genetics.
- Permissions: tenant_admin+.
- Offline/retry: block when offline.

## API/Contracts Summary
- Feed service: `../contracts/feed-service.contract.md`
- Barn records service: `../contracts/barn-records-service.contract.md`

## Security, Compliance, Observability, Operations
- AuthN/AuthZ: JWT/OIDC via BFF; enforce RBAC at UI and API.
- Error handling: display error envelope messages from `shared/01-api-standards.md`.
- Rate limiting: show retry-after on 429 and auto-retry.

## Testing and Verification
- Validate route `/feeding-fcr` redirects to `/feeding/kpi`.
- Verify menu visibility per role.

## Open Questions
1) Should KPI dashboard allow batch comparison across barns in MVP?

## Checklist Counter
- Mermaid: 0/0
- Endpoints Table Rows: 0/0
- DB Column Rows: 0/0
- Examples: 0/0
- Open Questions: 1/1
