# Cloud Analytics Service Contract

## Purpose
Define the HTTP contract for `cloud-analytics-service` analytics query endpoints and the "insights generation" orchestrator endpoints.

## Scope
- Query endpoints: KPIs, anomalies, forecasts.
- Orchestrator endpoints: generate combined analytics + insight response and optionally persist history.

## Non-goals
- Edge ingress (owned by `cloud-ingestion` only).
- Raw telemetry storage/query (owned by `cloud-telemetry-service`).

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
- Tenant is identified by `tenantId` (query params for GET, request body for POST).
- Service MUST enforce tenant isolation and RBAC per endpoint.

---

## Endpoints

| method | path | auth scope/role | idempotency key usage | request schema summary | response schema summary | errors |
|---|---|---|---|---|---|---|
| GET | /api/health | public | n/a | none | 200 OK string | 500 |
| GET | /api/ready | internal | n/a | none | 200 OK string | 500 |
| GET | /api-docs | public | n/a | none | Swagger UI | 500 |
| GET | /api-docs/openapi.json | public | n/a | none | OpenAPI JSON | 500 |
| GET | /api/v1/analytics/kpis | viewer+ | n/a | filters + date range | KPI list/series | 400,401,403 |
| GET | /api/v1/analytics/anomalies | viewer+ | n/a | filters + date range | anomaly list | 400,401,403 |
| GET | /api/v1/analytics/forecasts | viewer+ | n/a | filters + date range | forecast list/series | 400,401,403 |
| POST | /api/v1/analytics/insights/generate | viewer+ | optional (recommended) | scope + window + include + mode | combined response + insight | 400,401,403,409,422,500 |
| GET | /api/v1/analytics/insights | viewer+ | n/a | filters + pagination | list of generated insights | 400,401,403 |
| GET | /api/v1/analytics/insights/{insightId} | viewer+ | n/a | none | combined response + insight | 400,401,403,404 |

---

## Orchestration Notes

- `POST /api/v1/analytics/insights/generate` aggregates analytics features (KPIs/anomalies/forecasts) for a given scope/window.
- It then calls `cloud-llm-insights-service` with **feature summaries only** (no raw telemetry payloads).
- It may optionally call `cloud-ml-model-service` for prediction/forecast if not computed internally.
- Caller for dashboard use cases is `cloud-api-gateway-bff`; `dashboard-web` does not call analytics directly.

---

## Request / Response Examples

### POST /api/v1/analytics/insights/generate

**Request**
```http
POST /api/v1/analytics/insights/generate
Authorization: Bearer <jwt>
x-request-id: 1b1b2d71-5f82-4e88-9c37-2f7b02db1f30
Idempotency-Key: idem-analytics-insight-001
Content-Type: application/json
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "scope": {
    "farmId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
    "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
    "batchId": null
  },
  "window": {
    "startTime": "2025-12-20T00:00:00Z",
    "endTime": "2025-12-21T00:00:00Z"
  },
  "mode": "daily_report",
  "include": {
    "kpis": true,
    "anomalies": true,
    "forecasts": true,
    "insight": true
  }
}
```

**Response 200 OK**
```json
{
  "kpis": [
    { "code": "FCR", "value": 1.62, "unit": "ratio", "delta24h": 0.05 }
  ],
  "anomalies": [
    {
      "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e1001",
      "code": "TEMP_SPIKE",
      "severity": "warning",
      "occurredAt": "2025-12-20T14:10:00Z"
    }
  ],
  "forecasts": [
    {
      "code": "WEIGHT_7D",
      "horizonDays": 7,
      "series": [
        { "t": "2025-12-21T00:00:00Z", "yhat": 1.23, "yhatLower": 1.10, "yhatUpper": 1.35 }
      ]
    }
  ],
  "insight": {
    "insightId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e2001",
    "generatedAt": "2025-12-21T00:00:05Z",
    "summary": "Feed conversion worsened slightly and a temperature spike likely contributed.",
    "notificationHint": {
      "shouldNotify": true,
      "severity": "warning",
      "title": "New insight available",
      "message": "An insight was generated for your selected barn and time window."
    },
    "keyFindings": [],
    "likelyCauses": [],
    "recommendedActions": [],
    "confidence": 0.68,
    "references": [],
    "modelMeta": { "provider": "openai", "model": "gpt-4.1-mini", "promptVersion": "v1" }
  },
  "meta": {
    "generatedAt": "2025-12-21T00:00:05Z",
    "traceId": "trace-id-123"
  }
}
```

### GET /api/v1/analytics/insights

**Response 200 OK** (standard list shape)
```json
{
  "data": [
    {
      "insightId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e2001",
      "generatedAt": "2025-12-21T00:00:05Z",
      "summary": "Feed conversion worsened slightly and a temperature spike likely contributed.",
      "confidence": 0.68
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 120,
    "hasNext": true
  }
}
```

---

## Doc Change Summary (2025-12-27)

- Added an explicit contract for `cloud-analytics-service` orchestrator endpoints that aggregate analytics features and call `cloud-llm-insights-service`.

## Next Implementation Steps

1) Implement `cloud-llm-insights-service`.  
2) Implement analytics orchestrator endpoints and downstream calls with `x-request-id` propagation.  
3) Add BFF proxy endpoints and update the shared BFF OpenAPI if/when enabled.  
4) Implement `cloud-ml-model-service` (optional).  
