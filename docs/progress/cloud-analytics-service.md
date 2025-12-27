Purpose: Progress report and evidence checklist for `cloud-analytics-service`.  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-19  

---

# cloud-analytics-service — Progress Report

## Scope implemented (MVP)

- FastAPI service on container port `8000` (host `5124` in `cloud-layer/docker-compose.yml`).
- Standard endpoints:
  - `GET /api/health` (and alias `GET /health`)
  - `GET /api/ready` (DB + RabbitMQ connectivity)
  - `GET /api-docs` (Swagger UI) + `GET /api-docs/openapi.json`
- Consumes RabbitMQ events (durable queue) and writes computed analytics to Postgres:
  - `telemetry.ingested`, `telemetry.aggregated`
  - `weighvision.session.finalized`
  - `inference.completed`
- Persists:
  - `analytics_event_dedupe` (idempotency key: `(tenant_id,event_id)`)
  - `analytics_results` (KPIs/anomalies/forecasts)
  - `analytics_session_state` (tracks inference per session for delta anomaly)
- Query APIs:
  - `GET /api/v1/analytics/kpis?tenantId=...`
  - `GET /api/v1/analytics/anomalies?tenantId=...`
  - `GET /api/v1/analytics/forecasts?tenantId=...`

- Insights orchestration (sync, MVP):
  - `POST /api/v1/analytics/insights/generate` (feature summary → LLM insights)
  - Best-effort notification emission to `cloud-notification-service` after successful insight generation (does not fail the main response)

## Environment variables

See `cloud-layer/cloud-analytics-service/env.example`.

Key vars:
- `DATABASE_URL`
- `RABBITMQ_URL`
- `RABBITMQ_QUEUE_NAME` (default `farmiq.cloud-analytics-service.kpi.queue`)
- `CONSUMER_ENABLED` (true/false)

## Evidence steps (docker-compose)

```powershell
# Build and start service
cd cloud-layer
docker compose build cloud-analytics-service
docker compose up -d cloud-analytics-service

# Health checks
curl http://localhost:5124/api/health
curl http://localhost:5124/api/ready

# API documentation
curl http://localhost:5124/api-docs

# Query endpoints (example)
curl "http://localhost:5124/api/v1/analytics/kpis?tenantId=tenant-123"
curl "http://localhost:5124/api/v1/analytics/anomalies?tenantId=tenant-123"
curl "http://localhost:5124/api/v1/analytics/forecasts?tenantId=tenant-123"

# Insight generation (creates a best-effort in-app notification)
curl -X POST "http://localhost:5124/api/v1/analytics/insights/generate" `
  -H "Authorization: Bearer $token" `
  -H "x-request-id: $(New-Guid)" `
  -H "content-type: application/json" `
  -d '{
    "tenantId":"tenant-123",
    "scope":{"farmId":"farm-1","barnId":"barn-1","batchId":null},
    "window":{"startTime":"2025-12-20T00:00:00Z","endTime":"2025-12-21T00:00:00Z"},
    "mode":"daily_report",
    "include":{"kpis":true,"anomalies":true,"forecasts":true,"insight":true}
  }'
```

## Tests

Run unit tests:
```powershell
cd cloud-layer/cloud-analytics-service
pytest tests/
```

Test coverage includes:
- `test_telemetry_ingested_produces_kpi_and_forecast` - Verifies telemetry events produce KPI and forecast results
- `test_inference_completed_updates_session_state` - Verifies inference events update session state

## Notes on RabbitMQ bindings

Queue binds to exchanges/routing keys per `docs/03-messaging-rabbitmq.md`:
- `farmiq.telemetry.exchange`: `telemetry.ingested`, `telemetry.aggregated`
- `farmiq.weighvision.exchange`: `weighvision.session.finalized`, `inference.completed`

