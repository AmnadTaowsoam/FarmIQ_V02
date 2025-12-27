# Cloud LLM Insights Service Contract

## Purpose
Define the HTTP contract for `cloud-llm-insights-service`, which generates structured "insights" from analytics feature summaries.

## Scope
- Synchronous insight generation (MVP).
- Insight history and retrieval.
- Optional prompt template storage and retrieval.

## Non-goals
- Raw telemetry ingestion (forbidden; analytics sends feature summaries only).
- Asynchronous job queues (RabbitMQ not used for MVP).

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
- Service MUST enforce tenant isolation (request tenant must match auth scope/claims).

### RBAC (recommended)
- `POST /api/v1/llm-insights/analyze`: `viewer+` (read-only roles may request explanations), or `operator+` depending on org policy.
- History/read endpoints: `viewer+`.

### Idempotency (recommended)
- `POST /api/v1/llm-insights/analyze` SHOULD accept `Idempotency-Key` to prevent duplicate insight generation on retries.

---

## Endpoints

| method | path | auth scope/role | idempotency key usage | request schema summary | response schema summary | errors |
|---|---|---|---|---|---|---|
| GET | /api/health | public | n/a | none | 200 OK string | 500 |
| GET | /api/ready | internal | n/a | none | 200 OK string | 500 |
| GET | /api-docs | public | n/a | none | Swagger UI | 500 |
| GET | /api-docs/openapi.json | public | n/a | none | OpenAPI JSON | 500 |
| POST | /api/v1/llm-insights/analyze | viewer+ | optional (recommended) | feature summary + mode | insight payload | 400,401,403,409,422,500 |
| GET | /api/v1/llm-insights/history | viewer+ | n/a | filters + pagination | list of insights | 400,401,403 |
| GET | /api/v1/llm-insights/{insightId} | viewer+ | n/a | none | insight payload | 400,401,403,404 |
| GET | /api/v1/llm-insights/templates | tenant_admin (optional) | n/a | filters | list of templates | 400,401,403 |

---

## Request / Response Examples

### 1) POST /api/v1/llm-insights/analyze

**Request**
```http
POST /api/v1/llm-insights/analyze
Authorization: Bearer <jwt>
x-request-id: 2d1a2c8c-0d4c-4b15-b50a-8a0b3d9b6c3a
Idempotency-Key: idem-llm-001
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
  "features": {
    "kpis": [
      { "code": "FCR", "value": 1.62, "unit": "ratio", "delta24h": 0.05 }
    ],
    "anomalies": [
      {
        "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e1001",
        "code": "TEMP_SPIKE",
        "severity": "warning",
        "occurredAt": "2025-12-20T14:10:00Z",
        "evidence": {
          "metric": "temperature",
          "value": 33.4,
          "unit": "C",
          "baseline": 27.0
        }
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
    "context": {
      "species": "broiler",
      "ageDays": 18,
      "devicesOnline": 9
    }
  },
  "mode": "daily_report",
  "locale": "en-US"
}
```

**Response 200 OK**
```json
{
  "insightId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e2001",
  "generatedAt": "2025-12-21T00:00:05Z",
  "summary": "Feed conversion worsened slightly and a temperature spike likely contributed.",
  "notificationHint": {
    "shouldNotify": true,
    "severity": "warning",
    "title": "New insight available",
    "message": "An insight was generated for your selected barn and time window."
  },
  "keyFindings": [
    {
      "title": "FCR increased vs prior day",
      "detail": "FCR rose by +0.05 over 24h while weight gain remained stable.",
      "impact": "medium",
      "references": ["KPI:FCR"]
    }
  ],
  "likelyCauses": [
    {
      "cause": "Temperature spike reduced feed efficiency for part of the day.",
      "confidence": 0.72,
      "references": ["ANOM:0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e1001"]
    }
  ],
  "recommendedActions": [
    {
      "action": "Inspect ventilation settings and verify sensor placement for hotspot zones.",
      "priority": "P1",
      "owner": "operator",
      "expectedImpact": "Reduce temperature variance and stabilize FCR.",
      "references": ["ANOM:0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e1001"]
    }
  ],
  "confidence": 0.68,
  "references": [
    { "ref": "KPI:FCR", "payload": { "value": 1.62, "delta24h": 0.05 } }
  ],
  "modelMeta": {
    "provider": "openai",
    "model": "gpt-4.1-mini",
    "promptVersion": "v1"
  }
}
```

### 2) GET /api/v1/llm-insights/history

**Query Parameters**:
- `tenantId` (required)
- `farmId` (required)
- `barnId` (required)
- `startTime` (required, ISO8601)
- `endTime` (required, ISO8601)
- `page` (optional, default: 1)
- `limit` (optional, default: 25)

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

### 3) GET /api/v1/llm-insights/{insightId}

**Response 200 OK**: Same as analyze response (single insight object).

---

## Doc Change Summary (2025-12-27)

- Introduced a contract for `cloud-llm-insights-service` with synchronous insight generation and standard list/error shapes.

## Next Implementation Steps

1) Implement `cloud-llm-insights-service` (FastAPI) with persistence and audit (`llm_insight`, `llm_insight_run`).  
2) Add `POST /api/v1/analytics/insights/generate` in `cloud-analytics-service` and call this service with feature summaries only.  
3) Add BFF proxy endpoints for dashboard insights.  
4) Add `cloud-ml-model-service` (optional) if model hosting needs to be separated.  
