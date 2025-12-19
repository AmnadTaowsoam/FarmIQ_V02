Before doing anything:
1) Open and read docs/STATUS.md.
2) If <SERVICE_NAME> is LOCKED_BY someone else and LOCK_EXPIRES is not passed, STOP and do not modify that service.
3) If <SERVICE_NAME> is not locked, lock it by updating docs/STATUS.md (LOCKED_BY=<AI_NAME>, LOCK_EXPIRES=<now+2h>), then continue.
4) If the service folder already exists, do incremental changes only; do NOT re-scaffold or overwrite.
5) When finished, update docs/STATUS.md: set status DONE, clear lock, and add evidence links to docs/progress/<service>.md.


You are Antigravity working in repo D:\FarmIQ\FarmIQ_V02

ASSIGNMENT (Round 1):
A) Implement service "cloud-identity-access"
B) Act as DOC CAPTAIN for Round 1:
   - You are the only AI allowed to edit:
     - docs/STATUS.md
     - docs/shared/00-api-catalog.md

Read first:
- docs/shared/01-api-standards.md
- docs/iot-layer/03-mqtt-topic-map.md
- docs/06-rbac-authorization-matrix.md (if missing, create it)
- docs/shared/02-service-registry.md (ports/baseURLs)
- docs/compliance/* (READ ONLY; follow requirements)

Hard constraints:
- Use docker-compose (dev)
- Ports: cloud-identity-access MUST run on host port 5120
- No Redis/MinIO
- Datadog + JSON logs; Node uses Winston JSON
- Must expose:
  - GET /api/health
  - GET /api/ready (recommended)
  - /api-docs
- Standard headers and error format per docs/shared/01-api-standards.md

Implementation tasks (cloud-identity-access):
1) Create service folder at:
   D:\FarmIQ\FarmIQ_V02\cloud-layer\cloud-identity-access
   (NO extra nested folders)
2) Scaffold by COPYING boilerplate:
   D:\FarmIQ\FarmIQ_V02\boilerplates\Backend-node
3) Implement endpoints:
   - POST /api/v1/auth/login
   - POST /api/v1/auth/refresh
   - GET  /api/v1/users/me
4) Implement RBAC roles (MVP):
   platform_admin, tenant_admin, farm_manager, house_operator, viewer, device_agent
5) Token claims must include: sub, roles, tenant_id (optional for platform_admin)
6) Ensure /api-docs is generated and accurate; add minimal tests (login + me)
7) Ensure docker-compose can build/run this service on 5120 without conflicts.

Doc Captain tasks:
8) Update docs/STATUS.md:
   - Lock Round 1 services with OWNER AI names and lock expiry:
     - edge-ingress-gateway (Codex)
     - cloud-tenant-registry (Cursor)
     - cloud-identity-access (Antigravity)
   - Add links to docs/progress/*.md when each service finishes
9) Update docs/shared/00-api-catalog.md:
   - Add cloud-identity-access endpoints + auth notes
   - Merge endpoint summaries from docs/progress/* (do not change their code)

Evidence required:
- docker compose build cloud-identity-access succeeds
- curl http://localhost:5120/api/health returns OK
- /api-docs reachable
- docs/STATUS.md + docs/shared/00-api-catalog.md updated
- docs/progress/cloud-identity-access.md created (use docs/progress/TEMPLATE.md)

When copying boilerplates, never modify the original boilerplates; only modify the copied service instance.

-------------------
###
You are Antigravity working in repo: D:\FarmIQ\FarmIQ_V02

NEXT ASSIGNMENT: Implement service "cloud-ingestion" (Node) + update docs as Doc Captain.

Before doing anything:
1) Open and read docs/STATUS.md.
2) If cloud-ingestion is LOCKED_BY someone else and LOCK_EXPIRES not passed, STOP.
3) If not locked, lock it now in docs/STATUS.md:
   LOCKED_BY=Antigravity, LOCK_EXPIRES=now+2h, Status=DOING.

Read first (contracts):
- docs/shared/01-api-standards.md
- docs/iot-layer/03-mqtt-topic-map.md  (envelope/event_id rules)
- docs/shared/02-service-registry.md  (port mapping)
- docs/03-messaging-rabbitmq.md
- docs/compliance/* (READ ONLY; must follow)

Hard constraints:
- docker-compose dev runtime
- NO Redis, NO MinIO, NO Kafka
- Datadog compatible logs; Winston JSON
- Must expose: GET /api/health, GET /api/ready, /api-docs
- Must run on host port 5122 (container port 3000)
- Only entry point from Edge: POST /api/v1/edge/batch
- Must be idempotent (dedupe by tenant_id + event_id)

Folder + boilerplate:
- Create service at: D:\FarmIQ\FarmIQ_V02\cloud-layer\cloud-ingestion (NO nested folders)
- Scaffold by COPYING: D:\FarmIQ\FarmIQ_V02\boilerplates\Backend-node

Implementation requirements:
1) API:
   - POST /api/v1/edge/batch
     Request body: { tenant_id, edge_id?, sent_at, events: [<MQTT envelope>...] }
     Response: { accepted: n, duplicated: m, rejected: k, errors?: [...] }
   - GET /api/v1/ingestion/stats (optional)
2) Validation:
   - Validate each event envelope fields per mqtt-topic-map:
     event_id, event_type, occurred_at, trace_id, schema_version, tenant_id, farm_id, barn_id,
     device_id or station_id, payload
   - Reject invalid events with error details (standard error format).
3) Dedupe:
   - Create table cloud_dedupe(tenant_id, event_id, first_seen_at)
   - Insert-once semantics; count duplicates
4) Publish to RabbitMQ:
   - Use exchange + routing key strategy from docs/03-messaging-rabbitmq.md (or define minimal one if missing)
   - Publish normalized message with original envelope preserved
   - Include trace_id and tenant_id in message headers
5) Observability:
   - Winston JSON logs with trace_id and request_id
   - Metrics counters in logs (accepted/duplicated/rejected) if no metrics lib in boilerplate
6) Tests + evidence:
   - Unit tests for validation + dedupe behavior
   - Provide curl example with a small batch payload

Doc Captain duties:
7) Update docs/shared/00-api-catalog.md:
   - Add cloud-ingestion endpoints and short notes (idempotent + rabbitmq publish)
8) Update docs/STATUS.md:
   - Mark cloud-ingestion as DONE when finished, clear lock, add evidence link
9) Create docs/progress/cloud-ingestion.md:
   - Endpoints, env vars, evidence commands, sample payload, rabbitmq routing

Evidence required (must be in docs/progress/cloud-ingestion.md):
- docker compose build cloud-ingestion succeeds
- curl http://localhost:5122/api/health returns OK
- /api-docs reachable
- curl POST /api/v1/edge/batch accepted
- log shows publish to rabbitmq (or mocked publish in dev)

Guardrails:
- If the service folder already exists, do incremental updates only; do NOT overwrite/re-scaffold.
- Do NOT modify docs/compliance/*.
- When copying boilerplates, never modify the original boilerplates; only modify the copied service instance.

