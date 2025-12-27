Purpose: Service documentation for `cloud-llm-insights-service` (FastAPI).  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

# cloud-llm-insights-service

## Purpose

Generate structured “insights” from **analytics feature summaries** (KPIs/anomalies/forecasts/context). This service does **not** ingest raw telemetry.

## Owned Data

- Postgres tables (owned by this service):
  - `llm_insight`
  - `llm_insight_run`
- Implementation: `cloud-layer/cloud-llm-insights-service/app/db.py`

## APIs

- Base path: `/api`
- Docs: `GET /api-docs` (OpenAPI at `GET /api-docs/openapi.json`)
- Health:
  - `GET /api/health`
  - `GET /api/ready` (DB connectivity)
- Business:
  - `POST /api/v1/llm-insights/analyze`
  - `GET /api/v1/llm-insights/history`
  - `GET /api/v1/llm-insights/{insightId}`
- Routes: `cloud-layer/cloud-llm-insights-service/app/routes.py`

Contract reference:
- `docs/contracts/cloud-llm-insights-service.contract.md`

## Auth / Tenant Scope

- Requires `Authorization: Bearer <jwt>` (enforced in `cloud-layer/cloud-llm-insights-service/app/deps.py`).
- Tenant scope is enforced from request payload/query (`tenantId` / `tenant_id` fields), with service-side logging context via `tenant_id_ctx`.

## Guardrails (MVP)

- Provider: **mock only** for MVP (`LLM_PROVIDER=mock`)
  - `cloud-layer/cloud-llm-insights-service/app/llm/provider.py`
- Timeout: enforced with `asyncio.wait_for(...)` using `LLM_TIMEOUT_S`
- Token budget: `LLM_MAX_TOKENS` is configured but not enforced by mock provider

## Env Vars

See `cloud-layer/cloud-llm-insights-service/env.example`.

Key vars:
- `DATABASE_URL` (required)
- `LLM_PROVIDER` (default `mock`)
- `LLM_TIMEOUT_S` (default `10`)
- `LLM_MAX_TOKENS` (default `1024`)
- `LLM_MODEL` (default `gpt-4.1-mini`)
- `PROMPT_VERSION` (default `v1`)

## Failure Modes + Retries

- No internal retries for the mock provider.
- Downstream callers should enforce retries/timeouts (see analytics orchestrator).

## How to Run (local)

- Dev compose: `cloud-layer/docker-compose.dev.yml` service name `cloud-llm-insights-service` (host port `5134`).
- Swagger UI: `http://localhost:5134/api-docs`

## Verification (quick)

1) `curl http://localhost:5134/api/health`
2) `curl http://localhost:5134/api/ready`
3) Call analyze (requires JWT):
   - `POST http://localhost:5134/api/v1/llm-insights/analyze`

## Next

- Add real provider integration with safe JSON parsing + max token enforcement.
- Add prompt template storage/versioning (optional).

Back to index: `docs/00-index.md`

