# Cloud ML Model Service Contract (Optional)

## Purpose
Define the HTTP contract for `cloud-ml-model-service`, which hosts/version ML models (regression, time-series, forecasting) and serves predictions/forecasts.

## Scope
- Synchronous prediction/forecast APIs (MVP).
- Ops endpoints to list available models/versions.

## Non-goals
- Training pipelines (out of scope for MVP).
- In-memory caches/sessions (forbidden; durable storage only).

## Standards
- All endpoints follow `../shared/01-api-standards.md`.
- Base path: `/api`
- Health/docs: `GET /api/health`, `GET /api/ready` (recommended), `GET /api-docs`, `GET /api-docs/openapi.json`
- Error envelope: `{"error":{"code":"...","message":"...","traceId":"..."}}`
- Correlation: propagate `x-request-id` end-to-end.

---

## Authentication, Tenant Scope, RBAC

### Required headers (all endpoints)
- `Authorization: Bearer <jwt>`
- `x-request-id: <uuid>`

### Tenant scope
- Tenant is identified by `tenantId` (request body for POST, query params for GET list).
- Service MUST enforce tenant isolation and RBAC for model access.

### Idempotency (optional)
- `POST /api/v1/ml/predict` and `POST /api/v1/ml/forecast` MAY accept `Idempotency-Key` for safe retries (recommended if logs are persisted).

---

## Endpoints

| method | path | auth scope/role | idempotency key usage | request schema summary | response schema summary | errors |
|---|---|---|---|---|---|---|
| GET | /api/health | public | n/a | none | 200 OK string | 500 |
| GET | /api/ready | internal | n/a | none | 200 OK string | 500 |
| GET | /api-docs | public | n/a | none | Swagger UI | 500 |
| GET | /api-docs/openapi.json | public | n/a | none | OpenAPI JSON | 500 |
| POST | /api/v1/ml/predict | viewer+ | optional | modelKey + inputs | prediction output | 400,401,403,404,422,500 |
| POST | /api/v1/ml/forecast | viewer+ | optional | modelKey + series | forecast series | 400,401,403,404,422,500 |
| GET | /api/v1/ml/models | viewer+ | n/a | filters + pagination | list of models | 400,401,403 |
| GET | /api/v1/ml/models/{modelKey} | viewer+ | n/a | none | model details | 400,401,403,404 |

---

## Request / Response Examples

### 1) POST /api/v1/ml/predict

**Request**
```http
POST /api/v1/ml/predict
Authorization: Bearer <jwt>
x-request-id: 7d38e00a-56c9-4a2b-9f78-3db7b47e6a0a
Content-Type: application/json
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "modelKey": "WEIGHT_REGRESSION_V1",
  "inputs": {
    "ageDays": 18,
    "avgTempC": 27.2,
    "avgHumidityPct": 61.0,
    "feedIntakeKg": 1200.5
  },
  "context": {
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005"
  }
}
```

**Response 200 OK**
```json
{
  "predictionId": "0190a1d1-cccc-7d3f-b2e4-9e8b5f8e3001",
  "modelKey": "WEIGHT_REGRESSION_V1",
  "modelVersion": "2025-12-01",
  "outputs": {
    "predictedWeightKg": 1.23
  },
  "generatedAt": "2025-12-21T00:00:02Z",
  "confidence": 0.74
}
```

### 2) POST /api/v1/ml/forecast

**Request**
```http
POST /api/v1/ml/forecast
Authorization: Bearer <jwt>
x-request-id: 51b17b5e-c7c3-4c54-9c43-e8b1b8d5ff1f
Content-Type: application/json
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "modelKey": "WEIGHT_TIMESERIES_V1",
  "series": [
    { "t": "2025-12-20T00:00:00Z", "y": 1.05 },
    { "t": "2025-12-20T12:00:00Z", "y": 1.12 },
    { "t": "2025-12-21T00:00:00Z", "y": 1.18 }
  ],
  "horizonDays": 7,
  "context": {
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batchId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005"
  }
}
```

**Response 200 OK**
```json
{
  "forecastId": "0190a1d1-dddd-7d3f-b2e4-9e8b5f8e3002",
  "series": [
    { "t": "2025-12-22T00:00:00Z", "yhat": 1.25, "yhatLower": 1.18, "yhatUpper": 1.32 }
  ],
  "modelMeta": {
    "modelKey": "WEIGHT_TIMESERIES_V1",
    "modelVersion": "2025-12-01"
  },
  "generatedAt": "2025-12-21T00:00:02Z"
}
```

### 3) GET /api/v1/ml/models

**Response 200 OK** (standard list shape)
```json
{
  "data": [
    {
      "modelKey": "WEIGHT_REGRESSION_V1",
      "latestVersion": "2025-12-01",
      "type": "regression",
      "status": "active"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "hasNext": false
  }
}
```

---

## Doc Change Summary (2025-12-27)

- Added an (optional) contract for `cloud-ml-model-service` to lock prediction/forecast interfaces early.

## Next Implementation Steps

1) Implement `cloud-llm-insights-service`.  
2) Add analytics orchestrator endpoints and integrate downstream calls.  
3) Add BFF proxy endpoints for dashboard insights.  
4) Implement `cloud-ml-model-service` if forecasts/predictions should be externalized.  

