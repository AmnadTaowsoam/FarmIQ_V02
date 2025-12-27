# cloud-analytics-service (Python/FastAPI)

FarmIQ cloud analytics consumer + query API.

## Responsibilities (MVP)

- Consume RabbitMQ events and persist computed analytics:
  - `telemetry.ingested`
  - `telemetry.aggregated`
  - `weighvision.session.finalized`
  - `inference.completed`
- Compute simple KPIs/anomalies/forecasts (rule-based MVP).
- Expose query endpoints for BFF:
  - `GET /api/v1/analytics/kpis`
  - `GET /api/v1/analytics/anomalies`
  - `GET /api/v1/analytics/forecasts`
- Orchestrate synchronous insights generation (calls LLM insights service):
  - `POST /api/v1/analytics/insights/generate`
  - `GET /api/v1/analytics/insights`
  - `GET /api/v1/analytics/insights/{insightId}`
- Ops endpoints:
  - `GET /api/health` (+ alias `GET /health`)
  - `GET /api/ready`
  - `GET /api-docs` (+ `GET /api-docs/openapi.json`)

## Local dev (without Docker)

```powershell
cd cloud-layer/cloud-analytics-service
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment

See `env.example`.

## cURL examples (insights orchestrator)

```bash
curl -sS -X POST "http://localhost:5124/api/v1/analytics/insights/generate" \
  -H "Authorization: Bearer dev" \
  -H "x-request-id: 00000000-0000-4000-8000-000000000999" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId":"00000000-0000-4000-8000-000000000001",
    "scope":{"farmId":"00000000-0000-4000-8000-000000000101","barnId":"00000000-0000-4000-8000-000000001101","batchId":null},
    "window":{"startTime":"2025-12-20T00:00:00Z","endTime":"2025-12-21T00:00:00Z"},
    "mode":"daily_report",
    "include":{"kpis":true,"anomalies":true,"forecasts":true,"insight":true}
  }'
```

```bash
curl -sS "http://localhost:5124/api/v1/analytics/insights?tenantId=00000000-0000-4000-8000-000000000001&farmId=00000000-0000-4000-8000-000000000101&barnId=00000000-0000-4000-8000-000000001101&startTime=2025-12-19T00:00:00Z&endTime=2025-12-22T00:00:00Z&page=1&limit=25" \
  -H "Authorization: Bearer dev" \
  -H "x-request-id: 00000000-0000-4000-8000-000000000999"
```

