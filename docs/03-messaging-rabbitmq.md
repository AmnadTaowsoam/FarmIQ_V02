Purpose: Define RabbitMQ usage, message envelope conventions, and core events for FarmIQ.  
Scope: Cloud RabbitMQ topology, naming conventions, event schemas, and retry/DLQ strategy.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## RabbitMQ usage in cloud

- **Broker**: `cloud-rabbitmq` running in the cloud Kubernetes cluster.
- **Role**: Central event bus for:
  - Telemetry ingestion and aggregation.
  - WeighVision session lifecycle.
  - Media storage notifications.
  - Inference results.
  - Sync batch lifecycle.
- **Producers**
  - `cloud-ingestion` (from edge-sync-forwarder HTTP).
  - Potentially `cloud-media-store` (for cloud-level media events).
- **Consumers**
  - `cloud-telemetry-service`.
  - `cloud-analytics-service`.
  - `cloud-media-store` (optional).

RabbitMQ is **mandatory in cloud** (`cloud-rabbitmq`) as the event bus.  
RabbitMQ on **edge is optional** and should be introduced only if it materially simplifies async processing (e.g., inference job queue).  
Regardless, edge-to-cloud sync remains **DB outbox driven** (`sync_outbox` → `edge-sync-forwarder` → `cloud-ingestion`).

---

## Exchange and queue naming conventions

- **Exchanges**
  - All exchanges are **topic exchanges**.
  - Naming: `farmiq.{domain}.exchange`
    - Examples:
      - `farmiq.telemetry.exchange`
      - `farmiq.weighvision.exchange`
      - `farmiq.media.exchange`
      - `farmiq.sync.exchange`

- **Queues**
  - Naming: `farmiq.{service}.{purpose}.queue`
  - Examples:
    - `farmiq.cloud-telemetry-service.ingest.queue`
    - `farmiq.cloud-telemetry-service.agg.queue`
    - `farmiq.cloud-analytics-service.kpi.queue`
    - `farmiq.cloud-media-store.store.queue`

- **Routing keys**
  - Use dot-separated event types:
    - `telemetry.ingested`
    - `telemetry.aggregated`
    - `weighvision.session.created`
    - `weighvision.session.finalized`
    - `media.stored`
    - `inference.completed`
    - `sync.batch.sent`
    - `sync.batch.acked`

---

## Standard message envelope

All messages on RabbitMQ must be wrapped in a canonical envelope:

```json
{
  "event_id": "uuid-v7",
  "event_type": "telemetry.ingested",
  "tenant_id": "uuid-v7",
  "farm_id": "uuid-v7",
  "barn_id": "uuid-v7",
  "device_id": "uuid-v7",
  "session_id": "uuid-v7 or null",
  "occurred_at": "2025-01-01T10:00:00Z",
  "trace_id": "trace-id-from-dd-trace",
  "payload": {
    "...": "domain-specific fields"
  }
}
```

- `event_id`: Unique ID per event, used for idempotency and deduplication.
- `event_type`: Routing key and semantic type of event.
- `tenant_id` + `event_id`: Primary dedupe key in `cloud-ingestion`.
- `trace_id`: Correlates with Datadog traces/logs.

---

## Duplicate delivery and idempotency (mandatory)

- Edge MQTT ingestion must be treated as **at-least-once** delivery.
- `edge-ingress-gateway` MUST dedupe incoming MQTT messages using Edge DB TTL cache:
  - `(tenant_id, event_id)` with table `ingress_dedupe(event_id, tenant_id, first_seen_at)` and cleanup job.
  - No external in-memory cache/session store is permitted.
- `cloud-ingestion` MUST also dedupe events using `(tenant_id, event_id)` (defense in depth).
- Downstream consumers must be idempotent (upserts / `ON CONFLICT DO NOTHING/UPDATE`).

---

## Core events and example payloads

### `telemetry.ingested`

- **Producer**: `cloud-ingestion` (from edge).
- **Consumers**: `cloud-telemetry-service`, `cloud-analytics-service`.

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "event_type": "telemetry.ingested",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "session_id": null,
  "occurred_at": "2025-01-01T10:00:00Z",
  "trace_id": "trace-id-123",
  "payload": {
    "metric_type": "temperature",
    "metric_value": 26.4,
    "unit": "C"
  }
}
```

### `telemetry.aggregated`

- **Producer**: `cloud-telemetry-service`.
- **Consumers**: `cloud-analytics-service`.

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0100",
  "event_type": "telemetry.aggregated",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "session_id": null,
  "occurred_at": "2025-01-01T10:00:00Z",
  "trace_id": "trace-id-456",
  "payload": {
    "metric_type": "temperature",
    "aggregation_window": "1h",
    "avg_value": 25.8,
    "min_value": 24.5,
    "max_value": 27.2,
    "unit": "C"
  }
}
```

### `weighvision.session.created`

- **Producer**: `edge-weighvision-session` via edge outbox → `edge-sync-forwarder` → `cloud-ingestion`.
- **Consumers**: `cloud-telemetry-service`, `cloud-analytics-service`, `cloud-media-store` (optional).

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0200",
  "event_type": "weighvision.session.created",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:05:00Z",
  "trace_id": "trace-id-789",
  "payload": {
    "status": "created",
    "batch_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0400",
    "initial_weight_kg": 120.5
  }
}
```

### `weighvision.session.finalized`

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0201",
  "event_type": "weighvision.session.finalized",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:07:00Z",
  "trace_id": "trace-id-101112",
  "payload": {
    "status": "finalized",
    "final_weight_kg": 121.0,
    "image_count": 3,
    "inference_result_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0500"
  }
}
```

### `media.stored`

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0600",
  "event_type": "media.stored",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:05:30Z",
  "trace_id": "trace-id-131415",
  "payload": {
    "media_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0601",
    "path": "/data/media/tenant/farm/barn/session/frame-001.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 204800
  }
}
```

### `inference.completed`

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0700",
  "event_type": "inference.completed",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "barn_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "device_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "session_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0300",
  "occurred_at": "2025-01-01T10:06:00Z",
  "trace_id": "trace-id-161718",
  "payload": {
    "inference_result_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0500",
    "predicted_weight_kg": 121.3,
    "confidence": 0.94,
    "model_version": "weighvision-v1.2.0"
  }
}
```

### `sync.batch.sent`

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0800",
  "event_type": "sync.batch.sent",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": null,
  "barn_id": null,
  "device_id": null,
  "session_id": null,
  "occurred_at": "2025-01-01T10:10:00Z",
  "trace_id": "trace-id-192021",
  "payload": {
    "batch_id": "batch-20250101-01",
    "event_count": 500,
    "edge_cluster_id": "edge-01"
  }
}
```

### `sync.batch.acked`

```json
{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0801",
  "event_type": "sync.batch.acked",
  "tenant_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "farm_id": null,
  "barn_id": null,
  "device_id": null,
  "session_id": null,
  "occurred_at": "2025-01-01T10:10:10Z",
  "trace_id": "trace-id-222324",
  "payload": {
    "batch_id": "batch-20250101-01",
    "event_count": 500,
    "status": "acked"
  }
}
```

---

## Retry and DLQ strategy

- **Producer-side (cloud-ingestion)**
  - Use publisher confirms and retry with exponential backoff for transient broker errors.
  - If permanent issues occur, log JSON errors with `trace_id` and alert via Datadog.

- **Consumer-side**
  - Short, bounded retries with **per-message backoff** (e.g., `x-death` headers).
  - After N failed attempts, send to a **Dead Letter Queue (DLQ)**:
    - DLQ naming: `farmiq.{service}.dlq.queue`.
    - Example: `farmiq.cloud-telemetry-service.dlq.queue`.

- **DLQ handling**
  - DLQ consumers are optional but recommended:
    - Manual inspection and replay tools.
    - Automatic re-processing with stricter rate limiting.
  - All DLQ messages must preserve the original envelope for auditability.

- **Idempotency**
  - `cloud-ingestion` deduplicates events using `(tenant_id, event_id)`.
  - Downstream services must design **idempotent handlers**:
    - Upserts or `ON CONFLICT DO NOTHING/UPDATE`.
    - Store last processed `event_id` per aggregate if needed.

---

## Implementation Notes

- Use the Node `amqplib` (or a battle-tested client) with the `Backend-node` boilerplate and configure JSON logging for all publisher/consumer operations.
- Ensure every published message includes `trace_id` (from `dd-trace`) and propagates `x-request-id` where relevant into logs.
- All queue/exchange creation should be automated via infrastructure code (e.g., Helm charts) and not manually configured.


