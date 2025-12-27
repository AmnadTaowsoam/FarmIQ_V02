Purpose: Cloud-layer runbooks (health, readiness, logs, and demo support).  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27  

---

# Cloud Runbooks

## Health and readiness

All services should expose:
- `GET /api/health`
- `GET /api/ready` (recommended)
- `GET /api-docs`

Quick checks (dev compose ports):
```bash
curl -sS http://localhost:5125/api/health   # cloud-api-gateway-bff
curl -sS http://localhost:5124/api/health   # cloud-analytics-service
curl -sS http://localhost:5134/api/health   # cloud-llm-insights-service
curl -sS http://localhost:5128/api/health   # cloud-notification-service
```

## Correlation headers

Expected end-to-end:
- Incoming: `x-request-id` from clients (FE)
- Propagate: `x-request-id` and `x-trace-id` to downstream calls
- Error bodies include `traceId`

Standards reference: `docs/shared/01-api-standards.md`

## Notifications (ops)

- Evidence: `docs/evidence/NOTIFICATIONS_EVIDENCE.md`
- Common failures:
  - 401/403: role missing (`tenant_admin`, `farm_manager`, etc.)
  - 400: payload validation (zod)
  - 503 ready: DB/Rabbit not healthy

## Insights (ops)

- Evidence: `docs/evidence/INSIGHTS_EVIDENCE.md`
- Guardrails:
  - LLM timeout in analytics is clamped (8–12s) via `LLM_TIMEOUT_MS`/`LLM_TIMEOUT_S`
  - LLM retries max 1 on 502/503/504

## Logs to watch

- BFF: request failures and downstream 502 mapping (service unavailable)
- Analytics: `Insights generate completed` log with `llm_latency_ms`, `noti_latency_ms`, `ml_latency_ms`
- Notification service: readiness failures (DB/Rabbit)

Back to index: `docs/00-index.md`

