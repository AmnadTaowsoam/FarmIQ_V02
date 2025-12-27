Purpose: HTTP contract for `cloud-api-gateway-bff` (public dashboard ingress).  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

# cloud-api-gateway-bff контракт (MVP)

## Base

- Base path: `/api`
- Docs: `GET /api-docs`
- Health: `GET /api/health`
- Ready: `GET /api/ready`

## Auth / Tenant / Correlation

- Auth: `Authorization: Bearer <jwt>` (required in production)
- Tenant scope:
  - `tenantId` query param is required for notifications endpoints and forwarded as `x-tenant-id`.
  - Source: `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`
- Correlation headers:
  - FE should send: `x-request-id` (uuid)
  - BFF forwards `x-request-id` and `x-trace-id` downstream.

## Notifications (recommended public endpoints)

Routes:
- `GET /api/v1/notifications/inbox`
- `GET /api/v1/notifications/history`
- `POST /api/v1/notifications/send`

Aliases (dashboard namespace):
- `GET /api/v1/dashboard/notifications/inbox`
- `GET /api/v1/dashboard/notifications/history`
- `POST /api/v1/dashboard/notifications/send`

### GET /api/v1/notifications/inbox

Query:
- `tenantId` (required)
- `topic` (optional)
- `cursor` / `limit` (optional)

Response (BFF normalized list):
```json
{ "data": [], "meta": { "cursor": null, "limit": 25, "hasNext": false } }
```

### GET /api/v1/notifications/history

Query:
- `tenantId` (required)
- optional filters: `farmId`, `barnId`, `batchId`, `severity`, `channel`, `status`, `startDate`, `endDate`, `cursor`, `limit`

Response (BFF normalized list):
```json
{ "data": [], "meta": { "cursor": null, "limit": 25, "hasNext": false } }
```

### POST /api/v1/notifications/send

Query:
- `tenantId` (required)

Headers:
- `idempotency-key` (optional; forwarded to notification-service)

Body: passthrough to notification-service `POST /api/v1/notifications/send`.

## Error mapping (notifications)

- Pass through downstream status+body for: `400`, `401`, `403`, `409`, `422`
- For downstream network failure / timeout / 5xx: return `502` with standard error shape:
```json
{ "error": { "code": "SERVICE_UNAVAILABLE", "message": "Downstream service error", "traceId": "…" } }
```

Source of truth:
- `cloud-layer/cloud-api-gateway-bff/src/controllers/notificationController.ts`
- `cloud-layer/cloud-api-gateway-bff/src/services/notificationProxyService.ts`

