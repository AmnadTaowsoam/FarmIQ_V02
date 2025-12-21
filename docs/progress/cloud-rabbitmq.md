Purpose: Progress report and evidence checklist for `cloud-rabbitmq`.  
Owner: FarmIQ Infrastructure Team  
Last updated: 2025-12-19  

---

# cloud-rabbitmq — Progress Report

## Scope implemented (MVP)

- RabbitMQ 3.13 with Management Plugin deployed in docker-compose.
- Container ports:
  - `5150` (host) → `5672` (container) - AMQP port
  - `5151` (host) → `15672` (container) - Management UI port
- User configuration:
  - Default user: `farmiq` (from `RABBITMQ_USER` env var, default: `farmiq`)
  - Default password: `farmiq_dev` (from `RABBITMQ_PASS` env var, default: `farmiq_dev`)
  - Administrator privileges
- VHost: `/` (default)
- Exchanges (topic exchanges, durable):
  - `farmiq.telemetry.exchange` - For telemetry events
  - `farmiq.weighvision.exchange` - For weighvision events
  - `farmiq.media.exchange` - For media events
  - `farmiq.sync.exchange` - For sync events
  - `farmiq.dlq.exchange` - Dead letter exchange (direct)
- Queues (durable, with TTL and DLQ):
  - `farmiq.cloud-telemetry-service.ingest.queue` - Binds to `telemetry.ingested`
  - `farmiq.cloud-telemetry-service.agg.queue` - Binds to `telemetry.aggregated`
  - `farmiq.cloud-analytics-service.kpi.queue` - Binds to multiple routing keys
  - `farmiq.dlq.queue` - Dead letter queue
- Queue bindings:
  - `farmiq.telemetry.exchange` → `telemetry.ingested` → `farmiq.cloud-telemetry-service.ingest.queue`
  - `farmiq.telemetry.exchange` → `telemetry.aggregated` → `farmiq.cloud-telemetry-service.agg.queue`
  - `farmiq.telemetry.exchange` → `telemetry.ingested` → `farmiq.cloud-analytics-service.kpi.queue`
  - `farmiq.telemetry.exchange` → `telemetry.aggregated` → `farmiq.cloud-analytics-service.kpi.queue`
  - `farmiq.weighvision.exchange` → `weighvision.session.finalized` → `farmiq.cloud-analytics-service.kpi.queue`
  - `farmiq.weighvision.exchange` → `inference.completed` → `farmiq.cloud-analytics-service.kpi.queue`
  - `farmiq.dlq.exchange` → `farmiq.dlq.queue` → `farmiq.dlq.queue`
- Dead Letter Queue (DLQ) strategy:
  - All queues configured with `x-dead-letter-exchange: farmiq.dlq.exchange`
  - Failed messages routed to DLQ for inspection
  - Message TTL: 24 hours (86400000 ms)

## Configuration files

- `cloud-layer/cloud-rabbitmq/rabbitmq.conf` - RabbitMQ server configuration
- `cloud-layer/cloud-rabbitmq/definitions.json` - Exchanges, queues, bindings, users
- `cloud-layer/cloud-rabbitmq/init.sh` - Initialization script for user setup

## Environment variables

Set in `cloud-layer/docker-compose.yml`:
- `RABBITMQ_USER` (default: `farmiq`)
- `RABBITMQ_PASS` (default: `farmiq_dev`)

## Evidence steps (docker-compose)

### 1) Build and start

```powershell
cd cloud-layer
docker compose up -d rabbitmq
```

**Expected**: RabbitMQ container starts successfully.

### 2) Health check

```powershell
# Check container status
docker compose ps rabbitmq

# Check RabbitMQ status
docker compose exec rabbitmq rabbitmqctl status
```

**Expected**: Container is running and RabbitMQ responds to status command.

### 3) Management UI

```powershell
# Open in browser
start http://localhost:5151

# Login with:
# Username: farmiq
# Password: farmiq_dev
```

**Expected**: Management UI accessible, shows exchanges, queues, and bindings.

### 4) Publish/consume test

Using `rabbitmqadmin` (install via pip: `pip install rabbitmqadmin`):

```powershell
# Publish a test message
docker compose exec rabbitmq rabbitmqadmin publish exchange=farmiq.telemetry.exchange routing_key=telemetry.ingested payload='{"event_id":"test-001","event_type":"telemetry.ingested","tenant_id":"t-001","device_id":"d-001","occurred_at":"2025-12-19T00:00:00Z","trace_id":"trace-001","payload":{"metric_type":"temperature","metric_value":26.4,"unit":"C"}}'

# Check queue depth
docker compose exec rabbitmq rabbitmqadmin list queues name messages
```

**Expected**: Message published successfully, appears in target queue.

### 5) Verify topology

```powershell
# List exchanges
docker compose exec rabbitmq rabbitmqadmin list exchanges

# List queues
docker compose exec rabbitmq rabbitmqadmin list queues

# List bindings
docker compose exec rabbitmq rabbitmqadmin list bindings
```

**Expected**: All exchanges, queues, and bindings from `definitions.json` are present.

### 6) Integration test with services

```powershell
# Start dependent services
docker compose up -d cloud-ingestion cloud-telemetry-service cloud-analytics-service

# Check service logs for RabbitMQ connection
docker compose logs cloud-telemetry-service | Select-String "rabbitmq"
docker compose logs cloud-analytics-service | Select-String "rabbitmq"
```

**Expected**: Services connect to RabbitMQ successfully and start consuming messages.

## Notes

- For production (K8s), use Helm chart or StatefulSet with persistent volumes.
- [x] Enable metrics for Datadog (documented below)
- [x] Evidence: publish/consume test

---

## Observability (Datadog)

### Metrics Collection strategy

RabbitMQ `3.13-management` exposes metrics compatible with Datadog.

**Steps to enable:**
1. **Management Plugin**: Enabled by default in the image. Exposes UI and API at port `15672`.
2. **Datadog Autodiscovery**: Add these labels to the Kubernetes Pod or Docker container:
   ```yaml
   labels:
     ad.datadoghq.com/rabbitmq.check_names: '["rabbitmq"]'
     ad.datadoghq.com/rabbitmq.init_configs: '[{}]'
     ad.datadoghq.com/rabbitmq.instances: '[{"rabbitmq_api_url": "http://%%host%%:15672/api/", "username": "farmiq", "password": "farmiq_dev"}]'
   ```
3. **Prometheus Option**: The `rabbitmq_prometheus` plugin is available. Endpoint: `http://localhost:15672/metrics`.
   - To use Prometheus scraping instead of the generic RabbitMQ check:
     ```yaml
     ad.datadoghq.com/rabbitmq.check_names: '["openmetrics"]'
     ad.datadoghq.com/rabbitmq.init_configs: '[{}]'
     ad.datadoghq.com/rabbitmq.instances: '[{"prometheus_url": "http://%%host%%:15672/metrics", "namespace": "rabbitmq", "metrics": ["*"]}]'
     ```
- Password security: In production, use secrets management (K8s secrets, Azure Key Vault, etc.).
- High availability: For production, configure RabbitMQ cluster with mirrored queues.
