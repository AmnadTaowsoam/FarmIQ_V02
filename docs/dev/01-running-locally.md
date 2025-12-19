Purpose: Guide for running FarmIQ services locally using docker-compose.  
Scope: docker-compose profiles, startup commands, health verification, and MQTT testing.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-18  

---

## Quick Start

1. **Copy environment file:**
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your settings if needed
   ```

2. **Start all services:**
   ```powershell
   .\scripts\dev-up.ps1
   ```

   Or manually:
   ```powershell
   # Start infrastructure first
   docker compose --profile infra up -d
   
   # Wait for infra to be healthy, then start edge
   docker compose --profile edge up -d --build
   
   # Start cloud
   docker compose --profile cloud up -d --build
   
   # Start UI
   docker compose --profile ui up -d --build
   ```

3. **Stop all services:**
   ```powershell
   .\scripts\dev-down.ps1
   ```

   Or manually:
   ```powershell
   docker compose --profile ui down
   docker compose --profile cloud down
   docker compose --profile edge down
   docker compose --profile infra down
   ```

---

## Docker Compose Profiles

FarmIQ uses docker-compose profiles to organize services:

- **`infra`**: Infrastructure services (postgres, rabbitmq)
- **`edge`**: Edge services (mqtt-broker, ingress-gateway, telemetry, session, media, inference, sync-forwarder)
- **`cloud`**: Cloud services (identity, tenant-registry, ingestion, telemetry-service, analytics-service, api-gateway-bff)
- **`ui`**: Frontend (dashboard-web)

All services run on the `farmiq-net` bridge network.

---

## Verifying Services

### Health Checks

All HTTP services expose `GET /api/health`:

```powershell
# Edge services
curl http://localhost:5103/api/health  # edge-ingress-gateway
curl http://localhost:5104/api/health  # edge-telemetry-timeseries
curl http://localhost:5105/api/health  # edge-weighvision-session
curl http://localhost:5106/api/health  # edge-media-store
curl http://localhost:5107/api/health  # edge-vision-inference
curl http://localhost:5108/api/health  # edge-sync-forwarder

# Cloud services
curl http://localhost:5120/api/health  # cloud-identity-access
curl http://localhost:5121/api/health  # cloud-tenant-registry
curl http://localhost:5122/api/health  # cloud-ingestion
curl http://localhost:5123/api/health  # cloud-telemetry-service
curl http://localhost:5124/api/health  # cloud-analytics-service
curl http://localhost:5125/api/health  # cloud-api-gateway-bff

# Frontend
curl http://localhost:5130/  # dashboard-web
```

### API Documentation

All services expose OpenAPI/Swagger documentation:

- Node services: `http://localhost:<port>/api-docs`
- Python services: `http://localhost:<port>/api-docs` (FastAPI)

Examples:
- `http://localhost:5103/api-docs` (edge-ingress-gateway)
- `http://localhost:5125/api-docs` (cloud-api-gateway-bff)
- `http://localhost:5107/api-docs` (edge-vision-inference, Python)

### Infrastructure Services

- **PostgreSQL**: `localhost:5140` (user: `farmiq`, password: `farmiq_dev`, db: `farmiq`)
- **RabbitMQ Management**: `http://localhost:5151` (default: `guest`/`guest`)
- **MQTT Broker**: `localhost:5100` (Mosquitto, non-TLS for dev)

---

## Testing MQTT Flow

### Publish a Test Telemetry Message

Using `mosquitto_pub` (install Mosquitto client tools):

```powershell
# Install mosquitto client (if not installed)
# Windows: choco install mosquitto
# Or use Docker: docker run -it --rm eclipse-mosquitto mosquitto_pub ...

# Publish telemetry reading
mosquitto_pub -h localhost -p 5100 -t "iot/telemetry/t-001/f-001/b-001/d-001/temperature" -m '{
  "schema_version": "1.0",
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "trace_id": "trace-test-001",
  "event_type": "telemetry.reading",
  "tenant_id": "t-001",
  "device_id": "d-001",
  "ts": "2025-12-18T10:00:00Z",
  "payload": {
    "value": 26.4,
    "unit": "C"
  }
}'
```

### Subscribe to MQTT Topics

```powershell
# Subscribe to all telemetry
mosquitto_sub -h localhost -p 5100 -t "iot/telemetry/+/+/+/+/+"

# Subscribe to all events
mosquitto_sub -h localhost -p 5100 -t "iot/event/+/+/+/+/+"

# Subscribe to WeighVision events
mosquitto_sub -h localhost -p 5100 -t "iot/weighvision/+/+/+/+/+/+"
```

### Verify Message Flow

1. Publish a telemetry message (see above).
2. Check `edge-ingress-gateway` logs:
   ```powershell
   docker compose logs edge-ingress-gateway
   ```
3. Verify message was routed to `edge-telemetry-timeseries`:
   ```powershell
   docker compose logs edge-telemetry-timeseries
   ```
4. Query telemetry API (if implemented):
   ```powershell
   curl http://localhost:5104/api/v1/telemetry/readings?tenant_id=t-001
   ```

---

## Rebuilding Services

To rebuild a specific service after code changes:

```powershell
# Rebuild and restart a single service
docker compose --profile edge up -d --build edge-ingress-gateway

# Rebuild all services in a profile
docker compose --profile edge up -d --build
```

---

## Viewing Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f edge-ingress-gateway

# Last 100 lines
docker compose logs --tail=100 edge-ingress-gateway
```

Logs are JSON structured (Winston for Node, JSON for Python) and should include `traceId` and `requestId`.

---

## Troubleshooting

### Service won't start

1. Check if port is already in use:
   ```powershell
   netstat -ano | findstr :5103
   ```
2. Check service logs:
   ```powershell
   docker compose logs <service-name>
   ```
3. Verify dependencies are healthy:
   ```powershell
   docker compose ps
   ```

### Health check failing

1. Verify service is listening:
   ```powershell
   curl http://localhost:<port>/api/health
   ```
2. Check service logs for errors.
3. Verify environment variables are set correctly (see `docs/dev/02-env-vars.md`).

### MQTT connection issues

1. Verify MQTT broker is running:
   ```powershell
   docker compose ps edge-mqtt-broker
   ```
2. Check broker logs:
   ```powershell
   docker compose logs edge-mqtt-broker
   ```
3. Verify broker config: `infra/mosquitto/mosquitto.conf`

---

## Development Workflow

1. **Start infrastructure:**
   ```powershell
   docker compose --profile infra up -d
   ```

2. **Start services you're working on:**
   ```powershell
   docker compose --profile edge up -d --build edge-ingress-gateway
   ```

3. **Make code changes** in `edge-layer/<service-name>/` or `cloud-layer/<service-name>/`

4. **Rebuild and restart:**
   ```powershell
   docker compose --profile edge up -d --build edge-ingress-gateway
   ```

5. **Test changes:**
   - Verify health endpoint
   - Test API endpoints
   - Publish MQTT test message
   - Check logs

---

## References

- `docs/shared/02-service-registry.md` - Complete port mapping
- `docs/dev/02-env-vars.md` - Environment variables
- `docs/iot-layer/03-mqtt-topic-map.md` - MQTT topic patterns and envelope
- `docs/shared/01-api-standards.md` - API standards

