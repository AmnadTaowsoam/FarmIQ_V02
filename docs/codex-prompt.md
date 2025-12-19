Before doing anything:
1) Open and read docs/STATUS.md.
2) If <SERVICE_NAME> is LOCKED_BY someone else and LOCK_EXPIRES is not passed, STOP and do not modify that service.
3) If <SERVICE_NAME> is not locked, lock it by updating docs/STATUS.md (LOCKED_BY=<AI_NAME>, LOCK_EXPIRES=<now+2h>), then continue.
4) If the service folder already exists, do incremental changes only; do NOT re-scaffold or overwrite.
5) When finished, update docs/STATUS.md: set status DONE, clear lock, and add evidence links to docs/progress/<service>.md.

You are Codex working in repo D:\FarmIQ\FarmIQ_V02

ASSIGNMENT (Round 1): Implement service "edge-ingress-gateway" ONLY.
Do not modify docs/STATUS.md and do not modify docs/shared/00-api-catalog.md (Doc Captain owns them).

Read first (contracts):
- docs/iot-layer/03-mqtt-topic-map.md
- docs/shared/01-api-standards.md
- docs/shared/02-service-registry.md
- docs/03-messaging-rabbitmq.md
- docs/compliance/* (READ ONLY; follow requirements)

Hard constraints:
- Device -> Edge is MQTT 100% for telemetry + events.
- MQTT broker: Mosquitto on host port 5100.
- HTTP is NOT allowed for telemetry ingestion. This service exposes ops/admin endpoints only.
- No Redis, no MinIO.
- Winston JSON logging + traceId/requestId.
- Must expose GET /api/health, GET /api/ready, /api-docs.
- Service must run on host port 5103 (container port 3000).

Implementation tasks:
1) Create service folder at:
   D:\FarmIQ\FarmIQ_V02\edge-layer\edge-ingress-gateway
   (NO extra nested folders)
2) Scaffold by COPYING boilerplate:
   D:\FarmIQ\FarmIQ_V02\boilerplates\Backend-node
3) Implement MQTT subscriptions to canonical topics (from mqtt-topic-map) and parse topic params.
4) Validate message envelope (required fields) and enforce schema_version.
5) Implement dedupe in Edge DB table:
   ingress_dedupe(tenant_id,event_id,first_seen_at)
   (TTL cleanup strategy note; NO Redis)
6) Implement device allowlist mapping (MVP):
   device_registry(device_id, tenant_id, farm_id, barn_id, enabled)
   Reject messages that violate mapping.
7) Route messages:
   - telemetry -> call edge-telemetry-timeseries POST /api/v1/telemetry/readings
   - weighvision events -> call edge-weighvision-session APIs
8) Add ops endpoint: GET /api/v1/ingress/stats
9) Add unit tests for validate+dedupe; add a minimal integration test or script.
10) Write progress report:
   docs/progress/edge-ingress-gateway.md
   (endpoints, topics, env vars, evidence)

Evidence required:
- docker compose build edge-ingress-gateway succeeds
- curl http://localhost:5103/api/health returns OK
- /api-docs renders
- Provide a simple publish example (mosquitto_pub) and expected routing result.

When copying boilerplates, never modify the original boilerplates; only modify the copied service instance.
