Purpose: Describe MQTT topic normalization, envelope validation, deduplication, and internal routing at the edge.  
Scope: Device MQTT topics → canonical topics, validation and dedupe rules, and routing performed by `edge-ingress-gateway`.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-17  

---

## ⚠️ LEGACY / MIGRATION-ONLY

**This document describes legacy topic bridge functionality that is now superseded by `edge-ingress-gateway` normalize+route.**

The topic bridge capability is implemented **inside `edge-ingress-gateway`** as part of its normalization and routing logic. This document is retained for migration reference only.

**Current implementation**: All topic validation, envelope validation, deduplication, and routing is handled by `edge-ingress-gateway`. See `edge-layer/01-edge-services.md` for current architecture.

---

## Why this exists (historical context)

Devices publish telemetry and events over MQTT. To keep device firmware simple and enable backward compatibility, the edge layer provides a “topic bridge” capability implemented inside **`edge-ingress-gateway`**:
- Validate topic structure and message envelope.
- Normalize event types and topic naming where needed.
- Enrich missing `trace_id`.
- Deduplicate at-least-once deliveries.
- Route validated messages to internal edge services (telemetry, session, media/inference coordination).

This document contains **no alternate brokers** and is aligned with the canonical service boundaries.

---

## Inputs: canonical MQTT topics (authoritative)

See `iot-layer/03-mqtt-topic-map.md` for the complete topic map. The ingestion gateway consumes:
- `iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}`
- `iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}`
- `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`
- `iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}` (retained)

---

## Validation rules (mandatory)

### Topic validation

Reject messages where:
- Topic segments do not match expected patterns, or IDs are missing.
- Topic IDs disagree with envelope IDs (e.g., topic `tenantId` != payload `tenant_id`, topic `deviceId` != payload `device_id`).

### Envelope validation

All messages must include:
- `event_id`, `trace_id`, `tenant_id`, `device_id`, `event_type`, `ts`, `payload`
- Optional: `schema_version`, `content_hash`, `retry_count`, `produced_at`

Topic segments carry routing context (e.g., `farmId`, `barnId`, `stationId`, `sessionId`) and MUST be present and valid per `iot-layer/03-mqtt-topic-map.md`.

If `trace_id` is missing:
- Generate a trace id and attach it before routing (also log that enrichment occurred).

---

## Duplicate delivery / idempotency (mandatory)

MQTT delivery must be treated as **at-least-once**.

`edge-ingress-gateway` MUST dedupe on:
- `(tenant_id, event_id)` using an edge DB TTL cache table:
  - `ingress_dedupe(event_id, tenant_id, first_seen_at)`
- Cleanup job deletes entries older than TTL (guidance: 24–72 hours).

If a duplicate is detected:
- Skip downstream processing (no re-write to domain tables).
- Log a lightweight “duplicate dropped” message with IDs and `trace_id` only.

---

## Normalization rules

Normalization is allowed only for compatibility and must be explicit:
- Map legacy device `event_type` values to canonical event types.
- Normalize metric naming for telemetry topics (e.g., map `tempC` → `temperature`).

Any mapping must be versioned (e.g., by `schema_version`) and documented in `iot-layer/03-mqtt-topic-map.md`.

---

## Routing rules (internal edge)

After validation/dedupe, `edge-ingress-gateway` routes to internal edge services:
- Telemetry readings → `edge-telemetry-timeseries`
- WeighVision session lifecycle events → `edge-weighvision-session`
- WeighVision image captured events:
  - do not carry image bytes (images are uploaded via HTTP to `edge-media-store`)
  - may be used to trigger inference/job creation workflows

All internal calls must propagate `trace_id`/`requestId` for observability.

---

## Operational visibility

`edge-ingress-gateway` exposes ops/admin endpoints only:
- `GET /api/health` (standard health endpoint)
- `GET /api/v1/ingress/stats` (optional admin)
- `POST /api/v1/devices/config/publish` (optional admin)

It does not expose device telemetry ingestion endpoints over HTTP (MQTT-only for device→edge).

---

## Implementation Notes

- Use `boilerplates/Backend-node` for `edge-ingress-gateway`.
- Do not log full payloads; log only IDs, types, `trace_id`, and sizes.
- Persisted dedupe must use the edge DB TTL cache (no in-memory cache service).



