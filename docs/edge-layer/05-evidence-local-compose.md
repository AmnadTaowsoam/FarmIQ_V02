Purpose: Evidence that the Edge stack runs locally and Edge Ops Web is connected to real APIs + real DB data.  
Scope: Commands + representative outputs (reproducible).  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-31  

---

## Evidence: docker compose stack is up

Command:

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps -a
```

Representative output (example):

```text
NAME                               STATUS                       PORTS
farmiq-edge-cloud-ingestion-mock    Up (healthy)                 3000/tcp
farmiq-edge-feed-intake             Up (healthy)                 0.0.0.0:5112->5109/tcp
farmiq-edge-ingress-gateway         Up (healthy)                 0.0.0.0:5103->3000/tcp
farmiq-edge-media-store             Up (healthy)                 0.0.0.0:5106->3000/tcp
farmiq-edge-minio                   Up (healthy)                 0.0.0.0:9000-9001->9000-9001/tcp
farmiq-edge-mqtt                    Up (health: starting/unhealthy) 0.0.0.0:5100->1883/tcp
farmiq-edge-observability-agent     Up (healthy)                 0.0.0.0:5111->3000/tcp
farmiq-edge-ops-web                 Up                           0.0.0.0:5110->80/tcp, 0.0.0.0:5113->80/tcp
farmiq-edge-policy-sync             Up (healthy)                 0.0.0.0:5109->3000/tcp
farmiq-edge-postgres                Up (healthy)                 0.0.0.0:5141->5432/tcp
farmiq-edge-retention-janitor       Up (healthy)                 0.0.0.0:5114->3000/tcp, 0.0.0.0:5115->3000/tcp
farmiq-edge-sync-forwarder          Up (healthy)                 0.0.0.0:5108->3000/tcp
farmiq-edge-telemetry-timeseries    Up (healthy)                 0.0.0.0:5104->3000/tcp
farmiq-edge-vision-inference        Up (healthy)                 0.0.0.0:5107->8000/tcp
farmiq-edge-weighvision-session     Up (healthy)                 0.0.0.0:5105->3000/tcp
```

Notes:
- `edge-mqtt-broker` health may show `starting`/`unhealthy` depending on local environment; MQTT traffic can still work. Validate with `mosquitto_sub`/`mosquitto_pub` if needed.

---

## Evidence: Edge Ops Web serves UI

Command:

```bash
curl -I http://localhost:5110/
```

Expected:
- `HTTP/1.1 200 OK`

---

## Evidence: Edge Ops Web proxies real APIs via `/svc/*`

### Aggregated edge status (real service checks)

Command:

```bash
curl http://localhost:5110/svc/ops/api/v1/ops/edge/status
```

Expected:
- JSON with `overall`, `services[]`, `resources`, `sync_state`

### Real DB data surfaced via telemetry API

Commands:

```bash
curl http://localhost:5110/svc/telemetry/api/v1/telemetry/metrics
curl "http://localhost:5110/svc/telemetry/api/v1/telemetry/readings?tenant_id=t-001&limit=2"
```

Expected:
- `metrics` returns counts (e.g., `totalReadings`)
- `readings` returns rows with `tenant_id`, `device_id`, `metric_type`, `metric_value`, `occurred_at`

---

## Evidence: Vision inference health and readiness

Commands:

```bash
curl http://localhost:5107/api/health
curl http://localhost:5107/api/ready
```

Expected:
- `health` returns `{"status":"healthy"}`
- `ready` returns `{"status":"ready","db":true}`
