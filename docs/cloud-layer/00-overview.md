Purpose: Provide an overview of the FarmIQ cloud layer and its core responsibilities.  
Scope: Cloud services, multi-tenant responsibilities, RabbitMQ event bus, and cloud persistence patterns.  
Owner: FarmIQ Cloud Team  
Last updated: 2025-12-17  

---

## Cloud-layer overview

The cloud layer is the central, multi-tenant platform for FarmIQ. It provides:
- Public APIs for dashboards and integrations.
- Multi-tenant master data management (tenant/farm/barn/batch/device).
- Durable telemetry storage and query.
- Analytics and derived KPIs.
- Optional cloud media retention (PVC-based, not object storage).

Key characteristics:
- Kubernetes-based, horizontally scalable stateless services.
- **RabbitMQ** is the cloud event bus (`cloud-rabbitmq`) for internal events.
- Strong security posture via OIDC/JWT + RBAC.

---

## Canonical cloud services (MVP)

Infrastructure:
- `cloud-rabbitmq`

Business services:
- `cloud-api-gateway-bff` (Node)
- `cloud-identity-access` (Node)
- `cloud-tenant-registry` (Node)
- `cloud-ingestion` (Node)
- `cloud-telemetry-service` (Node)
- `cloud-analytics-service` (Python)
- `cloud-media-store` (optional; PVC-based)

Ownership guards:
- **Cloud ingress owner**: `cloud-ingestion` ONLY.
- **Multi-tenant master data owner**: `cloud-tenant-registry`.

---

## Cloud message flow

1. `edge-sync-forwarder` sends batched events to `cloud-ingestion` over HTTPS.
2. `cloud-ingestion` validates and deduplicates by `(tenant_id, event_id)`.
3. `cloud-ingestion` publishes events to `cloud-rabbitmq`.
4. Consumers (`cloud-telemetry-service`, `cloud-analytics-service`, optional `cloud-media-store`) process events idempotently and write to their owned stores.

---

## Implementation starting points (boilerplates)

- Node cloud services: `boilerplates/Backend-node`
  - Express + TypeScript
  - Prisma migrations
  - Winston JSON logging
  - Datadog tracing via `dd-trace`
- Python cloud services: `boilerplates/Backend-python`
  - FastAPI + Uvicorn
  - Pydantic models
  - JSON structured logging
- Dashboard: `boilerplates/Frontend`
  - React + Vite + Redux
  - Optional Datadog RUM integration

---

## Implementation Notes

- All cloud HTTP APIs MUST use base path `/api`, include `GET /api/health`, and provide `/api-docs` where applicable.
- No external in-memory cache/session store and no object storage are allowed; any long-term storage must be RDBMS and PVC filesystem.

## Links

- `cloud-layer/01-cloud-services.md`
- `cloud-layer/02-dashboard.md`
- `shared/00-api-catalog.md`


