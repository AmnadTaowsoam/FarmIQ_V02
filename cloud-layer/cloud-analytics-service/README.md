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

