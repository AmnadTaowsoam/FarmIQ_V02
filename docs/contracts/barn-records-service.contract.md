# Barn Records Service Contract

## Purpose
Define the HTTP contract for barn health, welfare, housing, and genetic records.

## Scope
- Health events: morbidity, mortality, cull, vaccine, treatment, daily counts
- Welfare checks
- Housing conditions
- Genetic profile per batch

## Non-goals
- Feed intake records
- KPI computation

## Architecture and Data Flow
- Service owner: `cloud-barn-records-service`.
- Event publishing via RabbitMQ uses `barn.record.created` (see events contract).

## Endpoints

| method | path | auth scope/role | idempotency key usage | request schema summary | response schema summary | errors |
|---|---|---|---|---|---|---|
| GET | /api/health | public | n/a | none | 200 OK string | 500 |
| GET | /api/ready | internal | n/a | none | 200 OK string | 500 |
| GET | /api-docs | public | n/a | none | Swagger UI | 500 |
| GET | /api-docs/openapi.json | public | n/a | none | OpenAPI JSON | 500 |
| POST | /api/v1/barn-records/morbidity | tenant_admin, farm_manager, house_operator | required | morbidity payload | morbidity record | 400,401,403,409,422 |
| POST | /api/v1/barn-records/mortality | tenant_admin, farm_manager, house_operator | required | mortality payload | mortality record | 400,401,403,409,422 |
| POST | /api/v1/barn-records/vaccines | tenant_admin, farm_manager | required | vaccine payload | vaccine record | 400,401,403,409,422 |
| POST | /api/v1/barn-records/treatments | tenant_admin, farm_manager | required | treatment payload | treatment record | 400,401,403,409,422 |
| POST | /api/v1/barn-records/daily-counts | tenant_admin, farm_manager | required | daily count payload | daily count record | 400,401,403,409,422 |
| GET | /api/v1/barn-records/daily-counts | viewer+ | n/a | filters + date range | list of daily counts | 400,401,403 |
| POST | /api/v1/barn-records/welfare-checks | tenant_admin, farm_manager, house_operator | required | welfare payload | welfare record | 400,401,403,409,422 |
| POST | /api/v1/barn-records/housing-conditions | tenant_admin, farm_manager, house_operator | required | housing payload | housing record | 400,401,403,409,422 |
| POST | /api/v1/barn-records/genetics | tenant_admin, farm_manager | required | genetic payload | genetic record | 400,401,403,409,422 |

## OpenAPI Snippets

```yaml
paths:
  /api/v1/barn-records/daily-counts:
    post:
      summary: Create daily count
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BarnDailyCountCreate'
      responses:
        '201':
          description: Created
```

## Request / Response Examples

### Example 1 (Idempotent): Create morbidity event
**Request**
```http
POST /api/v1/barn-records/morbidity
Idempotency-Key: idem-bm-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "batchId": "batch-001",
  "occurredAt": "2025-01-02T06:00:00Z",
  "diseaseCode": "coccidiosis",
  "severity": "medium",
  "animalCount": 20
}
```
**Response (first)**
```json
{ "id": "0190a1d1-1111-7d3f-b2e4-9e8b5f8e0011", "animalCount": 20 }
```
**Response (second, same Idempotency-Key)**
```json
{ "id": "0190a1d1-1111-7d3f-b2e4-9e8b5f8e0011", "animalCount": 20 }
```

### Example 2 (Idempotent): Create mortality event
**Request**
```http
POST /api/v1/barn-records/mortality
Idempotency-Key: idem-bm-002
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "batchId": "batch-001",
  "occurredAt": "2025-01-02T06:30:00Z",
  "causeCode": "heat_stress",
  "animalCount": 5
}
```
**Response (first)**
```json
{ "id": "0190a1d1-2222-7d3f-b2e4-9e8b5f8e0012", "animalCount": 5 }
```
**Response (second, same Idempotency-Key)**
```json
{ "id": "0190a1d1-2222-7d3f-b2e4-9e8b5f8e0012", "animalCount": 5 }
```

### Example 3 (Idempotent): Create daily count
**Request**
```http
POST /api/v1/barn-records/daily-counts
Idempotency-Key: idem-bd-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "batchId": "batch-001",
  "recordDate": "2025-01-02",
  "animalCount": 990,
  "mortalityCount": 5,
  "cullCount": 2
}
```
**Response (first)**
```json
{ "id": "0190a1d1-3333-7d3f-b2e4-9e8b5f8e0013", "animalCount": 990 }
```
**Response (second, same Idempotency-Key)**
```json
{ "id": "0190a1d1-3333-7d3f-b2e4-9e8b5f8e0013", "animalCount": 990 }
```

### Example 4: Create vaccine event
**Request**
```http
POST /api/v1/barn-records/vaccines
Idempotency-Key: idem-bv-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "batchId": "batch-001",
  "occurredAt": "2025-01-02T07:00:00Z",
  "vaccineName": "IBD",
  "doseMl": 0.5,
  "animalCount": 990
}
```
**Response**
```json
{ "id": "0190a1d1-4444-7d3f-b2e4-9e8b5f8e0014", "vaccineName": "IBD" }
```

### Example 5: Create treatment event
**Request**
```http
POST /api/v1/barn-records/treatments
Idempotency-Key: idem-bt-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "batchId": "batch-001",
  "occurredAt": "2025-01-02T08:00:00Z",
  "treatmentName": "Amoxicillin",
  "doseMl": 1.2,
  "durationDays": 5,
  "animalCount": 120
}
```
**Response**
```json
{ "id": "0190a1d1-5555-7d3f-b2e4-9e8b5f8e0015", "treatmentName": "Amoxicillin" }
```

### Example 6: Create welfare check
**Request**
```http
POST /api/v1/barn-records/welfare-checks
Idempotency-Key: idem-bw-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "batchId": "batch-001",
  "occurredAt": "2025-01-02T09:00:00Z",
  "gaitScore": 2,
  "lesionScore": 1,
  "behaviorScore": 2
}
```
**Response**
```json
{ "id": "0190a1d1-6666-7d3f-b2e4-9e8b5f8e0016", "gaitScore": 2 }
```

### Example 7: Create housing condition
**Request**
```http
POST /api/v1/barn-records/housing-conditions
Idempotency-Key: idem-bh-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "occurredAt": "2025-01-02T09:30:00Z",
  "stockingDensity": 12.5,
  "beddingType": "rice_husk",
  "ventilationMode": "tunnel",
  "temperatureC": 30.5,
  "humidityPct": 65
}
```
**Response**
```json
{ "id": "0190a1d1-7777-7d3f-b2e4-9e8b5f8e0017", "stockingDensity": 12.5 }
```

### Example 8: Create genetic profile
**Request**
```http
POST /api/v1/barn-records/genetics
Idempotency-Key: idem-bg-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "batchId": "batch-001",
  "strain": "Cobb 500",
  "breedLine": "Line A",
  "supplier": "Hatchery X"
}
```
**Response**
```json
{ "id": "0190a1d1-8888-7d3f-b2e4-9e8b5f8e0018", "strain": "Cobb 500" }
```

### Example 9 (Error): Forbidden
**Request**
```http
POST /api/v1/barn-records/mortality
Idempotency-Key: idem-bm-003
Authorization: Bearer <jwt-viewer>
Content-Type: application/json
```
```json
{ "tenantId": "t-001", "barnId": "b-001", "animalCount": 3 }
```
**Response**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "role viewer cannot create records",
    "traceId": "trace-err-101"
  }
}
```

### Example 10 (Error): Not found
**Request**
```http
POST /api/v1/barn-records/daily-counts
Idempotency-Key: idem-bd-002
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{ "tenantId": "t-001", "barnId": "b-404", "recordDate": "2025-01-02", "animalCount": 10 }
```
**Response**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "barn not found",
    "traceId": "trace-err-102"
  }
}
```

## Edge / Cloud Responsibilities
- Cloud-barn-records-service owns all barn records.
- Events are published to RabbitMQ for KPI updates.

## Security, Compliance, Observability, Operations
- AuthN/AuthZ: JWT/OIDC with RBAC.
- Idempotency: required `Idempotency-Key` for all POSTs.
- Pagination: cursor-based for list endpoints.
- Rate limiting: 429 on abuse.

## Testing and Verification
- Create daily counts twice and confirm idempotent response.

## Open Questions
1) Should cull events have a dedicated endpoint or be included in mortality?

## Checklist Counter
- Mermaid: 0/0
- Endpoints Table Rows: 13/13
- DB Column Rows: 0/0
- Examples: 10/10
- Open Questions: 1/1
