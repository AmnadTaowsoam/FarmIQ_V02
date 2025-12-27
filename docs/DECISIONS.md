Purpose: Key architectural/product decisions for FarmIQ (short ADR-style log).  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27  

---

# Decisions

## D001 — `cloud-analytics-service` acts as “insights orchestrator”

**Context**: KPI/anomaly/forecast computation already lives in analytics, and insights generation needs feature aggregation + downstream calls.  
**Decision**: Add orchestrator endpoints to `cloud-analytics-service` to build feature summaries and call downstream insight generation.  
**Consequences**:
- Analytics remains the “feature summary builder” for LLM.
- Analytics must have strict timeouts/retry behavior for downstream calls.

## D002 — LLM service receives feature summaries (not raw telemetry)

**Context**: Raw telemetry is high-volume and may contain sensitive/low-level details; LLM should operate on curated aggregates.  
**Decision**: `cloud-analytics-service` sends only `FeatureSummary` payloads (kpis/anomalies/forecasts/context) to `cloud-llm-insights-service`.  
**Consequences**:
- The LLM service does not need RabbitMQ or telemetry ingestion for MVP.
- Feature summary schema becomes the stable interface for AI evolution.

## D003 — Dashboard ingress is `cloud-api-gateway-bff` only

**Context**: Frontend should not couple directly to internal service topology.  
**Decision**: `dashboard-web` calls only `cloud-api-gateway-bff` for dashboard APIs.  
**Consequences**:
- BFF must proxy/aggregate and enforce consistent error handling and correlation headers.
- Internal services remain private behind cluster networking/policies.

## D004 — Notification emission is best-effort (never fail insight response)

**Context**: Notifications improve UX but should not block the primary “generate insight” response.  
**Decision**: Analytics attempts notification creation after insight generation; errors/timeouts do not fail the insight response.  
**Consequences**:
- Users might miss a notification if downstream is degraded; UI should still show insight on refresh/history.

## D005 — Use `externalRef` + `Idempotency-Key` to prevent notification spam

**Context**: Insight generation can be retried, and repeated requests should not create duplicate notifications.  
**Decision**: For insight-triggered notifications:
- `externalRef = "INSIGHT:{insightId}"`
- `Idempotency-Key = "INSIGHT:{tenant}:{farm}:{barn}:{start}:{end}:{mode}"`
**Consequences**:
- Notification service can treat duplicates as “replay” and return an existing notification.
- Callers should treat duplicate responses as success.

