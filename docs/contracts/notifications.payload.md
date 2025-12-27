# Notifications Payload Contract (Dashboard / In-App)

## Purpose
Define a canonical payload mapping for dashboard-facing in-app notifications, aligned with `cloud-notification-service` Prisma schema and OpenAPI.

## Source of truth (do not invent endpoints)
- Service OpenAPI: `cloud-layer/cloud-notification-service/openapi.yaml`
- Service schema: `cloud-layer/cloud-notification-service/prisma/schema.prisma`

---

## Notification data model alignment

`cloud-notification-service` persists:
- `notifications` (core notification record)
- `notification_targets` (who should see it)
- `notification_delivery_attempts` (audit of delivery attempts)

Key fields:
- `severity`: `info | warning | critical`
- `channel`: `in_app | webhook | email | sms`
- `title`, `message`: required
- `payloadJson`: optional JSON for UX fields (deep-link, entity context, extra metadata)
- `idempotencyKey`: stored from the `Idempotency-Key` header (unique per tenant)
- `externalRef`: optional but **unique per tenant** (recommended to prevent duplicates for the same entity)
- `dedupeKey`: optional grouping key (not the unique idempotency mechanism)

---

## Tenant scope and auth (as implemented)

- Requests are authenticated via `Authorization: Bearer <jwt>`.
- Tenant scope resolution (in order):
  1) JWT claim `tenant_id` (preferred)
  2) `x-tenant-id` header (dev/internal fallback)
  3) `tenantId` in body/query (dev/internal fallback)

For internal orchestration calls (analytics → notification), always propagate:
- `Authorization` (user JWT) and `x-request-id`
- `x-tenant-id` as a safe fallback for local/dev environments

---

## Canonical payload for “Insight -> Notification”

### Endpoint
`POST /api/v1/notifications/send` (see `cloud-layer/cloud-notification-service/openapi.yaml`)

### Required de-duplication strategy (Insight notifications)

To prevent spam/duplicates:
- `externalRef` (body): **REQUIRED** for insight notifications
  - Recommended: `INSIGHT:{insightId}`
- `Idempotency-Key` (header): **REQUIRED** for insight notifications
  - Recommended:
    - `INSIGHT:{tenantId}:{farmId}:{barnId}:{startTime}:{endTime}:{mode}`

Notes:
- `Idempotency-Key` is stored and enforced as unique per tenant by the service.
- `externalRef` is also unique per tenant and provides stable de-duplication across retries and replays.
- `dedupeKey` can be populated for grouping (optional); it is not the unique idempotency mechanism.

### Optional: `notificationHint` from LLM insights

`cloud-llm-insights-service` may return an optional `notificationHint` in its insight response:
```json
{
  "notificationHint": {
    "shouldNotify": true,
    "severity": "info|warning|critical",
    "title": "short string",
    "message": "short string"
  }
}
```

This is a **hint only**. The analytics orchestrator decides whether to create a notification.

### Targets (minimum)

`cloud-notification-service` supports `targets[]` with:
- `type: user | role | topic`
- `value: string`

Minimum recommended targeting for dashboard in-app notifications:
- Role-based targets (covers default UX without passing topic filters):
  - `[{ "type": "role", "value": "tenant_admin" }, { "type": "role", "value": "farm_manager" }, { "type": "role", "value": "house_operator" }, { "type": "role", "value": "viewer" }]`

If you want topic-based routing, use `type: "topic"` and ensure the BFF passes `topic=...` when calling the inbox endpoint.

---

## Example: Create an in-app insight notification

```http
POST /api/v1/notifications/send
Authorization: Bearer <jwt>
x-request-id: <uuid>
x-tenant-id: <tenantId>
Idempotency-Key: INSIGHT:<tenantId>:<farmId>:<barnId>:<startTime>:<endTime>:<mode>
Content-Type: application/json
```

```json
{
  "farmId": "uuid",
  "barnId": "uuid",
  "batchId": null,
  "severity": "info",
  "channel": "in_app",
  "title": "Daily insight ready",
  "message": "Tap to view summary and recommended actions.",
  "externalRef": "INSIGHT:0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e2001",
  "dedupeKey": "INSIGHT:DAILY_REPORT",
  "payload": {
    "type": "insight",
    "insightId": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e2001",
    "mode": "daily_report",
    "link": "/insights/0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e2001",
    "scope": { "farmId": "uuid", "barnId": "uuid", "batchId": null },
    "window": { "startTime": "ISO8601", "endTime": "ISO8601" }
  },
  "targets": [
    { "type": "role", "value": "tenant_admin" },
    { "type": "role", "value": "farm_manager" },
    { "type": "role", "value": "house_operator" },
    { "type": "role", "value": "viewer" }
  ]
}
```

---

## Doc Change Summary (2025-12-27)

- Added a canonical notifications payload mapping (especially for Insight → Notification) aligned with the real `cloud-notification-service` schema and OpenAPI.

## Next Implementation Steps

1) Add analytics orchestrator best-effort calls to `cloud-notification-service` after insights generation.  
2) Add BFF endpoints for fetching inbox notifications (proxy to `/api/v1/notifications/inbox`).  
3) Add read/ack semantics only after the notification service supports it (do not invent endpoints).  
