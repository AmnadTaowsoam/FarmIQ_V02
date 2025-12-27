# Insights → Notifications Audit (Release Readiness)

Repo: `D:\\FarmIQ\\FarmIQ_V02`  
Scope: Insight generation orchestration, notification emission, BFF proxy, and dashboard-web consumption.  
Last updated: 2025-12-27

---

## A) Component Inventory (Exact Paths)

### Analytics Orchestrator (insight generation + notification emission)

- Orchestrator endpoints:
  - `cloud-layer/cloud-analytics-service/app/insights_routes.py` (FastAPI router, includes `POST /api/v1/analytics/insights/generate`, `GET /api/v1/analytics/insights`, `GET /api/v1/analytics/insights/{insightId}`)
- Retry/timeout HTTP helper:
  - `cloud-layer/cloud-analytics-service/app/http_client.py`
- Service settings (LLM/ML/notifications envs):
  - `cloud-layer/cloud-analytics-service/app/config.py`
- Request context + duration logs:
  - `cloud-layer/cloud-analytics-service/app/main.py`

### LLM Insights Service (analyze/history/get)

- API routes:
  - `cloud-layer/cloud-llm-insights-service/app/routes.py` (`POST /api/v1/llm-insights/analyze`, `GET /api/v1/llm-insights/history`, `GET /api/v1/llm-insights/{insightId}`)
- Request context + duration logs:
  - `cloud-layer/cloud-llm-insights-service/app/main.py`
- Provider stub + timeout guard:
  - `cloud-layer/cloud-llm-insights-service/app/llm/provider.py`
- DB schema/IO:
  - `cloud-layer/cloud-llm-insights-service/app/db.py`

### Notification Service (`/send`, `/inbox`, `/history`)

- Routes + RBAC:
  - `cloud-layer/cloud-notification-service/src/routes/notificationRoutes.ts`
- Controllers (tenant resolution + handlers):
  - `cloud-layer/cloud-notification-service/src/controllers/notificationController.ts`
- Validation schemas:
  - `cloud-layer/cloud-notification-service/src/middlewares/validationMiddleware.ts`
- Idempotency/externalRef dedupe implementation:
  - `cloud-layer/cloud-notification-service/src/services/notificationService.ts`
- Correlation headers middleware:
  - `cloud-layer/cloud-notification-service/src/middlewares/transactionId.ts`

### BFF (notification proxy + dashboard alias routes)

- Generic notification proxy routes (`/api/v1/notifications/*`):
  - `cloud-layer/cloud-api-gateway-bff/src/routes/notificationRoutes.ts`
  - `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`
  - `cloud-layer/cloud-api-gateway-bff/src/services/notificationProxyService.ts`
- Dashboard alias routes (`/api/v1/dashboard/notifications/*`):
  - `cloud-layer/cloud-api-gateway-bff/src/routes/dashboardNotificationRoutes.ts`
  - `cloud-layer/cloud-api-gateway-bff/src/controllers/dashboardNotificationsController.ts`
- Auth/RBAC middleware:
  - `cloud-layer/cloud-api-gateway-bff/src/middlewares/authMiddleware.ts`
- Request id generation middleware (note: does not set response headers):
  - `cloud-layer/cloud-api-gateway-bff/src/middlewares/transactionId.ts`

### Dashboard Web (notification UI + API client/hooks)

- API client:
  - `apps/dashboard-web/src/api/notifications.ts`
  - `apps/dashboard-web/src/api/http.ts` (injects `x-request-id`, `x-tenant-id`, and `tenantId` query for GETs)
- Hooks (polling):
  - `apps/dashboard-web/src/hooks/useNotifications.ts`
- Notification bell:
  - `apps/dashboard-web/src/components/notifications/NotificationBell.tsx`
- Notifications page:
  - `apps/dashboard-web/src/features/notifications/pages/NotificationsPage.tsx`
- App routes:
  - `apps/dashboard-web/src/App.tsx` (route: `/notifications`)
- Implementation notes:
  - `apps/dashboard-web/NOTIFICATIONS_IMPLEMENTATION.md`

---

## B) DoD Completeness (End-to-End)

### 1) Insight generate → notification → FE display → deep link

Status: **PARTIAL**

- Insight generation backend exists:
  - `POST /api/v1/analytics/insights/generate` in `cloud-layer/cloud-analytics-service/app/insights_routes.py`
- Notification emission exists (best-effort from orchestrator):
  - `_best_effort_create_notification(...)` in `cloud-layer/cloud-analytics-service/app/insights_routes.py`
- FE notification UI exists and polls:
  - `apps/dashboard-web/src/components/notifications/NotificationBell.tsx`
  - `apps/dashboard-web/src/hooks/useNotifications.ts`
  - `apps/dashboard-web/src/features/notifications/pages/NotificationsPage.tsx`
- Deep link currently **does not resolve**:
  - Orchestrator emits `payload.link = "/dashboard/insights/{insightId}"` (see `_best_effort_create_notification`).
  - Dashboard routes do not include `/dashboard/insights/:id`. The existing AI insight UI is currently mock-only (`apps/dashboard-web/src/features/ai/pages/InsightsFeedPage.tsx`) and routes are under `/ai/...`.

### 2) BFF contract completeness for insights

Status: **FAIL (blocking for “FE calls only BFF”)**

- BFF has **no** insights proxy routes implemented:
  - No matches for insights routes in `cloud-layer/cloud-api-gateway-bff/src` (search `insights` yields none).
- Current viable backend call path is direct:
  - `cloud-analytics-service` on dev compose port `5124` (`cloud-layer/docker-compose.dev.yml`)

---

## C) Smoke / Curl Verification Commands (Dev Compose)

Assumes `docker compose -f cloud-layer/docker-compose.yml -f cloud-layer/docker-compose.dev.yml up -d` is running and you have a JWT for the right tenant/roles.

### 1) Generate insight (analytics orchestrator direct)

```bash
curl -sS -X POST "http://localhost:5124/api/v1/analytics/insights/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID" \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"'"$TENANT"'",
    "scope":{"farmId":"'"$FARM"'","barnId":"'"$BARN"'","batchId":null},
    "window":{"startTime":"'"$START"'","endTime":"'"$END"'"},
    "mode":"daily_report",
    "include":{"kpis":true,"anomalies":true,"forecasts":true,"insight":true}
  }'
```

Expected fields:
- `insight.insightId`
- `insight.notificationHint` (optional)

### 2) Verify notification was created (BFF inbox)

```bash
curl -sS "http://localhost:5125/api/v1/notifications/inbox?tenantId=$TENANT&limit=25" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID"
```

Expected fields (BFF normalized list):
- `data[]` list items (notification rows)
- `meta.cursor`, `meta.limit`, `meta.hasNext`
- One of the items should have `payload_json.link` and/or `externalRef` matching the insight run

### 3) Verify history (BFF history)

```bash
curl -sS "http://localhost:5125/api/v1/notifications/history?tenantId=$TENANT&channel=in_app&limit=25" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID"
```

Expected fields:
- `data[]` contains notification items
- For insight notifications: `external_ref` (or `externalRef` depending on serializer) should be `INSIGHT:{insightId}`

---

## D) Idempotency & Spam Prevention

### Orchestrator outbound request (PASS)

- Orchestrator sets:
  - `externalRef = "INSIGHT:{insightId}"` in body
  - `Idempotency-Key = "INSIGHT:{tenantId}:{farmId}:{barnId}:{start}:{end}:{mode}"` header
  - Source: `cloud-layer/cloud-analytics-service/app/insights_routes.py` (`_best_effort_create_notification`)

### Notification service duplicate behavior (PASS)

- Dedupe is enforced by:
  - `(tenantId, idempotencyKey)` unique lookup
  - `(tenantId, externalRef)` unique lookup
  - Source: `cloud-layer/cloud-notification-service/src/services/notificationService.ts` (`createNotification`)
- Duplicate response behavior:
  - Returns `200` with `x-idempotent-replay: true` (not `409`)
  - Source: `cloud-layer/cloud-notification-service/src/controllers/notificationController.ts` (`sendNotificationHandler`)

### BFF duplicate handling (PASS)

- BFF passes through downstream `409` if ever returned; however, notification-service currently returns `200` on duplicates.
  - Source: `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`

---

## E) Observability (Request IDs, Logs, Error Mapping)

### x-request-id / x-trace-id generation + propagation

- **cloud-analytics-service**: **PASS**
  - Generates IDs if missing, sets response headers, logs duration
  - `cloud-layer/cloud-analytics-service/app/main.py`
- **cloud-llm-insights-service**: **PASS**
  - Generates IDs if missing, sets response headers, logs duration
  - `cloud-layer/cloud-llm-insights-service/app/main.py`
- **cloud-notification-service**: **PASS**
  - Generates IDs if missing, sets response headers and `res.locals.requestId/traceId`
  - `cloud-layer/cloud-notification-service/src/middlewares/transactionId.ts`
- **cloud-api-gateway-bff**: **FAIL**
  - Generates a request id in `req.id`, but does **not** set `res.locals.requestId/traceId` nor response headers.
  - Many controllers reference `res.locals.traceId` which is never set (returns `"unknown"`).
  - Files:
    - `cloud-layer/cloud-api-gateway-bff/src/middlewares/transactionId.ts`
    - `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`

### Downstream latency logging

Status: **FAIL (hardening)**

- `cloud-analytics-service` does not currently log downstream call latency (LLM/ML/notification) as separate spans/metrics; only overall request duration is logged.
  - `cloud-layer/cloud-analytics-service/app/insights_routes.py`
- BFF does not log per-downstream duration for notification proxy calls.
  - `cloud-layer/cloud-api-gateway-bff/src/services/notificationProxyService.ts`

### Error mapping correctness (MUST FIX)

- BFF notification proxy does not passthrough downstream `400 VALIDATION_ERROR` bodies (notification-service uses `400` for Zod validation).
  - Current passthrough statuses are `401/403/409/422` only.
  - File: `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`

---

## F) LLM Guardrails (Timeout/Retry/Token Budget/Safe JSON)

### Orchestrator → LLM call (PASS)

- Timeout: `LLM_TIMEOUT_S` default `10` seconds
  - `cloud-layer/cloud-analytics-service/app/config.py`
- Retry: `LLM_MAX_RETRIES` default `1`, only on `502/503/504` and transport/timeouts
  - `cloud-layer/cloud-analytics-service/app/insights_routes.py`
  - `cloud-layer/cloud-analytics-service/app/http_client.py`

### LLM Insights service provider guardrails (PARTIAL)

- Timeout enforced at provider call boundary:
  - `cloud-layer/cloud-llm-insights-service/app/llm/provider.py` (`asyncio.wait_for`)
- Token budget:
  - `LLM_MAX_TOKENS` exists in config but is not currently enforced by `MockProvider` (and no real provider implementation exists in MVP).
  - `cloud-layer/cloud-llm-insights-service/app/config.py`
  - `cloud-layer/cloud-llm-insights-service/app/llm/provider.py`
- Safe JSON parsing:
  - Not applicable to mock provider; **no** hardened parsing/validation for a real LLM provider is present in MVP.

---

## G) FE Polling / UX Stability

Status: **PARTIAL**

- Polling interval:
  - Inbox: `refetchInterval: 60000` (60s) in `apps/dashboard-web/src/hooks/useNotifications.ts` ✅
- Pause when tab hidden:
  - `useUnreadCount` sets `refetchIntervalInBackground: false` ✅
  - `useNotificationsInbox` does not set `refetchIntervalInBackground`; behavior depends on React Query defaults ⚠️
- Manual refresh:
  - Notifications page has a `Refresh` button which calls `refetch()` ✅
  - `apps/dashboard-web/src/features/notifications/pages/NotificationsPage.tsx`
- Stable loading/empty/error states:
  - Bell and page both render explicit loading/error/empty states ✅

### FE ↔ BFF contract mismatch (MUST FIX)

- FE expects response shapes:
  - Inbox: `{ data, total, unread_count, cursor? }`
  - History: `{ data, total, cursor? }`
  - `apps/dashboard-web/src/api/notifications.ts`
- BFF currently returns normalized `{ data, meta: { cursor, limit, hasNext } }` (no `total` / `unread_count`).
  - `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`

---

## H) Smoke Scripts

Status: **PARTIAL**

Existing related scripts:
- `cloud-layer/scripts/verify-compose.ps1`
- `cloud-layer/scripts/verify-compose.sh`
- `cloud-layer/scripts/verify-dashboard-pages.ps1`

Missing (recommended):
- `scripts/smoke-insights.ps1` (generate insight + verify response)
- `scripts/smoke-notifications.ps1` (send notification + verify inbox/history)

---

## I) Retention Notes

Status: **NOT DEFINED**

- Notifications:
  - Stored durably in Postgres (`notifications`, `notification_targets`, `notification_delivery_attempts`).
  - No TTL/archival job is implemented or documented in this repo.
  - Service code: `cloud-layer/cloud-notification-service/src/services/notificationService.ts`
- Insights:
  - Stored durably in Postgres by `cloud-llm-insights-service` (`llm_insight`, `llm_insight_run`).
  - No TTL/archival job is implemented or documented.
  - Service code: `cloud-layer/cloud-llm-insights-service/app/db.py`

---

## Findings

### MUST FIX (blocking for demo)

1) **Deep link mismatch**: orchestrator emits `/dashboard/insights/{insightId}`, but FE has no matching route.
   - Code: `cloud-layer/cloud-analytics-service/app/insights_routes.py`
   - FE routes: `apps/dashboard-web/src/App.tsx`, `apps/dashboard-web/src/config/routes.tsx`
   - Suggested patch: change link to an existing route (e.g. `/ai/insights-feed`) or implement an insight detail route and update notification payload accordingly.

2) **FE ↔ BFF contract mismatch for notifications list responses** (unread_count/total vs meta).
   - FE expects: `apps/dashboard-web/src/api/notifications.ts`
   - BFF returns: `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`
   - Suggested patch: either (A) update FE to use `{data,meta}` or (B) adjust BFF to return `{data,total,unread_count,cursor}` (and implement unread_count semantics, or document it as Phase 2 and remove unread usage from FE UI).

3) **BFF error passthrough bug**: does not passthrough downstream `400 VALIDATION_ERROR` bodies from notification-service.
   - BFF: `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`
   - Notification-service validation returns 400: `cloud-layer/cloud-notification-service/src/middlewares/validationMiddleware.ts`
   - Suggested patch: passthrough `400` in addition to `401/403/409/422`.

4) **“FE calls only BFF” not met for insights**: BFF has no insights proxy routes.
   - BFF: `cloud-layer/cloud-api-gateway-bff/src/routes` (no insights routes)
   - Suggested patch: add BFF routes `POST/GET /api/v1/dashboard/insights/*` proxying to analytics orchestrator, then update FE to use them.

### SHOULD FIX (prod hardening)

1) **BFF correlation headers in responses**: BFF doesn’t set response `x-request-id`/`x-trace-id`, and `res.locals.traceId` is not consistently populated.
   - BFF: `cloud-layer/cloud-api-gateway-bff/src/middlewares/transactionId.ts`
   - Suggested patch: mirror notification-service approach: set `res.locals.requestId/traceId` + response headers.

2) **Downstream latency logs**: no explicit timing logs for LLM/notification calls in orchestrator and BFF.
   - Analytics: `cloud-layer/cloud-analytics-service/app/insights_routes.py`
   - BFF: `cloud-layer/cloud-api-gateway-bff/src/services/notificationProxyService.ts`
   - Suggested patch: wrap outbound calls and log `{downstream, statusCode, duration_ms}` with requestId/traceId.

3) **Explicit “pause polling when hidden”**: inbox polling relies on defaults.
   - FE hook: `apps/dashboard-web/src/hooks/useNotifications.ts`
   - Suggested patch: set `refetchIntervalInBackground: false` for inbox/history queries.

### NICE TO HAVE

1) **Smoke scripts**: add one-command scripts to generate insight and confirm notification.
   - Suggested new files: `scripts/smoke-insights.ps1`, `scripts/smoke-notifications.ps1`

2) **Retention policy**: document or implement TTL/archival for notifications and insights tables.
   - Suggested docs: add retention section to `docs/shared/00-api-catalog.md` or service progress docs.

