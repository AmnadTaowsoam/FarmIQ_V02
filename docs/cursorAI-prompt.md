Before doing anything:
1) Open and read docs/STATUS.md.
2) If <SERVICE_NAME> is LOCKED_BY someone else and LOCK_EXPIRES is not passed, STOP and do not modify that service.
3) If <SERVICE_NAME> is not locked, lock it by updating docs/STATUS.md (LOCKED_BY=<AI_NAME>, LOCK_EXPIRES=<now+2h>), then continue.
4) If the service folder already exists, do incremental changes only; do NOT re-scaffold or overwrite.
5) When finished, update docs/STATUS.md: set status DONE, clear lock, and add evidence links to docs/progress/<service>.md.

You are Cursor AI working in repo D:\FarmIQ\FarmIQ_V02

ASSIGNMENT (Round 1): Implement service "cloud-tenant-registry" ONLY.
Do not modify docs/STATUS.md and do not modify docs/shared/00-api-catalog.md (Doc Captain owns them).

Read first:
- docs/02-domain-multi-tenant-data-model.md
- docs/shared/01-api-standards.md
- docs/shared/02-service-registry.md
- docs/compliance/* (READ ONLY; follow requirements)

Hard constraints:
- Multi-tenant required: tenant -> farm -> barn -> batch/species -> device/station.
- Standard endpoints: /api/health, /api/ready (recommended), /api-docs.
- Standard error format with traceId.
- No Redis/MinIO.
- Winston JSON logs + traceId.
- Service must run on host port 5121 (container port 3000).

Implementation tasks:
1) Create service folder at:
   D:\FarmIQ\FarmIQ_V02\cloud-layer\cloud-tenant-registry
   (NO extra nested folders)
2) Scaffold by COPYING boilerplate:
   D:\FarmIQ\FarmIQ_V02\boilerplates\Backend-node
3) Implement DB schema + migrations:
   - tenants, farms, barns, batches, devices, stations
   - include tenant_id in all child tables
   - indexes for tenant_id + foreign keys
4) Implement CRUD endpoints:
   - /api/v1/tenants
   - /api/v1/farms
   - /api/v1/barns
   - /api/v1/batches
   - /api/v1/devices
   - GET /api/v1/topology (nested structure)
5) Auth hook:
   - Accept JWT (MVP: validate signature + extract tenant scope)
   - Keep middleware pluggable (do not block compilation if auth service not ready)
6) Add OpenAPI and ensure endpoints appear in /api-docs.
7) Add minimal tests (CRUD happy path) + docker build.
8) Write progress report:
   docs/progress/cloud-tenant-registry.md

Evidence required:
- docker compose build cloud-tenant-registry passes
- /api/health ok at http://localhost:5121/api/health
- /api-docs ok
- Provide curl examples for 2-3 endpoints

When copying boilerplates, never modify the original boilerplates; only modify the copied service instance.
