Purpose: Define FarmIQ API standards applied across Node and Python services.  
Scope: Base paths, health/docs endpoints, error format, correlation headers, and minimal security/validation rules.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-17  

---

## Standards baseline (GT&D aligned)

This document aligns with:
- GT&D approved templates (Node/Python/Frontend).
- API structure design guidance.
- In-house technical requirements and master checklist.

All FarmIQ HTTP services MUST comply with these standards.

This doc defines the standard patterns; the full endpoint inventory lives in `shared/00-api-catalog.md`.

---

## Device → edge ingestion (MQTT-only)

FarmIQ enforces:
- **MQTT-only** for all device telemetry and events.
- **HTTP is allowed only for media upload** via **presigned URL** issued by `edge-media-store`.

Authoritative MQTT topics and envelope are defined in `iot-layer/03-mqtt-topic-map.md`.

---

## Required endpoints

Every HTTP service must expose:
- **Health**: `GET /api/health`
  - Response: `200 OK` with a simple payload (or `OK` text).
  - Health endpoints should be excluded from noisy tracing/metrics where appropriate.

Services SHOULD expose:
- **Ready**: `GET /api/ready` (recommended)
  - Response: `200 OK` when the service is ready to serve traffic (e.g., DB connectivity verified).
  - Useful for Kubernetes readiness probes.
- **OpenAPI docs**: `GET /api-docs`
  - Swagger UI backed by OpenAPI definition.
  - OpenAPI spec should be available at:
    - `GET /api-docs/openapi.json` (preferred)
    - or `openapi.yaml` (where the service serves YAML-based specs)

---

## Base path and routing conventions

- Base path for APIs: **`/api`**
- Business endpoints MUST be under: **`/api/v1/...`**
- Resource naming:
  - Use nouns and plural resources: `/api/devices`, `/api/sessions`.
  - Use path params for identifiers: `/api/devices/{device_id}`.
  - Use `GET` for reads, `POST` for create/actions, `PATCH` for partial update.
- Versioning:
  - Default to non-versioned `/api/...` for MVP.
  - If needed, introduce `/api/v1/...` consistently across services.

---

## Correlation and tracing headers

### Required headers (request)

- **`x-request-id`**: Unique ID for request correlation across logs.
  - If client does not supply it, the first edge/cloud gateway should generate it.
- **`x-trace-id`**: Trace correlation header.
  - For Node services using `dd-trace`, trace IDs are generated automatically; the service should still propagate `x-trace-id` to downstream calls where feasible.

### Required fields (logs)

All logs must include:
- `requestId` (from `x-request-id`)
- `traceId` (from tracer / `x-trace-id`)
- `service`, `env`, and `version` (recommended)

Do not log sensitive PII.

---

## Standard error response format

All APIs must return errors in this JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "farm_id is invalid",
    "traceId": "trace-id-123"
  }
}
```

Guidelines:
- `code`: stable, machine-readable string (UPPER_SNAKE_CASE).
- `message`: user-friendly, non-sensitive.
- `traceId`: used to correlate with Datadog traces/logs.

Suggested error codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## Request validation

- Node services should validate payloads with Zod (as per `boilerplates/Backend-node` patterns).
- Python services should validate with Pydantic (FastAPI).
- Reject invalid payloads with `400` and `VALIDATION_ERROR`.

---

## Examples (telemetry + sessions)

### Telemetry reading (device → edge via MQTT)

- **Topic (authoritative)**: `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`
- **Envelope**:

```json
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "trace_id": "trace-id-123",
  "tenant_id": "uuid-v7",
  "device_id": "device-sensor-001",
  "event_type": "telemetry.reading",
  "ts": "2025-01-01T10:00:00Z",
  "payload": {
    "metric": "temperature",
    "value": 26.4,
    "unit": "C"
  }
}
```

### WeighVision session created (device → edge via MQTT)

```json
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "trace_id": "trace-id-789",
  "tenant_id": "uuid-v7",
  "device_id": "weighvision-device-001",
  "event_type": "weighvision.session.created",
  "ts": "2025-01-01T10:05:00Z",
  "payload": {
    "batch_id": "uuid-v7"
  }
}
```

### Image upload (only allowed device HTTP call)

- **Step 1 (presign)**: `POST /api/v1/media/images/presign` on `edge-media-store`
  - Request body (JSON): `tenantId`, `farmId`, `barnId`, `deviceId`, `stationId` (optional), `sessionId` (optional), `traceId`, `capturedAt`, `contentType`, `contentLength` (optional)
  - Response: `upload_url`, `media_id`, `expires_at` (+ optional required headers)

- **Step 2 (upload)**: `PUT {upload_url}` (binary JPEG/PNG)

- **Step 3 (notify)**: publish `weighvision.image.captured` via MQTT with a `payload` that includes `media_id` (and optional `content_type`, `size_bytes`, `sha256`).

If validation fails (HTTP):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "initial_weight_kg must be >= 0",
    "traceId": "trace-id-123"
  }
}
```

---

## OpenAPI documentation

- Node services should serve Swagger UI at `/api-docs` based on `openapi.yaml`.
- Python FastAPI services should expose OpenAPI at `/api-docs` (Swagger UI) and `/openapi.json` as supported by FastAPI.
- FarmIQ standardizes on `/api-docs/openapi.json` for consumers that want the raw spec (service may proxy or alias to the framework default).

---

## TransactionId vs requestId naming

The Node boilerplate uses a `transactionId` middleware pattern. FarmIQ standardizes on:
- **`requestId`** as the canonical log field name, sourced from `x-request-id`.
- If the boilerplate middleware is named `transactionId`, map it to `requestId` in logs for consistency.

---

## Implementation Notes

- For Node services, start from `boilerplates/Backend-node` and ensure routes are mounted under `/api`.
- Ensure `/api/health` and `/api-docs` exist for each service, even if the service is internal-only (it simplifies ops and compliance checks).
- Business routes should be mounted under `/api/v1` consistently.
- Do not add server-side sessions that require an external in-memory session store; services must be stateless behind load balancers.


