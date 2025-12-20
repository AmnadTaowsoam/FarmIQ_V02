Purpose: Outline the database design topics required for FarmIQ planning and implementation.  
Scope: Cloud + Edge databases, ownership boundaries, schema conventions, and lifecycle policies.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-20  

---

## 1) Database landscape (cloud vs edge)

- **Cloud DBs**: Per-service schemas for auth, master data, telemetry, analytics, and media.
- **Edge DBs**: Local operational storage for telemetry, sessions, media metadata, inference, and sync outbox.
- **Authoritative ownership**: Service-level ownership in `docs/cloud-layer/01-cloud-services.md` and `docs/edge-layer/01-edge-services.md`.

---

## 2) Datastores and schemas

- **Primary RDBMS**: PostgreSQL (Prisma-managed schemas per service).
- **Time-series**: TimescaleDB (if enabled) for high-volume telemetry tables.
- **File storage**: PVC-backed media storage for edge and optional cloud media.
- **Schema separation**: Prefer separate databases or schemas per service for isolation.

---

## 3) Core domain entities

- Reference the canonical multi-tenant model: `docs/02-domain-multi-tenant-data-model.md`.
- Required identifiers: `tenant_id`, `farm_id`, `barn_id`, `device_id`, optional `batch_id`, `session_id`.

---

## 4) Data ownership map (per service)

- **Cloud**: auth, tenant registry, ingestion dedupe, telemetry, analytics, media.
- **Edge**: ingress dedupe, telemetry, weigh sessions, media objects, inference, sync outbox/state.
- Document which service owns write access for each table.

---

## 5) Current schema inventory (FarmIQ_V02)

This section lists the current tables from source files in the repository. These are the working source of truth for implementation.

### Cloud services

- `cloud-identity-access` (`cloud-layer/cloud-identity-access/prisma/schema.prisma`)
  - `users`: id, email, password, tenant_id, created_at, updated_at
  - `roles`: id, name
  - Implicit many-to-many join table for User <-> Role
- `cloud-tenant-registry` (`cloud-layer/cloud-tenant-registry/prisma/schema.prisma`)
  - `tenants`: id, name, status, created_at, updated_at
  - `farms`: id, tenant_id, name, location, status, created_at, updated_at
  - `barns`: id, tenant_id, farm_id, name, animal_type, status, created_at, updated_at
  - `batches`: id, tenant_id, farm_id, barn_id, species, start_date, end_date, status
  - `devices`: id, tenant_id, farm_id, barn_id, batch_id, device_type, serial_no, status, metadata
  - `stations`: id, tenant_id, farm_id, barn_id, name, station_type, status
- `cloud-ingestion` (`cloud-layer/cloud-ingestion/prisma/schema.prisma`)
  - `cloud_dedupe`: tenant_id, event_id, first_seen_at (composite PK)
- `cloud-telemetry-service` (`cloud-layer/cloud-telemetry-service/prisma/schema.prisma`)
  - `telemetry_raw`: tenant_id, farm_id, barn_id, device_id, batch_id, metric, value, unit, occurred_at, event_id
  - `telemetry_agg`: tenant_id, farm_id, barn_id, device_id, metric, bucket_start, bucket_size, avg/min/max/count
- `cloud-analytics-service` (`cloud-layer/cloud-analytics-service/app/db.py`)
  - `analytics_event_dedupe`: tenant_id, event_id, first_seen_at
  - `analytics_session_state`: tenant_id, session_id, predicted_weight_kg, confidence, updated_at
  - `analytics_results`: tenant_id, type, metric, value, unit, window, occurred_at, source_event_id, trace_id, payload
- `cloud-api-gateway-bff` (`cloud-layer/cloud-api-gateway-bff/prisma/schema.prisma`)
  - `Example`: placeholder only (service should not own DB tables in production)
- `cloud-media-store` (optional)
  - No schema file yet in this repo; if enabled, use `media_object_cloud` per `docs/01-architecture.md`.

### Edge services

- `edge-ingress-gateway` (`edge-layer/edge-ingress-gateway/prisma/schema.prisma`)
  - `ingress_dedupe`: tenant_id, event_id, first_seen_at, expires_at, topic, hash
  - `device_allowlist`: tenant_id, device_id, farm_id, barn_id, enabled, notes, updated_at
  - `station_allowlist`: tenant_id, station_id, farm_id, barn_id, enabled, notes, updated_at
  - `device_last_seen`: tenant_id, device_id, last_seen_at, last_topic, last_payload_hash, updated_at
- `edge-weighvision-session` (`edge-layer/edge-weighvision-session/prisma/schema.prisma`)
  - `weight_sessions`: session_id, tenant_id, farm_id, barn_id, device_id, station_id, batch_id, status, start_at, end_at
  - `session_weights`: session_id, tenant_id, weight_kg, occurred_at, event_id, trace_id
  - `session_media_bindings`: session_id, tenant_id, media_object_id, occurred_at, event_id, trace_id, is_bound
  - `outbox`: event_type, payload, trace_id, tenant_id, processed, created_at
- `edge-vision-inference` (`docs/progress/edge-vision-inference.md`)
  - `inference_results`: tenant_id, farm_id, barn_id, device_id, session_id, media_id, predicted_weight_kg, confidence
  - `sync_outbox`: shared outbox table (owned by edge services, consumed by `edge-sync-forwarder`)
- `edge-telemetry-timeseries`, `edge-media-store`, `edge-sync-forwarder`
  - Tables defined in `docs/edge-layer/02-edge-storage-buffering.md`: `telemetry_raw`, `telemetry_agg`,
    `media_objects`, `inference_results`, `sync_outbox`, `sync_state`.

---

## 6) Table categories and purpose

- **Master data**: tenants, farms, barns, batches, devices, stations.
- **Operational**: sessions, media objects, inference results, device status.
- **Telemetry/time-series**: raw readings, aggregates, rollups.
- **Idempotency**: dedupe tables for ingress/ingestion/analytics.
- **Integration**: outbox tables for reliable sync.

---

## 7) Keys, constraints, and naming

- **Primary keys**: UUID v7 for high-write tables (generate in application code where Prisma uses `@default(uuid())`).
- **Foreign keys**: enforce tenant-scoped relationships where relations exist (e.g., tenant -> farm -> barn).
- **Naming**: snake_case tables/columns; consistent suffixes (e.g., `_id`, `_at`).
- **Unique constraints**:
  - Master data: `(tenant_id, name)` on farms/barns/stations where appropriate.
  - Dedupe: `(tenant_id, event_id)` in ingress/ingestion/analytics.
  - Telemetry agg: `(tenant_id, farm_id, barn_id, device_id, metric, bucket_start, bucket_size)`.

---

## 8) Indexing and partitioning

- **Telemetry raw**: `(tenant_id, occurred_at DESC)` and `(tenant_id, device_id, metric, occurred_at DESC)`.
- **Telemetry agg**: `(tenant_id, bucket_start DESC)` and `(tenant_id, device_id, metric, bucket_start DESC)`.
- **Ingress dedupe**: `(expires_at)` for TTL cleanup.
- **Partitioning**: range partition by time for large telemetry tables (edge and cloud).

---

## 9) Retention, archiving, and cleanup

- **Edge telemetry**:
  - `telemetry_raw`: 30–90 days.
  - `telemetry_agg`: 6–12 months.
- **Edge media**:
  - `media_objects` + PVC files: 30–90 days by default.
- **Outbox**:
  - `sync_outbox`: keep acked rows 7–30 days for audit.
  - `ingress_dedupe`: TTL 24–72 hours.
- **Cloud telemetry**:
  - Retain raw telemetry per compliance (2–7 years typical).
  - Archive to datalake if required.

---

## 10) Idempotency and event consistency

- **Ingress/ingestion**: `(tenant_id, event_id)` enforced in `ingress_dedupe` and `CloudDedupe`.
- **Telemetry**: `telemetry_raw` unique on `(tenant_id, event_id)` (cloud).
- **Analytics**: `analytics_event_dedupe` + unique `(tenant_id, type, source_event_id, metric)` in `analytics_results`.
- **Outbox**: edge services write to `sync_outbox`; `edge-sync-forwarder` batches and retries.
- **Schema versioning**: align with `docs/iot-layer/03-mqtt-topic-map.md`.

---

## 11) Migrations and schema management

- **Node services**: Prisma migrations per service (migration files tracked in Git).
- **Python analytics**: DDL created in `cloud-layer/cloud-analytics-service/app/db.py` (consider converting to migration files).
- **Edge shared DB**: ensure a single migration source for shared tables (`sync_outbox`, `telemetry_*`, `media_objects`).
- **Deployment order**: apply migrations before service rollout.

---

## 12) Backup and DR

Aligned with `docs/07-backup-dr-plan.md`:
- **RPO**: 15 minutes (cloud), 60 minutes (edge).
- **RTO**: 2–4 hours for cloud services; 2 hours for a single edge site.
- **Coverage**: cloud DBs (schema + data + roles), edge DBs (outbox + dedupe + minimal metadata).
- **Non-goal**: raw media bytes on PVCs are not primary backup targets.

---

## 13) Security and compliance

- **Access control**: least-privilege DB users per service.
- **Encryption**: TLS in transit; at-rest encryption per platform policy.
- **PII**: avoid storing sensitive fields in telemetry or media metadata; audit access paths.

---

## 14) Observability and operations

- **Monitoring**: connection pool usage, slow queries, index bloat.
- **Backlog**: monitor `sync_outbox` pending/failed counts and `ingress_dedupe` cleanup rates.
- **Health checks**: readiness fails when DB connectivity is unavailable.
- **Runbooks**: reference `docs/shared/05-runbook-ops.md`.

---

## 15) Decisions (current)

- **UUID v7**: Enforced in application code for `cloud-tenant-registry` and `cloud-telemetry-service`.
- **Naming convention (cloud-identity-access, cloud-ingestion)**: Standardized to snake_case with explicit Prisma mappings and migrations.

---

## 16) Alignment gaps / TODO

- Remove or isolate placeholder `Example` table in `cloud-api-gateway-bff` (dev-only).
- Define `cloud-media-store` schema if the service is enabled.
- Consolidate edge shared tables into a single migration source to avoid drift.
- Extend UUID v7 generation to remaining high-write services (edge telemetry, edge inference, cloud analytics).

---

## 17) Open decisions / future extensions

- Timescale adoption scope for telemetry in cloud and edge.
- Multi-region or tenant-sharded database strategy (if scaling beyond MVP).
- Data lake integration detail for long-term analytics.
