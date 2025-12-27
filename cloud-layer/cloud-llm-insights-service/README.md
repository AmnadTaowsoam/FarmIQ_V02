# FarmIQ Cloud LLM Insights Service

FastAPI service that generates and persists structured "insights" from analytics feature summaries.

## Required endpoints
- `GET /api/health`
- `GET /api/ready`
- `GET /api-docs`
- `POST /api/v1/llm-insights/analyze`
- `GET /api/v1/llm-insights/history`
- `GET /api/v1/llm-insights/{insightId}`

## Local (docker compose)
From `cloud-layer/`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build cloud-llm-insights-service
```

Seed:

```bash
docker compose -f docker-compose.dev.yml exec -T cloud-llm-insights-service sh -c "python -m app.seed"
```

## cURL examples

Analyze (mock provider):

```bash
curl -sS -X POST "http://localhost:5134/api/v1/llm-insights/analyze" \
  -H "Authorization: Bearer dev" \
  -H "x-request-id: 00000000-0000-4000-8000-000000000999" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId":"00000000-0000-4000-8000-000000000001",
    "scope":{"farmId":"00000000-0000-4000-8000-000000000101","barnId":"00000000-0000-4000-8000-000000001101","batchId":null},
    "window":{"startTime":"2025-12-20T00:00:00Z","endTime":"2025-12-21T00:00:00Z"},
    "features":{
      "kpis":[{"code":"FCR","value":1.62,"unit":"ratio","delta24h":0.05}],
      "anomalies":[{"id":"0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e1001","code":"TEMP_SPIKE","severity":"warning","occurredAt":"2025-12-20T14:10:00Z"}],
      "context":{"species":"broiler","ageDays":18,"devicesOnline":9}
    },
    "mode":"daily_report",
    "locale":"en-US"
  }'
```

History:

```bash
curl -sS "http://localhost:5134/api/v1/llm-insights/history?tenant_id=00000000-0000-4000-8000-000000000001&farm_id=00000000-0000-4000-8000-000000000101&barn_id=00000000-0000-4000-8000-000000001101&start_time=2025-12-19T00:00:00Z&end_time=2025-12-22T00:00:00Z&page=1&limit=25" \
  -H "Authorization: Bearer dev" \
  -H "x-request-id: 00000000-0000-4000-8000-000000000999"
```

