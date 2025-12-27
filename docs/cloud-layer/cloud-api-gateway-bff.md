Purpose: Service documentation for `cloud-api-gateway-bff` (Node/Express).  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

# cloud-api-gateway-bff

## Purpose

Public gateway + BFF for `dashboard-web`. It proxies/aggregates downstream services and enforces auth + tenant scoping for dashboard features.

## Owned Data

None (aggregation/proxy layer).

## APIs

- Base path: `/api`
- Docs: `GET /api-docs`
- Health:
  - `GET /api/health`
  - `GET /api/ready`
- Dashboard endpoints (examples):
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/alerts`
- Notifications (recommended; normalized list shape):
  - `GET /api/v1/notifications/inbox`
  - `GET /api/v1/notifications/history`
  - `POST /api/v1/notifications/send`
- Notifications aliases (dashboard namespace):
  - `GET /api/v1/dashboard/notifications/inbox`
  - `GET /api/v1/dashboard/notifications/history`
  - `POST /api/v1/dashboard/notifications/send`

Contract references:
- `docs/contracts/cloud-api-gateway-bff.contract.md`
- Dashboard contract pack: `docs/cloud-layer/dashboard/04-bff-api-contracts.md`

## Downstream Mapping (notifications)

- Proxies to `cloud-notification-service`:
  - `GET /api/v1/notifications/inbox`
  - `GET /api/v1/notifications/history`
  - `POST /api/v1/notifications/send`
- Implements strict RBAC mirroring notification-service.

Implementation files:
- Generic: `cloud-layer/cloud-api-gateway-bff/src/routes/notificationRoutes.ts`
- Dashboard alias: `cloud-layer/cloud-api-gateway-bff/src/routes/dashboardNotificationRoutes.ts`

## Env Vars

See `cloud-layer/cloud-api-gateway-bff/.env.example`.

Key vars:
- `APP_PORT`
- `NOTIFICATION_SERVICE_URL` / `CLOUD_NOTIFICATION_SERVICE_URL` (downstream base URL)
- `NOTIFICATION_TIMEOUT_MS`

## How to Run (local)

- Dev compose: `cloud-layer/docker-compose.dev.yml` service name `cloud-api-gateway-bff` (host port `5125`).
- Swagger UI: `http://localhost:5125/api-docs`

Back to index: `docs/00-index.md`

