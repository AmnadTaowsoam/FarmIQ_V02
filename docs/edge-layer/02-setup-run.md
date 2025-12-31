# Edge Layer Setup and Run Guide

**Purpose:** Guide for running edge layer stack in development and production.
**Scope:** Docker compose usage, environment variables, troubleshooting, and verification.
**Owner:** FarmIQ Edge Team
**Last updated:** 2025-12-31

---

## Quick Start (Local Development)

### Prerequisites

- Docker Desktop (or Docker Engine) with Compose v2
- Ports 5100-5115, 5141, 9000-9001 available on your machine
- Git clone of FarmIQ repository

### Start Full Stack

From repository root:

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

This starts:
- 12 edge services (MQTT, ingress, telemetry, weighvision, media, vision, sync, policy, observability, feed intake, retention, ops-web)
- 2 infrastructure services (PostgreSQL, MinIO)
- 1 mock service (cloud ingestion)

### Check Status

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

Expected status: All containers "Up" with health status "healthy" (13/14 services healthy, MQTT broker may be "health: starting")

### Stop Stack

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Reset State (Delete All Data)

**Warning:** This deletes all data in PostgreSQL and MinIO volumes.

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

---

## Compose Files Explained

### docker-compose.yml (Base Configuration)

**Purpose:** Production-ready configuration for all edge services.

**Key Features:**
- All 13 edge services defined with production environment variables
- Healthchecks on all services (wget for Node.js, curl for Python)
- Proper `depends_on` conditions for service startup order
- Network: `farmiq-net` bridge network
- No infrastructure services (PostgreSQL, MinIO expected to be external in production)

**Services Included:**
- edge-mqtt-broker
- edge-ingress-gateway
- edge-telemetry-timeseries
- edge-weighvision-session
- edge-media-store
- edge-vision-inference
- edge-sync-forwarder
- edge-policy-sync
- edge-retention-janitor
- edge-observability-agent
- edge-feed-intake
- edge-ops-web
- edge-cloud-ingestion-mock (internal only)

**Port Mappings:**

| Service | Host Port | Container Port |
|---------|-----------|---------------|
| edge-mqtt-broker | 5100 | 1883 |
| edge-ingress-gateway | 5103 | 3000 |
| edge-telemetry-timeseries | 5104 | 3000 |
| edge-weighvision-session | 5105 | 3000 |
| edge-media-store | 5106 | 3000 |
| edge-vision-inference | 5107 | 8000 |
| edge-sync-forwarder | 5108 | 3000 |
| edge-observability-agent | 5111 | 3000 |
| edge-feed-intake | 5112 | 5109 |
| edge-retention-janitor | 5114 | 3000 |
| edge-policy-sync | 5109 | 3000 |
| edge-ops-web | 5113 | 80 |

### docker-compose.dev.yml (Development Overrides)

**Purpose:** Development-specific overrides adding infrastructure and hot-reloading.

**Key Features:**
- Adds PostgreSQL (port 5141) and MinIO (ports 9000, 9001)
- Adds volume mounts for hot-reloading TypeScript code changes
- Sets `NODE_ENV=development`, `LOG_LEVEL=debug`
- Uses `Dockerfile.dev` for all services
- Overrides `depends_on` for edge-ops-web to allow standalone startup

**Volume Mounts (Hot-Reloading):**

```yaml
volumes:
  - ./edge-ingress-gateway/src:/usr/src/app/src:ro
  - ./edge-ingress-gateway/prisma:/usr/src/app/prisma:ro
  - ./edge-ingress-gateway/package.json:/usr/src/app/package.json:ro
  - ./edge-ingress-gateway/tsconfig.json:/usr/src/app/tsconfig.json:ro
  - ./edge-ingress-gateway/openapi.yaml:/usr/src/app/openapi.yaml:ro
```

**Infrastructure Services:**

| Component | Host Ports | Container Ports | Credentials |
|-----------|-------------|------------------|--------------|
| **PostgreSQL** | 5141 | 5432 | User: `farmiq`, Password: `farmiq_dev`, DB: `farmiq` |
| **MinIO** | 9000 (API), 9001 (Console) | 9000, 9001 | User: `minioadmin`, Password: `minioadmin` |

**Development Environment Variables:**

```yaml
environment:
  - NODE_ENV=development
  - LOG_LEVEL=debug
  - CLOUD_INGESTION_URL_REQUIRED=false  # Cloud optional in dev
  - CLOUD_AUTH_MODE=none  # No auth in dev
  - INTERNAL_ADMIN_ENABLED=true  # Enable admin endpoints
```

---

## Environment Variables

### Required Variables (All Services)

| Variable | Purpose | Default (Dev) |
|----------|---------|----------------|
| `NODE_ENV` | Environment mode | `production` (base), `development` (dev override) |
| `APP_PORT` | Service port (Node.js services) | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://farmiq:farmiq_dev@postgres:5432/farmiq` |

### Service-Specific Variables

#### edge-ingress-gateway
| Variable | Purpose | Default |
|----------|---------|---------|
| `MQTT_BROKER_URL` | MQTT broker URL | `mqtt://edge-mqtt-broker:1883` |
| `EDGE_TELEMETRY_TIMESERIES_URL` | Telemetry service URL | `http://edge-telemetry-timeseries:3000` |
| `EDGE_WEIGHVISION_SESSION_URL` | WeighVision service URL | `http://edge-weighvision-session:3000` |
| `DOWNSTREAM_TIMEOUT_MS` | HTTP timeout for downstream calls | `5000` |
| `DEDUPE_TTL_MS` | Dedupe cache TTL | `259200000` (3 days) |
| `DEDUPE_CLEANUP_INTERVAL_MS` | Dedupe cleanup interval | `60000` (1 minute) |

#### edge-telemetry-timeseries
| Variable | Purpose | Default |
|----------|---------|---------|
| (None service-specific, uses standard DATABASE_URL) | - | - |

#### edge-media-store
| Variable | Purpose | Default (Dev) |
|----------|---------|----------------|
| `MEDIA_ENDPOINT` | MinIO/S3 endpoint | `http://minio:9000` |
| `MEDIA_PRESIGN_ENDPOINT` | Presign endpoint (external) | `http://localhost:9000` |
| `MEDIA_ACCESS_KEY` | S3 access key | `minioadmin` |
| `MEDIA_SECRET_KEY` | S3 secret key | `minioadmin` |
| `MEDIA_REGION` | S3 region | `us-east-1` |
| `MEDIA_BUCKET` | Bucket name | `farmiq-media` |
| `MEDIA_BUCKET_AUTO_CREATE` | Auto-create bucket | `true` |
| `MEDIA_PRESIGN_EXPIRES_IN` | Presign URL expiration (seconds) | `900` (15 minutes) |
| `MEDIA_MAX_UPLOAD_BYTES` | Max upload size | `10485760` (10 MB) |

#### edge-sync-forwarder
| Variable | Purpose | Default (Dev) |
|----------|---------|----------------|
| `CLOUD_INGESTION_URL` | Cloud ingestion endpoint | `http://edge-cloud-ingestion-mock:3000/api/v1/edge/batch` |
| `CLOUD_INGESTION_URL_REQUIRED` | Fail if cloud unreachable | `false` (dev), `true` (production) |
| `CLOUD_AUTH_MODE` | Auth mode | `none` (dev), `api_key` (production) |
| `CLOUD_API_KEY` | API key for auth | (empty) |
| `CLOUD_HMAC_SECRET` | HMAC signing secret | (empty) |
| `OUTBOX_MAX_ATTEMPTS` | Max retry attempts | `10` |
| `INTERNAL_ADMIN_ENABLED` | Enable admin/debug endpoints | `true` (dev), `false` (production) |

#### edge-ops-web
| Variable | Purpose | Default (Dev) |
|----------|---------|----------------|
| `VITE_TENANT_ID` | Tenant ID for API calls | `t-001` |
| `VITE_CONNECTION_PROFILE` | Connection profile | `local` |
| `VITE_EDGE_HOST` | Edge device IP | `192.168.1.50` |
| `VITE_AUTH_MODE` | Auth mode | `none` |
| `VITE_API_KEY` | API key | (empty) |
| `VITE_HMAC_SECRET` | HMAC secret | (empty) |
| `VITE_INGRESS_GATEWAY_URL` | Ingress gateway URL | `http://edge-ingress-gateway:3000` |
| `VITE_TELEMETRY_URL` | Telemetry service URL | `http://edge-telemetry-timeseries:3000` |
| `VITE_WEIGHVISION_URL` | WeighVision service URL | `http://edge-weighvision-session:3000` |
| `VITE_MEDIA_URL` | Media service URL | `http://edge-media-store:3000` |
| `VITE_VISION_URL` | Vision service URL | `http://edge-vision-inference:8000` |
| `VITE_SYNC_URL` | Sync service URL | `http://edge-sync-forwarder:3000` |
| `VITE_OBSERVABILITY_URL` | Observability URL | `http://edge-observability-agent:3000` |
| `VITE_POLICY_SYNC_URL` | Policy sync URL | `http://edge-policy-sync:3000` |
| `VITE_FEED_INTAKE_URL` | Feed intake URL | `http://edge-feed-intake:5109` |

---

## Verification Commands

### Quick Health Check

```bash
# All services healthy
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

# Edge Ops Web UI reachable
curl -I http://localhost:5113/

# Edge Ops Web via proxy
curl http://localhost:5113/svc/ops/api/v1/ops/edge/status
```

### Service Health Endpoints

```bash
# Ingress Gateway
docker exec farmiq-edge-ingress-gateway wget -O- http://localhost:3000/api/health

# Telemetry Service
docker exec farmiq-edge-telemetry-timeseries wget -O- http://localhost:3000/api/health

# WeighVision Service
docker exec farmiq-edge-weighvision-session wget -O- http://localhost:3000/api/health

# Media Store
docker exec farmiq-edge-media-store wget -O- http://localhost:3000/api/health

# Vision Inference (Python service uses curl)
docker exec farmiq-edge-vision-inference curl -s http://localhost:8000/api/health

# Sync Forwarder
docker exec farmiq-edge-sync-forwarder wget -O- http://localhost:3000/api/health

# Observability Agent
docker exec farmiq-edge-observability-agent wget -O- http://localhost:3000/api/health

# Feed Intake
docker exec farmiq-edge-feed-intake wget -O- http://localhost:5109/api/health

# Policy Sync
docker exec farmiq-edge-policy-sync wget -O- http://localhost:3000/api/health

# Retention Janitor
docker exec farmiq-edge-retention-janitor wget -O- http://localhost:3000/api/health
```

### Infrastructure Health

```bash
# PostgreSQL
docker exec farmiq-edge-postgres pg_isready -U farmiq
# Connect: psql -h localhost -p 5141 -U farmiq -d farmiq

# MinIO
docker exec farmiq-edge-minio curl -f http://localhost:9000/minio/health/live
# Console: http://localhost:9001 (minioadmin/minioadmin)
# API: http://localhost:9000

# MQTT Broker
docker exec farmiq-edge-mqtt mosquitto_sub -h localhost -t $SYS/broker/version -C 1
# Connect: mosquitto_sub -h localhost -p 1883 -t "iot/telemetry/#" -v
```

### Stats Endpoints (Ops Dashboard Data)

```bash
# Telemetry Stats
curl http://localhost:5104/api/v1/telemetry/stats?tenant_id=t-001

# Media Stats
curl http://localhost:5106/api/v1/media/stats

# Vision Stats
curl http://localhost:5107/api/v1/inference/stats

# Sync State
curl http://localhost:5108/api/v1/sync/state

# Aggregated Edge Status
curl http://localhost:5111/api/v1/ops/edge/status
```

---

## Troubleshooting

### Common Issues

#### 1. Service Fails to Start

**Symptom:** Container exits immediately or restarts repeatedly.

**Diagnosis:**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs <service-name>
```

**Common Causes:**
- Port conflict: Check if ports 5100-5115, 5141, 9000-9001 are in use
  ```bash
  # Windows
  netstat -ano | findstr "5103 5104 5105 5106 5107 5108 5111 5112 5113 5114 5141 9000 9001"
  # Linux/Mac
  lsof -i :5103
  ```
- Database not ready: Wait for PostgreSQL health check
- Missing environment variable: Check logs for missing variable errors

#### 2. Database Connection Errors

**Symptom:** Services log "ECONNREFUSED" or "Connection refused" to PostgreSQL.

**Diagnosis:**
```bash
docker exec farmiq-edge-postgres pg_isready -U farmiq
```

**Solution:**
- Verify PostgreSQL container is running
- Check DATABASE_URL in service environment variables
- Ensure network connectivity (both services on `farmiq-net`)

#### 3. MinIO Connection Errors

**Symptom:** edge-media-store logs S3 connection errors.

**Diagnosis:**
```bash
docker exec farmiq-edge-minio curl -f http://localhost:9000/minio/health/live
```

**Solution:**
- Verify MinIO container is running
- Check MEDIA_ENDPOINT, MEDIA_ACCESS_KEY, MEDIA_SECRET_KEY
- Ensure bucket exists or set `MEDIA_BUCKET_AUTO_CREATE=true`

#### 4. Health Checks Failing

**Symptom:** Services marked as "unhealthy" but appear to be running.

**Diagnosis:**
```bash
docker inspect farmiq-edge-<service> | grep -A 10 Health
```

**Solution:**
- Healthcheck interval may need adjustment (default: 10s interval, 5s timeout, 5 retries)
- Services may need more time to start (increase `start_period` in healthcheck)
- Check service logs for startup errors

#### 5. Sync Forwarder Not Connecting to Cloud

**Symptom:** Sync state shows no successful sends, errors about cloud endpoint.

**Diagnosis:**
```bash
curl http://localhost:5108/api/v1/sync/state
curl http://localhost:5108/api/v1/sync/diagnostics/cloud
```

**Solution:**
- In development: Set `CLOUD_INGESTION_URL_REQUIRED=false` to allow offline operation
- Check `CLOUD_INGESTION_URL` is reachable
- Verify auth mode and credentials (if using `api_key` or `hmac`)
- Check mock cloud ingestion service is running (development only)

#### 6. Edge Ops Web Shows Loading/Errors

**Symptom:** UI shows loading spinner or "Failed to fetch" errors.

**Diagnosis:**
```bash
curl http://localhost:5113/svc/ops/api/v1/ops/edge/status
```

**Solution:**
- Verify all backend services are healthy
- Check `VITE_CONNECTION_PROFILE` matches your environment
- Check service base URLs in environment variables
- Check browser console for CORS errors (proxy should prevent this)

### Reset and Rebuild

If issues persist, reset the entire stack:

```bash
cd edge-layer

# Stop and remove containers, networks, volumes (DELETES ALL DATA)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Rebuild all images
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache

# Start fresh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## Production Deployment

### Kubernetes Deployment

For production deployment, use Kubernetes (k3s recommended) instead of Docker Compose.

**Key Differences:**
- External PostgreSQL and MinIO (managed cloud services recommended)
- ConfigMaps and Secrets for environment variables
- PersistentVolumeClaims for storage
- HorizontalPodAutoscaler for scalable services
- Service-based networking (not host ports)

**See:** `k8s/edge-mqtt-broker/` for example Kubernetes manifests.

### Security Hardening

**MQTT:**
- Enable TLS on port 8883 (see `edge-mqtt-broker/mosquitto.conf`)
- Configure device authentication (password file or mTLS certificates)
- Disable anonymous access
- Configure ACL rules for topic authorization

**HTTP:**
- Enable authentication on presign endpoints (JWT or mTLS)
- Set `CLOUD_AUTH_MODE=api_key` or `hmac` for production
- Disable admin/debug endpoints: `INTERNAL_ADMIN_ENABLED=false`

**Secrets:**
- Store all secrets in Kubernetes Secrets (not in env files)
- Rotate secrets quarterly (passwords) or annually (certificates)
- Use cert-manager for TLS certificate management

---

## Evidence and Verification

For verified compose run results, see:
- [../progress/edge-compose-verify.md](../progress/edge-compose-verify.md) - Full verification report with build/startup/health results
- [../progress/edge-ops-realdata.md](../progress/edge-ops-realdata.md) - Real data integration details for ops dashboard

**Key Verification Results (from edge-compose-verify.md):**
- ✅ All 14 services built successfully (12 edge + 2 infrastructure)
- ✅ All 14 containers started successfully
- ✅ 13/14 services healthy (93%)
- ✅ 12/12 HTTP services responding to health endpoints (100%)
- ✅ PostgreSQL and MinIO verified healthy

---

## Links

- [00-overview.md](00-overview.md) - Architecture overview and data flows
- [01-services.md](01-services.md) - Service table with ports, dependencies, endpoints
- [03-edge-ops-web.md](03-edge-ops-web.md) - UI usage guide
- [Evidence](../progress/edge-compose-verify.md) - Verified compose run results
- [Evidence](../progress/edge-ops-realdata.md) - Real data integration details

