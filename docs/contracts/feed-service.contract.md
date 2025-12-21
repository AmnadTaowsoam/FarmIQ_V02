# Feed Service Contract

## Purpose
Define the HTTP contract for feed master data, feed intake records, and KPI queries exposed by cloud-feed-service and kpi-engine (via BFF).

## Scope
- Feed formulas, lots, deliveries, quality results
- Feed intake records
- KPI queries (FCR/ADG/SGR)

## Non-goals
- Barn records (see barn records contract)
- Edge MQTT ingestion

## Architecture and Data Flow
- Service owner: `cloud-feed-service` for feed data.
- KPI owner: `kpi-engine` (read endpoints exposed via BFF).
- All endpoints follow `../shared/01-api-standards.md`.

## Endpoints

| method | path | auth scope/role | idempotency key usage | request schema summary | response schema summary | errors |
|---|---|---|---|---|---|---|
| GET | /api/health | public | n/a | none | 200 OK string | 500 |
| GET | /api/ready | internal | n/a | none | 200 OK string | 500 |
| GET | /api-docs | public | n/a | none | Swagger UI | 500 |
| GET | /api-docs/openapi.json | public | n/a | none | OpenAPI JSON | 500 |
| POST | /api/v1/feed/formulas | tenant_admin, farm_manager | required | formula payload | formula record | 400,401,403,409,422 |
| GET | /api/v1/feed/formulas | viewer+ | n/a | filters + pagination | list of formulas | 400,401,403 |
| POST | /api/v1/feed/lots | tenant_admin, farm_manager | required | lot payload | lot record | 400,401,403,409,422 |
| POST | /api/v1/feed/deliveries | tenant_admin, farm_manager | required | delivery payload | delivery record | 400,401,403,409,422 |
| POST | /api/v1/feed/quality-results | tenant_admin, farm_manager | required | quality payload | quality record | 400,401,403,409,422 |
| POST | /api/v1/feed/intake-records | tenant_admin, farm_manager, house_operator | required | intake payload | intake record | 400,401,403,409,422 |
| GET | /api/v1/feed/intake-records | viewer+ | n/a | filters + pagination | list of intake records | 400,401,403 |
| POST | /api/v1/feed/programs | tenant_admin, farm_manager | required | program payload | program record | 400,401,403,409,422 |
| POST | /api/v1/feed/inventory-snapshots | tenant_admin, farm_manager | required | snapshot payload | snapshot record | 400,401,403,409,422 |
| GET | /api/v1/kpi/feeding | viewer+ | n/a | filters + date range | KPI series | 400,401,403,404 |

## OpenAPI Snippets

```yaml
paths:
  /api/v1/feed/intake-records:
    post:
      summary: Create feed intake record
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
              $ref: '#/components/schemas/FeedIntakeCreate'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FeedIntakeRecord'
  /api/v1/kpi/feeding:
    get:
      summary: Query feeding KPIs
      parameters:
        - in: query
          name: tenantId
          required: true
          schema: { type: string }
        - in: query
          name: barnId
          required: true
          schema: { type: string }
        - in: query
          name: startDate
          required: true
          schema: { type: string, format: date }
        - in: query
          name: endDate
          required: true
          schema: { type: string, format: date }
      responses:
        '200':
          description: KPI series
```

## Request / Response Examples

### Example 1 (Idempotent): Create feed formula
**Request**
```http
POST /api/v1/feed/formulas
Idempotency-Key: idem-ff-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "name": "Broiler Starter A",
  "species": "broiler",
  "phase": "starter",
  "energyKcalPerKg": 3000,
  "proteinPct": 22.5,
  "status": "active"
}
```
**Response (first)**
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "name": "Broiler Starter A",
  "status": "active"
}
```
**Response (second, same Idempotency-Key)**
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "name": "Broiler Starter A",
  "status": "active"
}
```

### Example 2 (Idempotent): Create feed lot
**Request**
```http
POST /api/v1/feed/lots
Idempotency-Key: idem-fl-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "lotCode": "LOT-2025-001",
  "feedFormulaId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "quantityKg": 5000
}
```
**Response (first)**
```json
{
  "id": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "lotCode": "LOT-2025-001",
  "quantityKg": 5000
}
```
**Response (second, same Idempotency-Key)**
```json
{
  "id": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "lotCode": "LOT-2025-001",
  "quantityKg": 5000
}
```

### Example 3 (Idempotent): Create feed delivery
**Request**
```http
POST /api/v1/feed/deliveries
Idempotency-Key: idem-fd-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "feedLotId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "deliveredAt": "2025-01-02T08:00:00Z",
  "quantityKg": 1200
}
```
**Response (first)**
```json
{
  "id": "0190a1d1-cccc-7d3f-b2e4-9e8b5f8e0003",
  "deliveredAt": "2025-01-02T08:00:00Z",
  "quantityKg": 1200
}
```
**Response (second, same Idempotency-Key)**
```json
{
  "id": "0190a1d1-cccc-7d3f-b2e4-9e8b5f8e0003",
  "deliveredAt": "2025-01-02T08:00:00Z",
  "quantityKg": 1200
}
```

### Example 4 (Idempotent): Create feed quality result
**Request**
```http
POST /api/v1/feed/quality-results
Idempotency-Key: idem-fq-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "feedLotId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "sampledAt": "2025-01-02T09:00:00Z",
  "metric": "protein_pct",
  "value": 22.1,
  "unit": "%"
}
```
**Response (first)**
```json
{
  "id": "0190a1d1-dddd-7d3f-b2e4-9e8b5f8e0004",
  "metric": "protein_pct",
  "value": 22.1
}
```
**Response (second, same Idempotency-Key)**
```json
{
  "id": "0190a1d1-dddd-7d3f-b2e4-9e8b5f8e0004",
  "metric": "protein_pct",
  "value": 22.1
}
```

### Example 5 (Idempotent): Create feed intake record (manual)
**Request**
```http
POST /api/v1/feed/intake-records
Idempotency-Key: idem-fi-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0999",
  "source": "MANUAL",
  "quantityKg": 350,
  "occurredAt": "2025-01-02T10:00:00Z"
}
```
**Response (first)**
```json
{
  "id": "0190a1d1-eeee-7d3f-b2e4-9e8b5f8e0005",
  "quantityKg": 350,
  "occurredAt": "2025-01-02T10:00:00Z"
}
```
**Response (second, same Idempotency-Key)**
```json
{
  "id": "0190a1d1-eeee-7d3f-b2e4-9e8b5f8e0005",
  "quantityKg": 350,
  "occurredAt": "2025-01-02T10:00:00Z"
}
```

### Example 6: List feed intake records
**Request**
```http
GET /api/v1/feed/intake-records?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004&start=2025-01-01&end=2025-01-03&limit=2
Authorization: Bearer <jwt>
```
**Response**
```json
{
  "items": [
    {
      "id": "0190a1d1-eeee-7d3f-b2e4-9e8b5f8e0005",
      "quantityKg": 350,
      "occurredAt": "2025-01-02T10:00:00Z"
    }
  ],
  "nextCursor": "2025-01-02T10:00:00Z"
}
```

### Example 7: Query KPI series
**Request**
```http
GET /api/v1/kpi/feeding?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004&startDate=2025-01-01&endDate=2025-01-03
Authorization: Bearer <jwt>
```
**Response**
```json
{
  "items": [
    { "recordDate": "2025-01-01", "fcr": 1.72, "adgG": 52.1, "sgrPct": 1.8 },
    { "recordDate": "2025-01-02", "fcr": 1.68, "adgG": 54.0, "sgrPct": 1.9 }
  ]
}
```

### Example 8 (Error): Validation error
**Request**
```http
POST /api/v1/feed/intake-records
Idempotency-Key: idem-fi-002
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{ "quantityKg": -5 }
```
**Response**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "quantityKg must be >= 0",
    "traceId": "trace-err-001"
  }
}
```

### Example 9 (Error): Conflict on external_ref
**Request**
```http
POST /api/v1/feed/lots
Idempotency-Key: idem-fl-002
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{ "tenantId": "t-001", "lotCode": "LOT-2025-001", "externalRef": "SAP-777" }
```
**Response**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "external_ref already exists",
    "traceId": "trace-err-002"
  }
}
```

### Example 10 (Error): Unauthorized
**Request**
```http
POST /api/v1/feed/formulas
Idempotency-Key: idem-ff-002
Content-Type: application/json
```
```json
{ "tenantId": "t-001", "name": "Starter" }
```
**Response**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "missing bearer token",
    "traceId": "trace-err-003"
  }
}
```

### Example 11: Create feed program (optional)
**Request**
```http
POST /api/v1/feed/programs
Idempotency-Key: idem-fp-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "name": "Starter 1-14",
  "status": "active",
  "startDate": "2025-01-01",
  "endDate": "2025-01-14"
}
```
**Response**
```json
{
  "id": "0190a1d1-ffff-7d3f-b2e4-9e8b5f8e0006",
  "name": "Starter 1-14",
  "status": "active"
}
```

### Example 12: Create inventory snapshot (optional)
**Request**
```http
POST /api/v1/feed/inventory-snapshots
Idempotency-Key: idem-fs-001
Authorization: Bearer <jwt>
Content-Type: application/json
```
```json
{
  "tenantId": "t-001",
  "farmId": "f-001",
  "barnId": "b-001",
  "feedLotId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "snapshotAt": "2025-01-02T12:00:00Z",
  "quantityKg": 3200,
  "source": "MANUAL"
}
```
**Response**
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0010",
  "quantityKg": 3200
}
```

## Edge / Cloud Responsibilities
- Cloud-feed-service owns feed master data and intake records.
- KPI read is served by kpi-engine through BFF for dashboard usage.

## Security, Compliance, Observability, Operations
- AuthN/AuthZ: JWT/OIDC; RBAC per `../06-rbac-authorization-matrix.md`.
- Idempotency: mandatory `Idempotency-Key` for POSTs.
- Pagination: cursor-based for list endpoints.
- Rate limiting: 429 on abuse; per-tenant rate limits.
- Error envelope per `../shared/01-api-standards.md`.

## Testing and Verification
- Use example requests above; verify idempotent behavior and pagination.

## Open Questions
1) Should KPI endpoints be hosted directly on kpi-engine or proxied by BFF only?

## Checklist Counter
- Mermaid: 0/0
- Endpoints Table Rows: 14/14
- DB Column Rows: 0/0
- Examples: 12/12
- Open Questions: 1/1
