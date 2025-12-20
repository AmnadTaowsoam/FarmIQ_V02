Purpose: Provide an overview of the FarmIQ edge layer and its core responsibilities.  
Scope: Edge service roles, ownership boundaries, communication patterns, and persistence strategy.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-20  

---

## Edge-layer overview

The edge layer runs on a k3s/Kubernetes cluster deployed close to barns. It is responsible for:
- Ingesting IoT telemetry and events via MQTT (at-least-once).
- Temporarily buffering telemetry and media when cloud is unreachable.
- Managing weigh sessions and running local ML inference.
- Performing reliable, idempotent synchronization of events to the cloud.

Key characteristics:
- Stateless services where possible, with persistence handled via:
  - A relational DB for telemetry, sessions, outbox, etc.
  - S3-compatible object storage for media (`edge-media-store` uses MinIO or AWS S3).
- Internal communication via HTTP/gRPC and a DB-based outbox for cloud sync.
  - RabbitMQ on edge is **optional** and should be used only where it materially simplifies async processing (e.g., inference job queue). Cloud sync remains outbox-driven.

---

## Canonical edge services

See `edge-layer/01-edge-services.md` for per-service details. The canonical list:
- `edge-mqtt-broker` (EMQX/Mosquitto)
- `edge-ingress-gateway` (Node, Backend-node boilerplate)
- `edge-telemetry-timeseries` (Node)
- `edge-weighvision-session` (Node)
- `edge-media-store` (Node)
- `edge-vision-inference` (Python, Backend-python boilerplate)
- `edge-sync-forwarder` (Node)

Ownership guards:
- **Session owner**: `edge-weighvision-session`.
- **Media owner**: `edge-media-store`.
- **Inference owner**: `edge-vision-inference`.
- **Sync owner**: `edge-sync-forwarder` (sole path to cloud).

---

## Communication patterns

- **Ingress from IoT**
  - MQTT (100%) → `edge-mqtt-broker` → `edge-ingress-gateway` for all telemetry and device events.
  - HTTP is used only for media upload: device → `edge-media-store` directly via `POST /api/v1/media/images/presign` + `PUT {upload_url}` (presigned upload). **Decision**: Devices bypass `edge-ingress-gateway` for media uploads to avoid gateway bottleneck and scale better. Ingress gateway does NOT proxy image bytes.

- **Internal edge communication**
  - HTTP/gRPC calls between edge services (e.g., ingress → telemetry, ingress → session).
  - Shared relational DB for operational tables and `sync_outbox`.

- **Sync to cloud**
  - `edge-sync-forwarder` reads `sync_outbox`, batches events, and calls `cloud-ingestion` via HTTPS.
  - Cloud dedupes by `event_id + tenant_id`, then publishes to RabbitMQ.

---

## Persistence strategy

- **Database**
  - Single relational DB instance per edge cluster (PostgreSQL recommended).
  - Tables: `telemetry_raw`, `telemetry_agg`, `weight_sessions`, `media_objects`, `inference_results`, `sync_outbox`, `sync_state`, `ingress_dedupe`.

- **Object Storage (S3-compatible)**
  - Media storage: S3-compatible object storage (MinIO recommended for edge, AWS S3 for cloud)
  - Object key convention: `tenants/{tenant_id}/farms/{farm_id}/barns/{barn_id}/devices/{device_id}/images/{year}/{month}/{day}/{id}.{ext}`
  - PVCs (if used):
    - `edge-db-volume` for DB storage (if not external).
    - Note: Media is stored in S3, not on PVC filesystem.

---

## Security & Provisioning

### MQTT Security

**TLS**: TLS 1.2+ is **REQUIRED** in production for MQTT connections. Devices MUST connect via `mqtts://` (port 8883 standard, configurable). 

**Current Status**: The default `mosquitto.conf` configuration is **development-only** and uses plain MQTT (port 1883) with anonymous access enabled. This configuration is **NOT suitable for production**.

**Production TLS Setup**: 
- Configure TLS on port 8883 in `mosquitto.conf` (see configuration file comments for details)
- Obtain TLS certificates from your PKI or use cert-manager in Kubernetes
- Store certificates in Kubernetes Secrets and mount to `/mosquitto/config/`
- Disable anonymous access (`allow_anonymous false`)
- Enable authentication (password file or mTLS client certificates)
- Configure ACL rules for topic-level authorization
- Update IoT device configuration to use `mqtts://` (port 8883) with TLS
- Refer to `edge-layer/edge-mqtt-broker/mosquitto.conf` for detailed production configuration instructions

**Device Authentication** (choose one method per deployment):
- **Method A (Recommended)**: Per-device username/password + ACL
  - Each device has a unique username/password pair stored in the broker's password file.
  - ACL rules restrict publish/subscribe to tenant-scoped topics: `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/+` (device can only publish to its own scope).
  - Topic-level authorization: devices MUST publish/subscribe only to their assigned tenant/farm/barn/device scope.
- **Method B (Enterprise)**: Mutual TLS (mTLS) client certificates
  - Each device has a unique client certificate issued by the edge cluster CA.
  - Broker validates client certificate CN (Common Name) maps to device_id.
  - ACL rules enforce tenant scope as above.

**Credential Revocation**:
- Disable credentials in broker password file or revoke client certificate in CA.
- Rotate credentials/certificates on compromise or scheduled basis (guidance: annually or on personnel changes).
- Devices reconnect with new credentials on next session.

### HTTP Security (Media Upload)

**Authentication**: Media upload presign endpoint (`POST /api/v1/media/images/presign`) MUST authenticate devices using:
- Short-lived signed token (JWT) issued by `edge-ingress-gateway` or `cloud-identity-access` (valid for 5-15 minutes).
- OR device certificate validation (mTLS) if certificates are used.

**Authorization**: Validate device belongs to the requested tenant/farm/barn scope before issuing presigned URL.

**Rate Limiting**: 
- Per-device rate limit: **10 presign requests per minute** (configurable).
- Per-upload size limit: **10 MB per image** (configurable, reject larger uploads).

**Logging**: NEVER log raw image bytes or full payloads. Log only: `media_id`, `device_id`, `tenant_id`, `content_length`, `trace_id`.

### Secrets & Rotation

**Storage**: All secrets (MQTT passwords, JWT signing keys, DB credentials) MUST be stored in Kubernetes Secrets (NOT in environment variables in code or env files committed to version control).

**Rotation**:
- Rotate secrets on compromise or scheduled basis (guidance: annually for passwords, quarterly for signing keys).
- Support rolling rotation: deploy new secret, allow overlap period, then remove old secret.
- Update device configurations securely (via secure config push or device registration flow).

---

## Edge offline behavior (cloud down)

When cloud connectivity is down:
- Edge continues to ingest MQTT and store locally (telemetry DB, session DB, PVC media).
- `sync_outbox` grows; `edge-sync-forwarder` retries with exponential backoff.

Required alerts/telemetry (see Operational Readiness section below and `shared/02-observability-datadog.md`):
- Outbox backlog size and oldest pending age.
- Disk/PVC usage thresholds (media + DB volumes).
- Last successful sync timestamp (per edge cluster/tenant).

---

## Operational Readiness

### Standard Health Endpoints

All edge services MUST expose:
- `GET /api/health` (liveness probe): Returns 200 if service process is alive. No dependency checks.
- `GET /api/ready` (readiness probe): Returns 200 if service can serve traffic. MUST check DB connectivity and critical dependencies (e.g., media-store checks PVC mount, forwarder checks DB and cloud endpoint reachability).
- `GET /api-docs` (OpenAPI documentation).

### Production Alert Thresholds

**Default thresholds** (configurable per environment):

**Outbox Backlog**:
- Warning: `sync_outbox` pending rows > **1000** OR oldest pending age > **1 hour**.
- Critical: `sync_outbox` pending rows > **10000** OR oldest pending age > **24 hours**.

**PVC Usage**:
- Warning: Media PVC usage > **75%** OR DB volume usage > **80%**.
- Critical: Media PVC usage > **90%** OR DB volume usage > **95%**.

**Inference Queue** (if RabbitMQ enabled):
- Warning: Queue depth > **1000 jobs** OR oldest job age > **30 minutes**.
- Critical: Queue depth > **10000 jobs** OR oldest job age > **2 hours**.

**Sync Health**:
- Warning: Last successful sync timestamp > **5 minutes ago** (for active clusters).
- Critical: Last successful sync timestamp > **1 hour ago** OR consecutive failures > **10**.

### Minimal SLO Guidance

**Availability**:
- Target: **99.5%** uptime (per edge cluster) excluding planned maintenance.
- Measurement: Service health endpoints return 200.

**Error Rate**:
- Target: **< 0.1%** of requests return 5xx errors (excluding transient network errors to cloud).
- Measurement: HTTP status codes from service logs/metrics.

**Pipeline Latency** (interactive flow):
- Target: End-to-end image upload → inference complete ≤ **15 seconds** (p95).
- Target: Session finalize acknowledgement ≤ **3 seconds** (p95).

**Data Loss**:
- Target: **Zero** data loss during cloud connectivity outages up to **7 days** (buffered in outbox/PVC).
- Measurement: Outbox replay success rate and sync deduplication metrics.

---

## Kubernetes Deployment Guardrails

**Resource Requests/Limits**: All services MUST have explicit `resources.requests` and `resources.limits` set:
- CPU: Typical requests 100-500m, limits 1-2 CPU per pod.
- Memory: Typical requests 256Mi-1Gi, limits 512Mi-2Gi per pod.
- See `01-edge-services.md` per-service recommendations.

**Node Affinity**:
- `edge-vision-inference` pods MUST schedule to GPU nodes (if GPU inference is enabled) via node selector or affinity rules.
- Other services: no special affinity requirements.

**Horizontal Pod Autoscaling (HPA)**:
- `edge-sync-forwarder`: Can scale horizontally (uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent processing).
- `edge-vision-inference`: Can scale horizontally (consumes from RabbitMQ queue or polls DB).
- DB owners (`edge-telemetry-timeseries`, `edge-weighvision-session`, `edge-media-store`): Scale carefully; prefer vertical scaling if DB becomes bottleneck.

**PVC Sizing**:
- Media PVC: Size based on retention policy (e.g., 30 days) × average daily image volume × 1.5 safety margin.
  - Example: 1000 images/day × 2MB × 30 days × 1.5 = **90 GB minimum**.
- DB PVC: Size based on telemetry retention (e.g., 90 days) and outbox retention (30 days) with growth projections.

---

## Implementation Notes

- All Node edge services should be based on `boilerplates/Backend-node`, using Express, Prisma, Winston JSON logging, and dd-trace.
- The Python inference service should be based on `boilerplates/Backend-python`, using FastAPI and JSON logging.
- No object storage and no external in-memory cache/session store are permitted; all durable storage must be via the DB and PVC filesystem only.  

## Links

- `edge-layer/01-edge-services.md`
- `edge-layer/02-edge-storage-buffering.md`
- `edge-layer/03-edge-inference-pipeline.md`
