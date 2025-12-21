# Datadog Agent Integration

**Date**: 2025-02-04  
**Scope**: `cloud-layer` docker-compose files  
**Goal**: Enable log collection and APM tracing for all cloud services via Datadog Agent.

## Summary

Added Datadog Agent container to both `docker-compose.yml` and `docker-compose.dev.yml` with automatic log collection and APM tracing support. All cloud services are configured with Datadog environment variables for trace/log correlation.

## Changes Made

### Datadog Agent Service

Added `datadog` service to both compose files:
- **Image**: `gcr.io/datadoghq/agent:7`
- **Ports**: 
  - `8126:8126` (APM intake)
  - `8125:8125/udp` (dogstatsd)
- **Environment Variables**:
  - `DD_API_KEY` (from .env)
  - `DD_SITE` (default: `datadoghq.com`)
  - `DD_ENV` (dev/prod based on compose file)
  - `DD_LOGS_ENABLED=true`
  - `DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true`
  - `DD_APM_ENABLED=true`
  - `DD_APM_NON_LOCAL_TRAFFIC=true`
  - `DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true`
- **Volumes**:
  - `/var/run/docker.sock:/var/run/docker.sock:ro`
  - `/proc/:/host/proc/:ro`
  - `/sys/fs/cgroup:/host/sys/fs/cgroup:ro`
  - `/var/lib/docker/containers:/var/lib/docker/containers:ro`

### Service Configuration

All cloud services now include Datadog environment variables:
- `DD_ENV` (dev/prod)
- `DD_SERVICE` (service name)
- `DD_VERSION` (default: `local`)
- `DD_AGENT_HOST=datadog`
- `DD_TRACE_AGENT_PORT=8126`
- `DD_LOGS_INJECTION=true` (for Node services)

## Required Environment Variables

Add to `.env` file in `cloud-layer/`:

```bash
# Datadog (optional - services will start without it, but agent will warn)
DD_API_KEY=your-datadog-api-key-here
DD_SITE=datadoghq.com
DD_ENV=dev  # or prod
DD_VERSION=0.1.0  # optional, defaults to local
```

**Note**: Services will start successfully even if `DD_API_KEY` is not set. The Datadog agent will log warnings but won't block service startup.

## Verification Commands

### 1. Start Services

```powershell
cd cloud-layer
docker compose -f docker-compose.dev.yml up -d
```

### 2. Check Datadog Agent Status

```powershell
# Check agent logs
docker logs farmiq-cloud-datadog-agent --tail 50

# Expected: Agent should show "Agent health: PASS" if DD_API_KEY is set
# If DD_API_KEY is missing, you'll see warnings but agent still runs
```

### 3. Verify Service Health

```powershell
# BFF
curl http://localhost:5125/api/health

# Tenant Registry
curl http://localhost:5121/api/health

# Feed Service
curl http://localhost:5130/api/health

# Barn Records Service
curl http://localhost:5131/api/health
```

**Expected**: All services return `200 OK`

### 4. Verify Datadog Environment Variables

```powershell
# Check BFF env vars
docker compose -f docker-compose.dev.yml config | Select-String "DD_"

# Should show:
# - DD_ENV=dev
# - DD_SERVICE=cloud-api-gateway-bff
# - DD_VERSION=local
# - DD_AGENT_HOST=datadog
# - DD_TRACE_AGENT_PORT=8126
# - DD_LOGS_INJECTION=true
```

## Log Collection

The Datadog agent automatically collects logs from all containers that log to stdout/stderr. No per-service configuration is required.

**How it works**:
- Services log to stdout/stderr (Winston JSON logs for Node services)
- Datadog agent reads from Docker container logs
- Logs are tagged with service name, environment, and other metadata

## APM Tracing

APM tracing is enabled but requires:
1. `dd-trace` package installed in services (already present)
2. Datadog agent running (✅ configured)
3. `DD_AGENT_HOST` and `DD_TRACE_AGENT_PORT` set (✅ configured)

**To enable tracing in code**:
- Import `dd-trace` at the top of service entry point (already done in most services)
- Tracing starts automatically when agent is available

## Files Changed

- `cloud-layer/docker-compose.yml` - Added datadog service, added DD_* vars to all services
- `cloud-layer/docker-compose.dev.yml` - Added datadog service, added DD_* vars to all services
- `docs/dev/02-env-vars.md` - Updated Datadog section

## Next Steps

- [ ] Set `DD_API_KEY` in `.env` file for actual log/trace forwarding
- [ ] Verify logs appear in Datadog dashboard
- [ ] Verify traces appear in Datadog APM (if enabled in code)
- [ ] Configure service-specific tags if needed

