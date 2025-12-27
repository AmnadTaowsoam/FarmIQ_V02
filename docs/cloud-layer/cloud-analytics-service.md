Purpose: Service documentation for `cloud-analytics-service` (FastAPI).  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

# cloud-analytics-service

## Purpose

- Consume RabbitMQ events and materialize KPI/anomaly/forecast results.
- Provide read APIs for analytics outputs.
- Act as **insights orchestrator**: build feature summaries and call downstream LLM insights, then (best-effort) emit an in-app notification.

## Owned Data

- Postgres tables owned by analytics (see `cloud-layer/cloud-analytics-service/app/db.py`):
  - `analytics_results` (kpi/anomaly/forecast materialization)
  - `analytics_insight_ref` (minimal reference to LLM-owned insightId; owner remains LLM service)

## APIs

- Base path: `/api`
- Docs: `GET /api-docs` (OpenAPI at `GET /api-docs/openapi.json`)
- Health:
  - `GET /api/health`
  - `GET /api/ready` (DB + RabbitMQ; optional downstream health check)
- Analytics read:
  - `GET /api/v1/analytics/kpis`
  - `GET /api/v1/analytics/anomalies`
  - `GET /api/v1/analytics/forecasts`
- Insights orchestration:
  - `POST /api/v1/analytics/insights/generate`
  - `GET /api/v1/analytics/insights`
  - `GET /api/v1/analytics/insights/{insightId}`
- Routes: `cloud-layer/cloud-analytics-service/app/insights_routes.py`

Contract reference:
- `docs/contracts/cloud-analytics-service.contract.md`

## Downstream Calls (sync orchestration)

- LLM insights:
  - `POST {LLM_INSIGHTS_BASE_URL}/api/v1/llm-insights/analyze`
- Notifications (best-effort):
  - `POST {NOTIFICATION_SERVICE_URL}/api/v1/notifications/send`
- Optional ML fallback:
  - `POST {ML_MODEL_BASE_URL}/api/v1/ml/forecast` (feature-flagged)

## Notification Emission (best-effort)

- Trigger: after successful LLM insight generation with `insightId`.
- Dedupe:
  - `externalRef = INSIGHT:{insightId}`
  - `Idempotency-Key = INSIGHT:{tenant}:{farm}:{barn}:{start}:{end}:{mode}`
- Failure behavior: notification failures do **not** fail the insight response.
- Implementation: `cloud-layer/cloud-analytics-service/app/insights_routes.py`

## Env Vars

See `cloud-layer/cloud-analytics-service/env.example`.

Key vars:
- `DATABASE_URL`, `RABBITMQ_URL`
- `LLM_INSIGHTS_BASE_URL`
- `LLM_TIMEOUT_MS` (preferred) / `LLM_TIMEOUT_S` (compat)
- `LLM_MAX_RETRIES` (max 1, only on 502/503/504)
- `NOTIFICATION_SERVICE_URL`
- `NOTIFICATIONS_ENABLED`, `NOTIFICATIONS_TIMEOUT_MS`

## Failure Modes + Retries/Timeouts

- LLM call: guarded timeout (8–12s) + retry on 502/503/504 only.
- Notification call: best-effort, no retries.
- No external cache (no Redis); durable storage only.

## How to Run (local)

- Dev compose: `cloud-layer/docker-compose.dev.yml` service name `cloud-analytics-service` (host port `5124`).
- Swagger UI: `http://localhost:5124/api-docs`

## Verification (quick)

- Health: `curl http://localhost:5124/api/health`
- Ready: `curl http://localhost:5124/api/ready`
- Generate insight: see `docs/evidence/INSIGHTS_EVIDENCE.md`

Back to index: `docs/00-index.md`

