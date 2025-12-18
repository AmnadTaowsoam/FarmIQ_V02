Purpose: Define FarmIQ alerting coverage and SLOs for the edge + cloud platform.  
Scope: Datadog monitors, severity mapping, and key SLO targets.  
Owner: FarmIQ SRE + Platform Team  
Last updated: 2025-12-18  

---

# Alerts & SLOs

This document is the **project-specific** alerting/SLO deliverable referenced by `docs/shared/04-security-compliance-mapping.md`.

## Severity mapping

| Severity | Meaning | Response |
|---|---|---|
| **SEV-1** | Outage or widespread data loss risk | Immediate (on-call), incident channel, exec visibility |
| **SEV-2** | Major degradation, partial outage, or sustained backlog | On-call within 15 minutes |
| **SEV-3** | Localized issue or early-warning threshold | Business hours or next-day triage |

## Core SLOs (recommended)

- **Edge ingestion success**: 99.9% of MQTT messages accepted by `edge-ingress-gateway` (per site, rolling 30 days)
- **Cloud ingestion success**: 99.9% of validated events persisted in cloud DB (rolling 30 days)
- **API latency**: p95 `GET /api/*` < 300ms for core APIs (rolling 7 days, excluding `/api/health`)
- **Auth**: p95 token validation < 100ms; auth failure rate monitored for anomalies

## Datadog monitors (minimum set)

### MQTT broker down (SEV-1)

- Condition: MQTT broker health check failing OR no connections accepted for N minutes
- Signal: broker availability metric + synthetic `CONNECT` check (where available)
- Paging: on-call

### Edge outbox backlog (SEV-2)

- Condition: edge buffer/outbox depth above threshold for > 15 minutes
- Signal: `edge-ingress-gateway` outbox depth metric + oldest message age
- Action: investigate connectivity and downstream service health

### Sync/forwarding failures (SEV-2)

- Condition: sustained publish failures from edge to cloud OR repeated retry loops
- Signal: error rate for forwarder + retry_count distribution

### RabbitMQ queue depth / consumer lag (SEV-2)

- Condition: queue depth grows continuously or consumer lag > threshold
- Signal: queue depth + unacked messages + consumer count

### Cloud ingestion error rate (SEV-2)

- Condition: ingestion worker error rate > threshold (5xx, validation errors spike)
- Signal: HTTP 5xx, handler error logs, dead-letter rates

### Database disk / storage pressure (SEV-1/2)

- Condition: DB volume usage > 85% (SEV-2), > 95% (SEV-1)
- Signal: PVC usage + node disk + DB free space

### PVC usage (edge media/buffers) (SEV-2)

- Condition: edge PVC usage > 85% or rapidly increasing
- Signal: kubelet volume metrics + application-level free-space checks

### API latency p95 (SEV-2)

- Condition: p95 latency breaches SLO for > 15 minutes (excluding `/api/health`)
- Signal: APM latency + error rate correlation

### Auth failures / anomaly (SEV-3 → SEV-2 if sustained)

- Condition: anomaly in 401/403 rates or repeated invalid token attempts
- Signal: auth failure rate + IP/user clustering

## Dashboard expectations

- Edge site dashboard: broker status, outbox depth, ingestion rate, error rate, PVC usage
- Cloud dashboard: RabbitMQ depth, ingestion throughput, worker errors, DB health, API latency

## References

- `docs/shared/02-observability-datadog.md`
- `docs/03-messaging-rabbitmq.md`
- `docs/shared/05-runbook-ops.md`

