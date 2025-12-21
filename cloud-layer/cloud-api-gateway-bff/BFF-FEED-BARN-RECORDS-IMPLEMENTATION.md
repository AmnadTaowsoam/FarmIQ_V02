# BFF Feed & Barn Records Proxy Implementation

**Date**: 2025-01-02  
**Status**: ✅ **COMPLETE**

---

## Summary

Wired `cloud-api-gateway-bff` to expose proxy endpoints for:
- `cloud-feed-service` (port 5130)
- `cloud-barn-records-service` (port 5131)

Dashboard-web can now call ONLY the BFF for these features.

---

## Files Changed

### New Files Created

1. **`src/services/feedService.ts`** - Service client for feed-service
   - Typed client interface with all feed operations
   - Handles base URL configuration via env vars
   - Builds query strings and propagates headers

2. **`src/services/barnRecordsService.ts`** - Service client for barn-records-service
   - Typed client interface with all barn records operations
   - Handles base URL configuration via env vars
   - Builds query strings and propagates headers

3. **`src/controllers/feedController.ts`** - Feed endpoints controllers
   - Handlers for all feed service proxy endpoints
   - Tenant scoping enforcement
   - Error handling and observability logging

4. **`src/controllers/barnRecordsController.ts`** - Barn records endpoints controllers
   - Handlers for all barn-records service proxy endpoints
   - Tenant scoping enforcement
   - Error handling and observability logging

5. **`src/routes/feedRoutes.ts`** - Feed routes definition
6. **`src/routes/barnRecordsRoutes.ts`** - Barn records routes definition

### Modified Files

1. **`src/routes/index.ts`** - Added feed and barn-records route mounting
2. **`src/services/dashboardService.ts`** - Added feed/barn-records URLs to ServiceBaseUrls
3. **`openapi.yaml`** - Added all new endpoints to OpenAPI spec

---

## New Environment Variables

Add to `.env` or docker-compose:

```bash
# Feed Service
FEED_SERVICE_URL=http://cloud-feed-service:5130
# Or use FEED_BASE_URL (alternative name)

# Barn Records Service
BARN_RECORDS_SERVICE_URL=http://cloud-barn-records-service:5131
# Or use BARN_RECORDS_BASE_URL (alternative name)
```

Defaults (if not set):
- `FEED_SERVICE_URL`: `http://cloud-feed-service:5130`
- `BARN_RECORDS_SERVICE_URL`: `http://cloud-barn-records-service:5131`

---

## Proxy Endpoints Implemented

### Feed Service Endpoints (13 endpoints)

#### KPI
- `GET /api/v1/kpi/feeding` → feed-service `/api/v1/kpi/feeding`

#### Feed Intake Records
- `POST /api/v1/feed/intake-records` → feed-service `/api/v1/feed/intake-records`
- `GET /api/v1/feed/intake-records` → feed-service `/api/v1/feed/intake-records`

#### Feed Lots
- `POST /api/v1/feed/lots` → feed-service `/api/v1/feed/lots`
- `GET /api/v1/feed/lots` → feed-service `/api/v1/feed/lots`

#### Feed Deliveries
- `POST /api/v1/feed/deliveries` → feed-service `/api/v1/feed/deliveries`
- `GET /api/v1/feed/deliveries` → feed-service `/api/v1/feed/deliveries`

#### Feed Quality Results
- `POST /api/v1/feed/quality-results` → feed-service `/api/v1/feed/quality-results`
- `GET /api/v1/feed/quality-results` → feed-service `/api/v1/feed/quality-results`

#### Feed Formulas
- `POST /api/v1/feed/formulas` → feed-service `/api/v1/feed/formulas`
- `GET /api/v1/feed/formulas` → feed-service `/api/v1/feed/formulas`

#### Feed Programs
- `POST /api/v1/feed/programs` → feed-service `/api/v1/feed/programs`
- `GET /api/v1/feed/programs` → feed-service `/api/v1/feed/programs`

### Barn Records Service Endpoints (9 endpoints)

- `POST /api/v1/barn-records/mortality` → barn-records-service `/api/v1/barn-records/mortality`
- `POST /api/v1/barn-records/morbidity` → barn-records-service `/api/v1/barn-records/morbidity`
- `POST /api/v1/barn-records/vaccines` → barn-records-service `/api/v1/barn-records/vaccines`
- `POST /api/v1/barn-records/treatments` → barn-records-service `/api/v1/barn-records/treatments`
- `POST /api/v1/barn-records/welfare-checks` → barn-records-service `/api/v1/barn-records/welfare-checks`
- `POST /api/v1/barn-records/housing-conditions` → barn-records-service `/api/v1/barn-records/housing-conditions`
- `POST /api/v1/barn-records/genetics` → barn-records-service `/api/v1/barn-records/genetics`
- `POST /api/v1/barn-records/daily-counts` → barn-records-service `/api/v1/barn-records/daily-counts`
- `GET /api/v1/barn-records/daily-counts` → barn-records-service `/api/v1/barn-records/daily-counts`

**Total**: 22 proxy endpoints

---

## Security & RBAC

- **JWT Auth**: All endpoints require `Authorization: Bearer <token>` header
- **Tenant Scoping**: `tenantId` enforced on all requests (from JWT or query/body)
- **RBAC Enforcement**: Downstream services enforce role-based access control
  - Feed endpoints: `tenant_admin`, `farm_manager` (POST), `viewer+` (GET)
  - Barn records endpoints: `tenant_admin`, `farm_manager`, `house_operator` (POST), `viewer+` (GET)
- **Idempotency**: `Idempotency-Key` header propagated to downstream services

---

## Error Handling

- **Standard Error Envelope**: All errors follow `docs/shared/01-api-standards.md`
- **Status Code Preservation**: Downstream status codes (400, 401, 403, 409, etc.) are preserved
- **502 Gateway Errors**: Downstream service unavailable mapped to `SERVICE_UNAVAILABLE`
- **TraceId Propagation**: All errors include `traceId` from request context

---

## Observability

- **Structured Logging**: All requests log:
  - `route`: BFF route path
  - `downstreamService`: Target service name
  - `duration_ms`: Request duration
  - `status_code`: HTTP status code
  - `requestId`: Request correlation ID

- **Header Propagation**:
  - `Authorization`: JWT token
  - `x-request-id`: Request correlation
  - `x-trace-id`: Trace correlation
  - `Idempotency-Key`: Idempotency header (POST requests)

---

## Verification Examples

### 1. GET /api/v1/kpi/feeding (Success)

```bash
curl -X GET "http://localhost:5125/api/v1/kpi/feeding?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "x-request-id: req-001"
```

**Expected Response (200)**:
```json
{
  "items": [
    {
      "recordDate": "2025-01-01",
      "fcr": 1.72,
      "adgG": 52.1,
      "sgrPct": 1.8
    }
  ]
}
```

**Expected Response (400 - Missing barnId)**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "barnId, startDate, and endDate are required",
    "traceId": "trace-001"
  }
}
```

### 2. POST /api/v1/feed/intake-records (Success with Idempotency-Key)

```bash
curl -X POST "http://localhost:5125/api/v1/feed/intake-records" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-fir-001" \
  -H "x-request-id: req-002" \
  -d '{
    "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
    "feedLotId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0006",
    "occurredAt": "2025-01-02T06:00:00Z",
    "quantityKg": 100.5,
    "source": "manual"
  }'
```

**Expected Response (201)**:
```json
{
  "id": "0190a1d1-1111-7d3f-b2e4-9e8b5f8e0011",
  "quantityKg": 100.5
}
```

**Expected Response (409 - Duplicate with same Idempotency-Key)**:
```json
{
  "id": "0190a1d1-1111-7d3f-b2e4-9e8b5f8e0011",
  "quantityKg": 100.5
}
```

### 3. GET /api/v1/barn-records/daily-counts (Success)

```bash
curl -X GET "http://localhost:5125/api/v1/barn-records/daily-counts?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004&start=2025-01-01&end=2025-01-31&limit=25" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "x-request-id: req-003"
```

**Expected Response (200)**:
```json
{
  "items": [
    {
      "id": "0190a1d1-3333-7d3f-b2e4-9e8b5f8e0013",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
      "recordDate": "2025-01-02",
      "animalCount": 990,
      "mortalityCount": 5,
      "cullCount": 2
    }
  ],
  "nextCursor": null
}
```

**Expected Response (400 - Missing tenantId)**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "tenantId is required",
    "traceId": "trace-003"
  }
}
```

**Expected Response (502 - Downstream Service Unavailable)**:
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Downstream service error",
    "traceId": "trace-003"
  }
}
```

---

## Non-Blocking TODOs

1. **Retry Policy**: Currently uses basic fetch (no retry). Consider adding:
   - Safe GET retries (idempotent) with exponential backoff
   - Timeout configuration per service

2. **Metrics Hooks**: If repo supports metrics (e.g., Datadog), add:
   - Downstream call duration metrics
   - Downstream error rate metrics
   - Request count by endpoint

3. **Rate Limiting**: Consider adding rate limiting per tenant/user (429 responses)

4. **Circuit Breaker**: Consider adding circuit breaker pattern for downstream services

5. **Request/Response Validation**: Currently proxies raw requests. Could add:
   - Request body validation in BFF (optional, downstream validates too)
   - Response schema validation

---

## Testing

1. **Start services**:
   ```bash
   # Start feed-service, barn-records-service, and BFF
   docker-compose up cloud-feed-service cloud-barn-records-service cloud-api-gateway-bff
   ```

2. **Verify health**:
   ```bash
   curl http://localhost:5125/api/health
   ```

3. **Test endpoints** using curl examples above

4. **Check logs** for structured logging output:
   ```
   {"level":"info","message":"Feed KPI request completed","route":"/api/v1/kpi/feeding","downstreamService":"feed-service","duration_ms":45,"status_code":200,"requestId":"req-001"}
   ```

---

## Implementation Complete ✅

All proxy endpoints are implemented and ready for use by dashboard-web. The BFF now serves as the single entry point for feed and barn-records features.

