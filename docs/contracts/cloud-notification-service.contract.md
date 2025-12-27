Purpose: HTTP contract for `cloud-notification-service` (authoritative to code).  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

# cloud-notification-service контракт (MVP)

## Base

- Base path: `/api`
- Docs: `GET /api-docs`
- Health: `GET /api/health`
- Ready: `GET /api/ready`

## Auth / Tenant / Correlation

- Auth: `Authorization: Bearer <jwt>` (required)
- Correlation headers:
  - `x-request-id` (recommended; generated if missing)
  - `x-trace-id` (recommended; generated if missing)
- Tenant scope resolution (as implemented):
  - JWT claim `tenant_id` (preferred)
  - fallback: `x-tenant-id` header
  - fallback: `tenantId` in query/body (dev)
  - Source: `cloud-layer/cloud-notification-service/src/controllers/notificationController.ts`

## RBAC (as implemented)

- `POST /api/v1/notifications/send`: `tenant_admin`, `farm_manager`
- `GET /api/v1/notifications/history`: `tenant_admin`, `farm_manager`, `house_operator`, `viewer`
- `GET /api/v1/notifications/inbox`: `tenant_admin`, `farm_manager`, `house_operator`, `viewer`
- Source: `cloud-layer/cloud-notification-service/src/routes/notificationRoutes.ts`

## Endpoints

### POST /api/v1/notifications/send

Create a notification (in-app or queued for other channels).

Headers:
- `Idempotency-Key` (optional): used for dedupe (stored as `idempotencyKey`)

Request body (validated):
```json
{
  "tenantId": "uuid (optional; usually derived from JWT)",
  "farmId": "uuid|null (optional)",
  "barnId": "uuid|null (optional)",
  "batchId": "uuid|null (optional)",
  "severity": "info|warning|critical",
  "channel": "in_app|webhook|email|sms",
  "title": "string",
  "message": "string",
  "payload": { "any": "json" },
  "targets": [ { "type": "user|role|topic", "value": "string" } ],
  "externalRef": "string|null (optional)",
  "dedupeKey": "string|null (optional)"
}
```

Response:
- `201` created, or `200` if deduped (idempotency replay)
```json
{ "notificationId": "uuid", "status": "sent|queued|created|failed|canceled", "createdAt": "ISO8601" }
```

Notes:
- On duplicates, service sets header `x-idempotent-replay: true` and returns `200`.

### GET /api/v1/notifications/history

List all notifications (all channels). Cursor pagination.

Query (validated):
- `farmId` / `barnId` / `batchId` (optional)
- `severity` (optional): `info|warning|critical`
- `channel` (optional): `in_app|webhook|email|sms`
- `status` (optional): `created|queued|sent|failed|canceled`
- `startDate` / `endDate` (optional): ISO8601
- `cursor` / `limit` (optional)

Response (as implemented):
```json
{ "items": [], "nextCursor": "string|null" }
```

### GET /api/v1/notifications/inbox

List “in-app inbox” notifications filtered by user/roles/targets. Cursor pagination.

Query (validated):
- `topic` (optional): comma-separated topics
- `cursor` / `limit` (optional)

Response (as implemented):
```json
{ "items": [], "nextCursor": "string|null" }
```

## Error shape

Follows the shared error contract:
```json
{ "error": { "code": "…", "message": "…", "traceId": "…" } }
```

Source of truth:
- Validation errors: `cloud-layer/cloud-notification-service/src/middlewares/validationMiddleware.ts`
- Error envelope in controllers: `cloud-layer/cloud-notification-service/src/controllers/notificationController.ts`

