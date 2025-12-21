# Edge Feed Intake Service (edge-feed-intake)

## Purpose
Define the edge-side intake service that captures SILO_AUTO feed events and local manual/import entries, stores them locally, and syncs them to the cloud via outbox.

## Scope
- Intake sources: MANUAL, API_IMPORT, SILO_AUTO
- Local validation and dedupe
- Outbox sync to cloud-ingestion

## Non-goals
- Feed master data management (cloud-owned)
- KPI computation (cloud-owned)
- Device firmware changes

## Architecture and Data Flow

```mermaid
sequenceDiagram
  participant Device as IoT Device
  participant MQTT as edge-mqtt-broker
  participant Ingress as edge-ingress-gateway
  participant Intake as edge-feed-intake
  participant DB as Edge DB
  participant Outbox as sync_outbox
  participant Sync as edge-sync-forwarder
  participant Ingest as cloud-ingestion
  participant RMQ as cloud-rabbitmq
  participant Feed as cloud-feed-service

  Device->>MQTT: MQTT publish feed.dispensed
  MQTT->>Ingress: topic + envelope
  Ingress->>Intake: HTTP internal call (validated)
  Intake->>DB: insert feed_intake_local
  Intake->>Outbox: insert feed.intake.recorded event
  Sync->>Outbox: claim batch
  Sync->>Ingest: HTTPS /api/v1/ingestion/batch
  Ingest->>Ingest: dedupe event_id + tenant_id
  Ingest->>RMQ: publish feed.intake.recorded
  RMQ->>Feed: consume + upsert
```

## Data Model (Edge DB)

### Table: feed_intake_local
| column | type | null | default | constraints | index | description |
|---|---|---|---|---|---|---|
| id | uuidv7 | no | gen_random_uuid() | pk | pk | Local intake record id |
| tenant_id | uuidv7 | no | none | fk tenant | idx (tenant_id, occurred_at) | Tenant scope |
| farm_id | uuidv7 | no | none | fk farm | idx (tenant_id, farm_id, occurred_at) | Farm scope |
| barn_id | uuidv7 | no | none | fk barn | idx (tenant_id, barn_id, occurred_at) | Barn scope |
| batch_id | uuidv7 | yes | null | fk batch | idx (tenant_id, batch_id, occurred_at) | Batch scope (optional) |
| device_id | uuidv7 | yes | null | fk device | idx (tenant_id, device_id, occurred_at) | Device scope (SILO_AUTO only) |
| source | text | no | none | check in (MANUAL, API_IMPORT, SILO_AUTO) | idx (tenant_id, source, occurred_at) | Intake source |
| feed_formula_id | uuidv7 | yes | null | fk feed_formula | idx (tenant_id, feed_formula_id) | Formula reference |
| feed_lot_id | uuidv7 | yes | null | fk feed_lot | idx (tenant_id, feed_lot_id) | Lot reference |
| quantity_kg | numeric(12,3) | no | none | check >= 0 | none | Intake quantity in kg |
| occurred_at | timestamptz | no | none | not null | idx (tenant_id, occurred_at desc) | When intake occurred |
| created_at | timestamptz | no | now() | none | idx (tenant_id, created_at desc) | Local insert time |
| external_ref | text | yes | null | unique (tenant_id, external_ref) | uniq (tenant_id, external_ref) | External import id |
| event_id | uuidv7 | yes | null | unique (tenant_id, event_id) | uniq (tenant_id, event_id) | Event id for SILO_AUTO |

### Table: feed_intake_dedupe
| column | type | null | default | constraints | index | description |
|---|---|---|---|---|---|---|
| tenant_id | uuidv7 | no | none | pk part | pk (tenant_id, dedupe_key) | Tenant scope |
| dedupe_key | text | no | none | pk part | pk (tenant_id, dedupe_key) | Hash of source + occurred_at + barn_id + sequence |
| first_seen_at | timestamptz | no | now() | none | idx (first_seen_at) | First seen timestamp |
| expires_at | timestamptz | no | none | none | idx (expires_at) | TTL cleanup |
| event_id | uuidv7 | yes | null | none | idx (tenant_id, event_id) | Original event id |

### Table: sync_outbox (edge shared)
| column | type | null | default | constraints | index | description |
|---|---|---|---|---|---|---|
| id | uuidv7 | no | gen_random_uuid() | pk | pk | Outbox id |
| tenant_id | uuidv7 | no | none | none | idx (tenant_id, created_at) | Tenant scope |
| event_type | text | no | none | none | idx (event_type, created_at) | e.g., feed.intake.recorded |
| payload | jsonb | no | none | none | gin (payload) | Event payload |
| trace_id | text | yes | null | none | idx (trace_id) | Trace correlation |
| status | text | no | pending | check in (pending, claimed, sent, dlq) | idx (status, created_at) | Sync state |
| created_at | timestamptz | no | now() | none | idx (created_at) | Insert time |
| claim_expires_at | timestamptz | yes | null | none | idx (claim_expires_at) | Lease management |

## API / Contracts Summary
- Event contract: `../contracts/events-feed-and-barn.contract.md`
- Feed service contract: `../contracts/feed-service.contract.md`

## Edge / Cloud Responsibilities
- Edge:
  - Validate and store intake locally; no cloud dependencies.
  - Emit outbox events with `event_id`, `occurred_at`, and `ingested_at` fields.
- Cloud:
  - `cloud-ingestion` dedupes events and publishes to RabbitMQ.
  - `cloud-feed-service` upserts authoritative intake records.

## Security, Compliance, Observability, Operations
- AuthN/AuthZ: device events via MQTT only; edge internal endpoints are cluster-internal.
- Idempotency: `feed_intake_dedupe` and `sync_outbox` ensure at-least-once delivery.
- Audit: log actor as `device_agent` for SILO_AUTO; `user_id` for manual/import.
- Observability: track dedupe hit rate, outbox backlog, intake rate per source.
- Rate limiting: enforce per-device limits on MQTT if configured in broker ACLs.
- GDPR/PDPA: no PII; only operational farm data.

## Testing and Verification
- Simulate duplicate MQTT publish with same `event_id` and verify dedupe.
- Verify `sync_outbox` batch retries without duplicating records in cloud.

## Open Questions
1) Should edge allow manual entry when cloud is offline, or only via local UI?
2) Should `external_ref` be required for API_IMPORT to guarantee dedupe?

## Checklist Counter
- Mermaid: 1/1
- Endpoints Table Rows: 0/0
- DB Column Rows: 27/27
- Examples: 0/0
- Open Questions: 2/2
