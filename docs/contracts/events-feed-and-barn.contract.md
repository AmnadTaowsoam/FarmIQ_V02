# Events Contract: Feed and Barn

## Purpose
Define MQTT topics, RabbitMQ routing keys, and event payloads for feed and barn records, including outbox sync.

## Scope
- MQTT topics for feed intake and silo telemetry
- RabbitMQ events: feed intake, lot received, barn record created, KPI daily updated
- Outbox pattern and dedupe keys

## Non-goals
- Device firmware specifications
- Non-feed event domains

## Architecture and Data Flow
- Edge publishes MQTT to `edge-ingress-gateway`.
- Edge services write `sync_outbox` and `edge-sync-forwarder` posts batches to `cloud-ingestion`.
- `cloud-ingestion` publishes to `cloud-rabbitmq` using standard envelope.

## MQTT Topics (aligned with iot-layer/03-mqtt-topic-map.md)
- `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/feed.dispensed`
- `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/silo.weight`
- Optional import: `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/feed.imported`

## RabbitMQ Routing Keys
- `feed.intake.recorded`
- `feed.lot.received`
- `barn.record.created`
- `kpi.daily.updated`

## Standard RabbitMQ Envelope
See `../03-messaging-rabbitmq.md`. Required fields: `event_id`, `event_type`, `tenant_id`, `farm_id`, `barn_id`, `occurred_at`, `trace_id`, `payload`.

## OpenAPI Snippets (cloud-ingestion batch)

```yaml
paths:
  /api/v1/ingestion/batch:
    post:
      summary: Ingest edge outbox batch
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OutboxBatch'
      responses:
        '202':
          description: Accepted
```

## Request / Response Examples

### Example 1: Outbox batch with feed.intake.recorded
**Request**
```http
POST /api/v1/ingestion/batch
Authorization: Bearer <edge-service-jwt>
Content-Type: application/json
```
```json
{
  "batchId": "batch-aaa",
  "events": [
    {
      "event_id": "0190a1d1-9999-7d3f-b2e4-9e8b5f8e0101",
      "event_type": "feed.intake.recorded",
      "tenant_id": "t-001",
      "farm_id": "f-001",
      "barn_id": "b-001",
      "device_id": "d-010",
      "occurred_at": "2025-01-02T10:00:00Z",
      "trace_id": "trace-201",
      "payload": {
        "source": "SILO_AUTO",
        "quantity_kg": 25.5,
        "feed_lot_id": "lot-001"
      }
    }
  ]
}
```
**Response**
```json
{ "accepted": true, "batchId": "batch-aaa" }
```

### Example 2: RabbitMQ publish feed.lot.received
**Request**
```text
PUBLISH to farmiq.feed.exchange with routing key feed.lot.received
```
```json
{
  "event_id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0102",
  "event_type": "feed.lot.received",
  "tenant_id": "t-001",
  "farm_id": "f-001",
  "barn_id": "b-001",
  "occurred_at": "2025-01-02T08:00:00Z",
  "trace_id": "trace-202",
  "payload": {
    "feed_lot_id": "lot-001",
    "quantity_kg": 5000
  }
}
```
**Response**
```text
basic.ack (delivery-tag=221)
```

### Example 3 (Error): Invalid envelope
**Request**
```http
POST /api/v1/ingestion/batch
Authorization: Bearer <edge-service-jwt>
Content-Type: application/json
```
```json
{ "events": [ { "event_type": "feed.intake.recorded" } ] }
```
**Response**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "event_id and tenant_id are required",
    "traceId": "trace-err-201"
  }
}
```

### Example 4 (Error): Duplicate event_id
**Request**
```http
POST /api/v1/ingestion/batch
Authorization: Bearer <edge-service-jwt>
Content-Type: application/json
```
```json
{
  "batchId": "batch-bbb",
  "events": [
    {
      "event_id": "0190a1d1-9999-7d3f-b2e4-9e8b5f8e0101",
      "event_type": "feed.intake.recorded",
      "tenant_id": "t-001",
      "farm_id": "f-001",
      "barn_id": "b-001",
      "occurred_at": "2025-01-02T10:00:00Z",
      "trace_id": "trace-203",
      "payload": { "source": "SILO_AUTO", "quantity_kg": 25.5 }
    }
  ]
}
```
**Response**
```json
{ "accepted": true, "deduped": 1, "batchId": "batch-bbb" }
```

## Edge / Cloud Responsibilities
- Edge services emit outbox events and never publish directly to cloud RabbitMQ.
- Cloud-ingestion dedupes `(tenant_id, event_id)` and publishes to `cloud-rabbitmq`.

## Security, Compliance, Observability, Operations
- AuthN/AuthZ: service-to-service JWT for ingestion.
- Idempotency: dedupe at cloud-ingestion; downstream consumers use upserts.
- Observability: log `event_id`, `event_type`, `trace_id` only.

## Testing and Verification
- Post a batch with a duplicate event_id and confirm `deduped` count.

## Open Questions
1) Should silo telemetry use `telemetry.reading` or `feed.dispensed` events when only weight deltas are available?

## Checklist Counter
- Mermaid: 0/0
- Endpoints Table Rows: 0/0
- DB Column Rows: 0/0
- Examples: 4/4
- Open Questions: 1/1
