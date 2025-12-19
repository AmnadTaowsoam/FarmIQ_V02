Purpose: Guide for environment variables used in FarmIQ services.  
Scope: Root .env.example mapping, minimal env per service, and docker-compose variable usage.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-18  

---

## Root .env.example

The root `.env.example` file defines shared variables used across services:

```bash
# Database
POSTGRES_USER=farmiq
POSTGRES_PASSWORD=farmiq_dev
POSTGRES_DB=farmiq

# RabbitMQ
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Datadog (optional for local dev)
DD_SERVICE=farmiq-local
DD_ENV=development
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126

# JWT (for cloud services)
JWT_SECRET=change-me-in-production
JWT_EXPIRY=3600

# Edge Media Storage
MEDIA_STORAGE_PATH=/data/media
```

Copy `.env.example` to `.env` and customize as needed:

```powershell
Copy-Item .env.example .env
```

---

## Service-Specific Environment Variables

### Infrastructure Services

#### `postgres`
- `POSTGRES_USER` (default: `farmiq`)
- `POSTGRES_PASSWORD` (default: `farmiq_dev`)
- `POSTGRES_DB` (default: `farmiq`)

#### `rabbitmq`
- `RABBITMQ_DEFAULT_USER` (default: `guest`)
- `RABBITMQ_DEFAULT_PASS` (default: `guest`)

#### `edge-mqtt-broker`
- No environment variables (config via `infra/mosquitto/mosquitto.conf`)

---

### Edge Services

#### `edge-ingress-gateway`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `MQTT_BROKER_URL=mqtt://edge-mqtt-broker:1883`
- `DD_SERVICE=edge-ingress-gateway`
- `DD_ENV=development`

#### `edge-telemetry-timeseries`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `DD_SERVICE=edge-telemetry-timeseries`
- `DD_ENV=development`

#### `edge-weighvision-session`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `DD_SERVICE=edge-weighvision-session`
- `DD_ENV=development`

#### `edge-media-store`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `MEDIA_STORAGE_PATH=/data/media`
- `DD_SERVICE=edge-media-store`
- `DD_ENV=development`

#### `edge-vision-inference`
- `LOG_LEVEL=INFO`
- `PORT=8000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `MEDIA_STORAGE_PATH=/data/media`
- `DD_SERVICE=edge-vision-inference`
- `DD_ENV=development`

#### `edge-sync-forwarder`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `CLOUD_INGESTION_URL=http://cloud-ingestion:3000` (or external URL in prod)
- `DD_SERVICE=edge-sync-forwarder`
- `DD_ENV=development`

---

### Cloud Services

#### `cloud-identity-access`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `JWT_SECRET=${JWT_SECRET}`
- `JWT_EXPIRY=${JWT_EXPIRY}`
- `DD_SERVICE=cloud-identity-access`
- `DD_ENV=development`

#### `cloud-tenant-registry`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `DD_SERVICE=cloud-tenant-registry`
- `DD_ENV=development`

#### `cloud-ingestion`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672`
- `DD_SERVICE=cloud-ingestion`
- `DD_ENV=development`

#### `cloud-telemetry-service`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672`
- `DD_SERVICE=cloud-telemetry-service`
- `DD_ENV=development`

#### `cloud-analytics-service`
- `LOG_LEVEL=INFO`
- `PORT=8000`
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- `RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672`
- `DD_SERVICE=cloud-analytics-service`
- `DD_ENV=development`

#### `cloud-api-gateway-bff`
- `NODE_ENV=development`
- `APP_PORT=3000`
- `IDENTITY_SERVICE_URL=http://cloud-identity-access:3000`
- `TENANT_REGISTRY_URL=http://cloud-tenant-registry:3000`
- `TELEMETRY_SERVICE_URL=http://cloud-telemetry-service:3000`
- `ANALYTICS_SERVICE_URL=http://cloud-analytics-service:8000`
- `DD_SERVICE=cloud-api-gateway-bff`
- `DD_ENV=development`

---

### Frontend

#### `dashboard-web`
- `VITE_API_BASE_URL=http://localhost:5125/api`
- `VITE_DATADOG_RUM_ENABLED=false` (set to `true` in prod with app ID)
- `VITE_DATADOG_RUM_APPLICATION_ID=` (optional)
- `VITE_DATADOG_RUM_CLIENT_TOKEN=` (optional)

---

## Docker Compose Variable Substitution

Docker Compose automatically substitutes variables from `.env`:

```yaml
environment:
  - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

The `${VAR}` syntax uses values from:
1. `.env` file in the same directory as `docker-compose.yml`
2. Environment variables in the shell
3. Default values (if specified: `${VAR:-default}`)

---

## Per-Service .env.example Files

Each service should have its own `.env.example` file documenting required variables:

**Example: `edge-layer/edge-ingress-gateway/.env.example`**

```bash
# Service Configuration
NODE_ENV=development
APP_PORT=3000

# Database
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq

# MQTT
MQTT_BROKER_URL=mqtt://edge-mqtt-broker:1883

# Observability
DD_SERVICE=edge-ingress-gateway
DD_ENV=development
```

---

## Production Considerations

For production deployments:

1. **Secrets Management:**
   - Use Kubernetes Secrets or a secret management service
   - Never commit `.env` files with real credentials
   - Rotate `JWT_SECRET` regularly

2. **Database URLs:**
   - Use connection pooling parameters
   - Enable SSL/TLS for database connections
   - Use read replicas for query-heavy services

3. **Datadog:**
   - Set `DD_AGENT_HOST` to the Datadog agent hostname
   - Configure `DD_ENV` per environment (dev/staging/prod)
   - Enable APM and log collection

4. **MQTT:**
   - Use TLS for MQTT connections in production
   - Configure authentication (username/password or certificates)
   - Set up proper ACLs in Mosquitto

---

## References

- `docs/dev/01-running-locally.md` - Running services locally
- `docs/shared/02-service-registry.md` - Service URLs and ports
- `docs/shared/02-observability-datadog.md` - Datadog configuration

