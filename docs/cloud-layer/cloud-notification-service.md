Purpose: Service documentation for `cloud-notification-service` (Node/Express).  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-27  

---

# cloud-notification-service

## Purpose

Store and serve notifications (in-app) and manage delivery attempts for non-in-app channels (queue-backed).

## Owned Data

- Postgres tables owned by this service (Prisma schema):
  - `notifications`
  - `notification_targets`
  - `notification_delivery_attempts`
- Service logic: `cloud-layer/cloud-notification-service/src/services/notificationService.ts`

## APIs

- Base path: `/api`
- Docs: `GET /api-docs`
- Health:
  - `GET /api/health`
  - `GET /api/ready` (DB + RabbitMQ)
- Business:
  - `POST /api/v1/notifications/send`
  - `GET /api/v1/notifications/history`
  - `GET /api/v1/notifications/inbox`
- Routes: `cloud-layer/cloud-notification-service/src/routes/notificationRoutes.ts`

Contract reference:
- `docs/contracts/cloud-notification-service.contract.md`
- Canonical payload mapping: `docs/contracts/notifications.payload.md`

## Auth / Tenant Scope / RBAC

- Requires `Authorization: Bearer <jwt>` and enforces RBAC:
  - Send: `tenant_admin`, `farm_manager`
  - Inbox/History: `tenant_admin`, `farm_manager`, `house_operator`, `viewer`
  - Route enforcement: `cloud-layer/cloud-notification-service/src/routes/notificationRoutes.ts`
- Tenant resolution uses (in order): JWT claim → `x-tenant-id` header → `tenantId` in query/body (see controller).
  - `cloud-layer/cloud-notification-service/src/controllers/notificationController.ts`

## Idempotency / Dedupe

- Header: `Idempotency-Key` is accepted and stored as `idempotencyKey`.
- `externalRef` is also supported (unique per tenant).
- Duplicate behavior:
  - Duplicates return `200` and set `x-idempotent-replay: true` (no 409 in current implementation).
  - Implementation: `cloud-layer/cloud-notification-service/src/services/notificationService.ts` and controller.

## How to Run (local)

- Dev compose: `cloud-layer/docker-compose.dev.yml` service name `cloud-notification-service` (host port `5128`).
- Swagger UI: `http://localhost:5128/api-docs`

Back to index: `docs/00-index.md`

