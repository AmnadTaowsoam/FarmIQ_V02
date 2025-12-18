Purpose: Define observability standards for FarmIQ using Datadog for logs, metrics, traces, and alerting.  
Scope: Logging, tracing, metrics, and dashboards/alerts for Node and Python services across edge and cloud.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-17  

---

## Observability principles

FarmIQ uses Datadog as the single observability platform:
- **Logs**: JSON structured logs to stdout; Datadog Agent collects.
- **Traces**: `dd-trace`/`ddtrace` for distributed tracing (chosen for consistency with approved Node template).
- **Metrics**: Service-level and infrastructure metrics via Datadog Agent + integrations (Kubernetes, RabbitMQ).

Non-negotiable:
- Node services use **Winston JSON logging** and **dd-trace** where applicable.
- Do not log sensitive PII.
- Always include `traceId` + `requestId` correlation.

---

## Logging standards

### Node services (Winston JSON)

Requirements:
- Log JSON to stdout using Winston.
- Include fields:
  - `timestamp`, `level`, `message`
  - `service`, `env`, `version`
  - `requestId` (from `x-request-id`)
  - `traceId` (from tracer)

Guidance (aligned to boilerplate):
- Use `winston.format.json()` + `winston.format.splat()`.
- Handle exceptions/rejections.

### Python services (JSON structured logs)

Requirements:
- Emit JSON logs to stdout.
- Include:
  - `timestamp`, `level`, `logger`, `message`
  - `service`, `env`, `version`
  - `traceId` if tracing enabled

Use the JSON logging pattern in `boilerplates/Backend-python`.

---

## Tracing standards (dd-trace)

### Node services

- Initialize `dd-trace` at process start (before importing Express app initialization).
- Configure:
  - `DD_SERVICE`, `DD_ENV`, `DD_VERSION`
  - `DD_LOGS_INJECTION=true` (so trace IDs are injected into logs where supported)
- Exclude noisy endpoints:
  - Health checks (`/api/health`) should be excluded from tracing or set to low sampling.

### Python services

- Use `ddtrace` (Datadog tracing for Python) where applicable.
- Ensure trace IDs are logged and propagated where the service makes outbound calls.

---

## Metrics to collect (minimum)

### Service (application) metrics

- **HTTP**
  - Request count and rate
  - Latency p50/p95/p99
  - Error rate by status code
- **Business**
  - Telemetry ingested per minute per tenant/device
  - WeighVision sessions created/finalized per hour
  - Inference jobs processed per minute; average inference time
  - Outbox backlog size (`sync_outbox` pending) and age of oldest pending event
  - Edge MQTT ingestion:
    - `edge-ingress-gateway` message rate by `event_type`
    - Dedupe hit rate (count of duplicates skipped) from `ingress_dedupe`
    - Invalid envelope count (validation failures)
  - Cloud ingestion dedupe hit rate

### Infrastructure metrics

- Kubernetes:
  - CPU/memory usage per pod
  - Pod restarts
  - Node disk pressure
- PVC:
  - Disk usage % for `edge-media-volume`, `edge-db-volume`, and `cloud-media-volume` (if enabled)
- RabbitMQ (cloud and edge):
  - Queue depth
  - Consumer lag
  - Publish/ack rates
  - Unacked messages
  - DLQ message count

---

## Recommended dashboards

- **Edge Operations**
  - Edge service health + restarts
  - PVC usage and growth
  - Inference queue backlog (edge RabbitMQ)
  - Outbox backlog and retry rates
- **Cloud Ingestion**
  - Ingestion request rate and error rate
  - Dedupe hit rate
  - RabbitMQ publish rates
- **Telemetry**
  - Telemetry ingestion throughput
  - Telemetry query latency
- **Analytics**
  - KPI processing latency
  - Job failures and DLQ trends

---

## Alerting (minimum set)

Alerts should be configured so teams know before users complain:
- **Edge offline**
  - Edge cluster heartbeat missing / `edge-sync-forwarder` cannot reach cloud for N minutes.
- **Queue backlog**
  - RabbitMQ queue depth above threshold for N minutes (edge inference or cloud telemetry).
- **Sync stuck**
  - `sync_outbox` pending count or oldest pending age above threshold.
  - Last successful sync timestamp too old (per edge cluster/tenant).
- **Inference failing**
  - Inference error rate > threshold or DLQ growth.
- **Media disk full**
  - PVC usage > 85% warning and > 95% critical.
- **API error spikes**
  - 5xx error rate above threshold on `cloud-api-gateway-bff` and `cloud-ingestion`.

---

## Implementation Notes

- All services should standardize on `x-request-id` and ensure it is present in logs.
- Use Datadog Kubernetes + RabbitMQ integrations rather than custom collectors where possible.
- Ensure health check endpoints are excluded from tracing to reduce APM noise as recommended by the Node API structure design guidance.


