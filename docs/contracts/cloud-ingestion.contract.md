# Cloud Ingestion Contract (v1)

**Service**: `cloud-ingestion`  
**Endpoint**: `POST /api/v1/edge/batch`  
**Schema Version**: `v1.0` (event envelopes declare `schema_version: "1.0"`)

## Headers

- `x-tenant-id` (optional, recommended) - tenant context; must match `tenant_id` in body.
- `x-request-id` (optional) - request correlation id.
- `x-trace-id` (optional) - trace id propagated from edge.
- `x-api-key` (required when `CLOUD_AUTH_MODE=api_key`)
- `x-edge-signature` (required when `CLOUD_AUTH_MODE=hmac`, HMAC-SHA256 over raw body)

## Request Body (BatchRequestV1)

```json
{
  "tenant_id": "uuid",
  "edge_id": "edge-01",
  "sent_at": "2025-01-01T00:00:00Z",
  "events": [
    {
      "event_id": "uuid",
      "event_type": "telemetry.temp",
      "tenant_id": "uuid",
      "farm_id": "uuid",
      "barn_id": "uuid",
      "device_id": "device-01",
      "station_id": "station-01",
      "session_id": "session-01",
      "occurred_at": "2025-01-01T00:00:00Z",
      "trace_id": "trace-01",
      "schema_version": "1.0",
      "payload": {}
    }
  ]
}
```

## Response Body (BatchResponse)

```json
{
  "accepted": 10,
  "duplicated": 2,
  "rejected": 1,
  "errors": [
    { "event_id": "uuid", "error": "Missing farm_id" }
  ]
}
```

## Idempotency

- Events are deduplicated by `(tenant_id, event_id)` on the cloud side.
- Edge must keep `event_id` stable across retries (uses outbox row id).

## Handshake

- `GET /api/v1/edge/diagnostics/handshake` validates auth headers and returns `200 OK`.
