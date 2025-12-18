Purpose: Provide an overview of the FarmIQ edge layer and its core responsibilities.  
Scope: Edge service roles, ownership boundaries, communication patterns, and persistence strategy.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

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
  - PVC-backed filesystem for media (`edge-media-store`).
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
  - HTTP is used only for media upload: device → `edge-media-store` `POST /api/v1/media/images` (multipart).

- **Internal edge communication**
  - HTTP/gRPC calls between edge services (e.g., ingress → telemetry, ingress → session/media).
  - Shared relational DB for operational tables and `sync_outbox`.

- **Sync to cloud**
  - `edge-sync-forwarder` reads `sync_outbox`, batches events, and calls `cloud-ingestion` via HTTPS.
  - Cloud dedupes by `event_id + tenant_id`, then publishes to RabbitMQ.

---

## Persistence strategy

- **Database**
  - Single relational DB instance per edge cluster (PostgreSQL recommended).
  - Tables: `telemetry_raw`, `telemetry_agg`, `weight_sessions`, `media_objects`, `inference_results`, `sync_outbox`, `sync_state`.

- **Filesystem (PVC)**
  - Media path convention:
    - `/data/media/{tenant_id}/{farm_id}/{barn_id}/{session_id}/{timestamp}.jpg`
  - PVCs:
    - `edge-media-volume` for images.
    - `edge-db-volume` for DB storage (if not external).

---

## Implementation Notes

- All Node edge services should be based on `boilerplates/Backend-node`, using Express, Prisma, Winston JSON logging, and dd-trace.
- The Python inference service should be based on `boilerplates/Backend-python`, using FastAPI and JSON logging.
- No object storage and no external in-memory cache/session store are permitted; all durable storage must be via the DB and PVC filesystem only.  

## Edge offline behavior (cloud down)

When cloud connectivity is down:
- Edge continues to ingest MQTT and store locally (telemetry DB, session DB, PVC media).
- `sync_outbox` grows; `edge-sync-forwarder` retries with exponential backoff.

Required alerts/telemetry (see `shared/02-observability-datadog.md` and `shared/05-runbook-ops.md`):
- Outbox backlog size and oldest pending age.
- Disk/PVC usage thresholds (media + DB volumes).
- Last successful sync timestamp (per edge cluster/tenant).

## Links

- `edge-layer/01-edge-services.md`
- `edge-layer/02-edge-storage-buffering.md`
- `edge-layer/03-edge-inference-pipeline.md`


