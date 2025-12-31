# Edge Ops Web - Usage Guide

**Purpose:** Guide for using Edge Ops Web UI to monitor and manage edge operations.
**Scope:** Connection profiles, authentication, dashboard features, and metrics sources.
**Owner:** FarmIQ Edge Team
**Last updated:** 2025-12-31

---

## Overview

Edge Ops Web is a React-based UI for monitoring and managing edge operations. It provides:
- Real-time system status and resource metrics
- Sync backlog and DLQ monitoring
- Service health checks and diagnostics
- Telemetry, media, and inference statistics
- Admin controls for sync and diagnostics export

The UI is served by nginx on port 80 and includes a Node.js proxy server (`server.js`) that forwards requests to backend services via `/svc/*` to avoid CORS issues.

---

## Access URLs

| Environment | URL | Notes |
|-------------|------|-------|
| **Local Development** | `http://localhost:5113/` | Running on local machine |
| **Docker Compose** | `http://localhost:5113/` | Within compose network |
| **Edge Device** | `http://<edge-ip>:5113/` | Remote edge device (use `VITE_EDGE_HOST`) |

---

## Connection Profiles

Edge Ops Web supports three connection profiles via `VITE_CONNECTION_PROFILE`:

### 1. Local Profile

**Use Case:** Development on local machine where services run on localhost.

**Configuration:**
```yaml
VITE_CONNECTION_PROFILE=local
VITE_EDGE_HOST=192.168.1.50  # Not used in local mode
```

**Base URLs:**
- Telemetry: `http://localhost:5104`
- Media Store: `http://localhost:5106`
- Vision: `http://localhost:5107`
- Sync: `http://localhost:5108`
- Observability: `http://localhost:5111`
- Ingress: `http://localhost:5103`
- WeighVision: `http://localhost:5105`
- Policy Sync: `http://localhost:5109`
- Feed Intake: `http://localhost:5112`

### 2. Cluster Profile

**Use Case:** Running within docker compose network (services communicate via container names).

**Configuration:**
```yaml
VITE_CONNECTION_PROFILE=cluster
```

**Base URLs:** Relative paths via proxy:
- `/svc/telemetry/*` → `edge-telemetry-timeseries`
- `/svc/media/*` → `edge-media-store`
- `/svc/vision/*` → `edge-vision-inference`
- `/svc/sync/*` → `edge-sync-forwarder`
- `/svc/ops/*` → `edge-observability-agent`
- `/svc/ingress/*` → `edge-ingress-gateway`
- `/svc/weighvision/*` → `edge-weighvision-session`
- `/svc/policy/*` → `edge-policy-sync`
- `/svc/feed/*` → `edge-feed-intake`

**Implementation:** `edge-ops-web/server.js` proxies requests to service containers.

### 3. Edge Device Profile

**Use Case:** Running on remote edge device with specific IP address.

**Configuration:**
```yaml
VITE_CONNECTION_PROFILE=edge-device
VITE_EDGE_HOST=192.168.1.50  # Edge device IP
```

**Base URLs:**
- Telemetry: `http://192.168.1.50:5104`
- Media Store: `http://192.168.1.50:5106`
- Vision: `http://192.168.1.50:5107`
- Sync: `http://192.168.1.50:5108`
- Observability: `http://192.168.1.50:5111`
- Ingress: `http://192.168.1.50:5103`
- WeighVision: `http://192.168.1.50:5105`
- Policy Sync: `http://192.168.1.50:5109`
- Feed Intake: `http://192.168.1.50:5112`

---

## Authentication

Edge Ops Web supports multiple authentication modes via `VITE_AUTH_MODE`:

### None Mode (Development)

**Configuration:**
```yaml
VITE_AUTH_MODE=none
VITE_API_KEY=
VITE_HMAC_SECRET=
```

**Behavior:** No authentication required. Suitable for development only.

### API Key Mode

**Configuration:**
```yaml
VITE_AUTH_MODE=api-key
VITE_API_KEY=your-api-key-here
VITE_HMAC_SECRET=
```

**Headers Sent:**
```
x-tenant-id: <tenant-id>
x-api-key: <api-key>
x-trace-id: <generated-uuid>
```

### HMAC Mode

**Configuration:**
```yaml
VITE_AUTH_MODE=hmac
VITE_API_KEY=
VITE_HMAC_SECRET=your-hmac-secret
```

**Headers Sent:**
```
x-tenant-id: <tenant-id>
x-signature: <hmac-signature>
x-trace-id: <generated-uuid>
```

### Tenant ID

Always included regardless of auth mode:
```yaml
VITE_TENANT_ID=t-001  # Default tenant
```

---

## Dashboard Features

### Overview Tab

The Overview tab provides a high-level summary of edge health and data metrics.

**Metrics Displayed:**

| Metric | Source | API Endpoint | Update Interval |
|---------|---------|---------------|-----------------|
| **System Status** | Observability Agent | `GET /api/v1/ops/edge/status` | 5 seconds |
| **CPU Usage** | Observability Agent | `GET /api/v1/ops/edge/status` | 5 seconds |
| **Memory Usage** | Observability Agent | `GET /api/v1/ops/edge/status` | 5 seconds |
| **Disk Usage** | Observability Agent | `GET /api/v1/ops/edge/status` | 5 seconds |
| **Telemetry Readings** | Telemetry Service | `GET /api/v1/telemetry/stats` | 5 seconds |
| **Media Objects** | Media Store | `GET /api/v1/media/stats` | 5 seconds |
| **Inference Results** | Vision Service | `GET /api/v1/inference/stats` | 5 seconds |
| **Sync Backlog** | Sync Forwarder | `GET /api/v1/sync/state` | 5 seconds |
| **DLQ Count** | Sync Forwarder | `GET /api/v1/sync/state` | 5 seconds |
| **Ingress Stats** | Ingress Gateway | `GET /api/v1/ingress/stats` | 5 seconds |

**Metric Cards:**
- **Telemetry Readings:** Total count + last reading timestamp
  - API: `GET /api/v1/telemetry/stats?tenant_id=<tenant-id>`
  - Response: `{"total_readings": 1247, "last_reading_at": "2025-12-31T08:45:23.456Z", "tenant_id": "t-001"}`
  - Display: "1,247 readings" with last timestamp

- **Media Objects:** Total count + last created timestamp
  - API: `GET /api/v1/media/stats` (with `x-tenant-id` header)
  - Response: `{"total_objects": 89, "last_created_at": "2025-12-31T09:15:12.789Z", "tenant_id": "t-001"}`
  - Display: "89 objects" with last timestamp

- **Inference Results:** Total count + last result timestamp
  - API: `GET /api/v1/inference/stats` (with `x-tenant-id` header)
  - Response: `{"total_results": 42, "last_result_at": "2025-12-31T10:30:45.123Z", "tenant_id": "t-001"}`
  - Display: "42 results" with last timestamp

**System Resources:**
- **CPU Usage:** Percentage from `edge-observability-agent`
  - Source: `GET /api/v1/ops/edge/status`
  - Display: "45.2%" (green < 70%, yellow < 90%, red ≥ 90%)

- **Memory Usage:** Percentage from `edge-observability-agent`
  - Source: `GET /api/v1/ops/edge/status`
  - Display: "62.5%" (green < 70%, yellow < 90%, red ≥ 90%)

- **Disk Usage:** Percentage + free GB from `edge-observability-agent`
  - Source: `GET /api/v1/ops/edge/status`
  - Display: "35.8% used (125.5 GB Free)" (green < 70%, yellow < 90%, red ≥ 90%)

**Sync Status:**
- **Backlog Count:** Number of pending outbox events
  - API: `GET /api/v1/sync/state`
  - Response: `{"pending": 45, "claimed": 10, "sending": 5, ...}`
  - Display: "45 pending" (green < 1000, yellow < 5000, red ≥ 5000)

- **DLQ Count:** Number of failed events in dead-letter queue
  - API: `GET /api/v1/sync/state`
  - Response: `{"dlq_count": 8, ...}`
  - Display: "8 in DLQ" (green < 10, yellow < 50, red ≥ 50)

- **Last Sync:** Timestamp of last successful sync to cloud
  - API: `GET /api/v1/sync/state`
  - Response: `{"last_success_at": "2025-12-31T11:20:15.789Z", ...}`
  - Display: "2 minutes ago" (relative time)

### Sync Tab

The Sync tab provides detailed sync forwarder controls and monitoring.

**Features:**
- **Sync State Display:** Pending, claimed, sending, acked, failed, DLQ counts
- **Last Sync:** Timestamp of last successful sync
- **Last Error:** Error message if last sync failed
- **Oldest Pending:** Age of oldest pending event
- **Trigger Sync:** Manual trigger button to force immediate sync
- **View DLQ:** List of failed events (requires `INTERNAL_ADMIN_ENABLED=true`)
- **Redrive DLQ:** Button to re-drive failed events (requires `INTERNAL_ADMIN_ENABLED=true`)

**API Endpoints Used:**
- `GET /api/v1/sync/state` - Get sync state
- `POST /api/v1/sync/trigger` - Trigger immediate sync
- `GET /api/v1/sync/dlq?limit=100` - Get DLQ entries
- `POST /api/v1/sync/dlq/redrive` - Redrive failed events

### Diagnostics Tab

The Diagnostics tab provides health checks and diagnostic tools.

**Features:**
- **Service Health:** Check health status of all edge services
- **Connectivity Tests:** Test connectivity to cloud ingestion
- **Diagnostics Export:** Download full system diagnostics bundle

**Service Health Check:**
- Calls `GET /api/health` on each service
- Displays: ✅ Healthy / ⚠️ Unhealthy
- Includes service name, status, and response time

**Connectivity Tests:**
- Cloud Ingestion: `GET /api/v1/sync/diagnostics/cloud`
- Displays: ✅ Success / ❌ Failed

**Diagnostics Export:**
- Aggregates data from all services
- Includes:
  - System status and uptime
  - Resource usage (CPU, memory, disk)
  - Data counts (telemetry, media, inference)
  - Sync state (backlog, DLQ)
  - Service health results
- Download as text file for support

---

## Metrics Sources

All metrics displayed in Edge Ops Web come from actual database queries via REST APIs. No mock data is used.

### Backend API Endpoints

#### Telemetry Service (`edge-telemetry-timeseries`)

**File:** `edge-telemetry-timeseries/src/controllers/telemetryController.ts`

**Stats Endpoint:**
```http
GET /api/v1/telemetry/stats?tenant_id=<tenant-id>
Headers:
  x-tenant-id: <tenant-id>
```

**Response:**
```json
{
  "total_readings": 1247,
  "total_aggregates": 234,
  "last_reading_at": "2025-12-31T08:45:23.456Z",
  "tenant_id": "t-001"
}
```

**UI Integration:**
- API Method: `edgeOpsApi.getTelemetryStats()`
- React Query: `['telemetry-stats', tenantId]`
- Refetch Interval: 5 seconds

#### Media Store Service (`edge-media-store`)

**File:** `edge-media-store/src/routes/index.ts`

**Stats Endpoint:**
```http
GET /api/v1/media/stats
Headers:
  x-tenant-id: <tenant-id>
```

**Response:**
```json
{
  "total_objects": 89,
  "total_size_mb": 234.5,
  "last_created_at": "2025-12-31T09:15:12.789Z",
  "tenant_id": "t-001"
}
```

**UI Integration:**
- API Method: `edgeOpsApi.getMediaStats()`
- React Query: `['media-stats', tenantId]`
- Refetch Interval: 5 seconds

#### Vision Inference Service (`edge-vision-inference`)

**File:** `edge-vision-inference/app/api/v1/endpoints.py`

**Stats Endpoint:**
```http
GET /api/v1/inference/stats
Headers:
  x-tenant-id: <tenant-id>
```

**Response:**
```json
{
  "total_results": 42,
  "last_result_at": "2025-12-31T10:30:45.123Z",
  "tenant_id": "t-001"
}
```

**UI Integration:**
- API Method: `edgeOpsApi.getVisionStats()`
- React Query: `['vision-stats', tenantId]`
- Refetch Interval: 5 seconds

#### Observability Agent (`edge-observability-agent`)

**Status Endpoint:**
```http
GET /api/v1/ops/edge/status
```

**Response:**
```json
{
  "health": {
    "status": "healthy",
    "uptime": 86400,
    "version": "1.0.0"
  },
  "resources": {
    "cpuUsage": 45.2,
    "memoryUsage": 62.5,
    "diskUsage": {
      "usedPercent": 35.8,
      "freeGb": 125.5
    }
  },
  "sync": {
    "pendingCount": 45,
    "dlqCount": 8,
    "lastSyncAt": "2025-12-31T11:20:15.789Z"
  }
}
```

**UI Integration:**
- API Method: `edgeOpsApi.getStatus()`
- React Query: `['edge-status']`
- Refetch Interval: 5 seconds

#### Sync Forwarder (`edge-sync-forwarder`)

**State Endpoint:**
```http
GET /api/v1/sync/state
```

**Response:**
```json
{
  "pending": 45,
  "claimed": 10,
  "sending": 5,
  "acked": 12345,
  "failed": 2,
  "dlq_count": 8,
  "last_success_at": "2025-12-31T11:20:15.789Z",
  "last_error": null,
  "oldest_pending_at": "2025-12-31T10:15:30.000Z"
}
```

**UI Integration:**
- API Method: `edgeOpsApi.getSyncState()`
- React Query: `['sync-state']`
- Refetch Interval: 5 seconds

#### Ingress Gateway (`edge-ingress-gateway`)

**Stats Endpoint:**
```http
GET /api/v1/ingress/stats
```

**Response:**
```json
{
  "messages_processed": 123456,
  "messages_per_second": 15.2,
  "last_message_at": "2025-12-31T11:30:45.789Z",
  "dedupe_hit_rate": 0.05
}
```

**UI Integration:**
- API Method: `edgeOpsApi.getIngressStats()`
- React Query: `['ingress-stats']`
- Refetch Interval: 5 seconds

---

## API Client Implementation

**File:** `edge-ops-web/src/api/client.ts`

The API client handles service URL resolution based on connection profile and authentication headers.

### URL Resolution

```typescript
function getServiceUrl(serviceName: string, context?: ApiContext): string {
  const profile = context?.connectionProfile || 'local';
  const edgeHost = context?.edgeHost || '192.168.1.50';

  switch (profile) {
    case 'local':
      return `http://localhost:${SERVICE_PORTS[serviceName]}`;
    case 'cluster':
      return `/svc/${SERVICE_PATHS[serviceName]}`;
    case 'edge-device':
      return `http://${edgeHost}:${SERVICE_PORTS[serviceName]}`;
    default:
      throw new Error(`Unknown profile: ${profile}`);
  }
}
```

### Authentication Headers

```typescript
function getAuthHeaders(context?: ApiContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-tenant-id': context?.tenantId || 't-001',
    'x-trace-id': generateUUID(),
  };

  if (context?.authMode === 'api-key' && context?.apiKey) {
    headers['x-api-key'] = context.apiKey;
  }

  if (context?.authMode === 'hmac' && context?.hmacSecret) {
    headers['x-signature'] = generateHMACSignature(context.hmacSecret);
  }

  return headers;
}
```

### Example: Fetching Telemetry Stats

```typescript
const getTelemetryStats = async (context?: ApiContext): Promise<TelemetryStats> => {
  const baseUrl = getServiceUrl('EDGE_TELEMETRY_TIMESERIES', context);
  const headers = getAuthHeaders(context);

  const response = await http.get<TelemetryStatsResponse>(
    `${baseUrl}/api/v1/telemetry/stats`,
    { headers }
  );

  return {
    totalReadings: response.total_readings || 0,
    lastReadingAt: response.last_reading_at,
  };
};
```

---

## Environment Variables Reference

### Required Variables

| Variable | Purpose | Default (Dev) | Production |
|----------|---------|-----------------|-------------|
| `VITE_TENANT_ID` | Tenant ID for API calls | `t-001` | Set per deployment |
| `VITE_CONNECTION_PROFILE` | Connection mode | `local` | `cluster` or `edge-device` |
| `VITE_AUTH_MODE` | Authentication mode | `none` | `api-key` or `hmac` |

### Optional Variables (Auth-Specific)

| Variable | Purpose | Default | When to Use |
|----------|---------|---------|-------------|
| `VITE_EDGE_HOST` | Edge device IP address | `192.168.1.50` | `edge-device` profile |
| `VITE_API_KEY` | API key for authentication | (empty) | `api-key` auth mode |
| `VITE_HMAC_SECRET` | HMAC signing secret | (empty) | `hmac` auth mode |

### Service URL Variables (Optional Overrides)

| Variable | Default | Use Case |
|----------|---------|-----------|
| `VITE_INGRESS_GATEWAY_URL` | `http://edge-ingress-gateway:3000` | Override ingress URL |
| `VITE_TELEMETRY_URL` | `http://edge-telemetry-timeseries:3000` | Override telemetry URL |
| `VITE_WEIGHVISION_URL` | `http://edge-weighvision-session:3000` | Override weighvision URL |
| `VITE_MEDIA_URL` | `http://edge-media-store:3000` | Override media URL |
| `VITE_VISION_URL` | `http://edge-vision-inference:8000` | Override vision URL |
| `VITE_SYNC_URL` | `http://edge-sync-forwarder:3000` | Override sync URL |
| `VITE_OBSERVABILITY_URL` | `http://edge-observability-agent:3000` | Override observability URL |
| `VITE_POLICY_SYNC_URL` | `http://edge-policy-sync:3000` | Override policy sync URL |
| `VITE_FEED_INTAKE_URL` | `http://edge-feed-intake:5109` | Override feed intake URL |

---

## Docker Compose Configuration

**File:** `docker-compose.dev.yml` (development overrides)

```yaml
edge-ops-web:
  build:
    context: ./edge-ops-web
    dockerfile: Dockerfile
  container_name: farmiq-edge-ops-web
  ports:
    - "5113:80"
  environment:
    - VITE_TENANT_ID=${VITE_TENANT_ID:-t-001}
    - VITE_CONNECTION_PROFILE=${VITE_CONNECTION_PROFILE:-local}
    - VITE_EDGE_HOST=${VITE_EDGE_HOST:-192.168.1.50}
    - VITE_AUTH_MODE=${VITE_AUTH_MODE:-none}
    - VITE_API_KEY=${VITE_API_KEY:-}
    - VITE_HMAC_SECRET=${VITE_HMAC_SECRET:-}
    - VITE_INGRESS_GATEWAY_URL=${VITE_INGRESS_GATEWAY_URL:-http://edge-ingress-gateway:3000}
    - VITE_TELEMETRY_URL=${VITE_TELEMETRY_URL:-http://edge-telemetry-timeseries:3000}
    - VITE_WEIGHVISION_URL=${VITE_WEIGHVISION_URL:-http://edge-weighvision-session:3000}
    - VITE_MEDIA_URL=${VITE_MEDIA_URL:-http://edge-media-store:3000}
    - VITE_VISION_URL=${VITE_VISION_URL:-http://edge-vision-inference:8000}
    - VITE_SYNC_URL=${VITE_SYNC_URL:-http://edge-sync-forwarder:3000}
    - VITE_OBSERVABILITY_URL=${VITE_OBSERVABILITY_URL:-http://edge-observability-agent:3000}
    - VITE_POLICY_SYNC_URL=${VITE_POLICY_SYNC_URL:-http://edge-policy-sync:3000}
    - VITE_FEED_INTAKE_URL=${VITE_FEED_INTAKE_URL:-http://edge-feed-intake:5109}
  networks:
    - farmiq-net
  depends_on: []  # Dev override: no dependencies for standalone startup
```

---

## Troubleshooting

### UI Shows Loading Spinner

**Symptom:** Metrics show loading indefinitely.

**Diagnosis:**
```bash
curl http://localhost:5113/svc/ops/api/v1/ops/edge/status
```

**Solutions:**
- Verify all backend services are healthy
- Check `VITE_CONNECTION_PROFILE` matches your environment
- Check service base URLs in environment variables
- Check browser console for errors (F12)

### "Failed to Fetch" Errors

**Symptom:** Metrics show error message or failed to fetch.

**Diagnosis:**
```bash
# Test each service individually
curl http://localhost:5104/api/v1/telemetry/stats?tenant_id=t-001
curl http://localhost:5106/api/v1/media/stats
curl http://localhost:5107/api/v1/inference/stats
curl http://localhost:5108/api/v1/sync/state
```

**Solutions:**
- Verify services are running: `docker compose ps`
- Check service logs: `docker compose logs <service-name>`
- Verify ports are accessible (no firewall blocking)
- Check authentication mode and credentials

### CORS Errors

**Symptom:** Browser console shows CORS errors.

**Solution:**
- Ensure using proxy paths (`/svc/...`) in cluster profile
- Check `edge-ops-web/server.js` proxy configuration
- Verify backend services have correct CORS headers (should be internal-only)

### Data Shows "Never" or Zero

**Symptom:** Metrics show "Never" for timestamps or 0 for counts.

**Diagnosis:**
```bash
# Check if database has data
docker exec farmiq-edge-postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM telemetry_raw;"
docker exec farmiq-edge-postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM media_objects;"
docker exec farmiq-edge-postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM inference_results;"
```

**Solutions:**
- Database may be empty (need to seed test data)
- Check if services are successfully writing to database
- Review service logs for database write errors

---

## Evidence and Implementation Details

For detailed implementation information, see:
- [../progress/edge-ops-realdata.md](../progress/edge-ops-realdata.md) - Full implementation report with API endpoints, UI integration, and testing details

**Key Implementation Points (from edge-ops-realdata.md):**
- ✅ All metrics come from actual database queries via REST APIs
- ✅ No mock data used in production UI
- ✅ Three connection modes implemented (local/cluster/edge-device)
- ✅ Authentication support (tenant ID, API key, HMAC)
- ✅ Real-time updates with 5-second refetch interval
- ✅ Loading states and error handling for all queries
- ✅ Tenant-scoped stats endpoints on backend services

---

## Links

- [00-overview.md](00-overview.md) - Architecture overview and data flows
- [01-services.md](01-services.md) - Service table with ports, dependencies, endpoints
- [02-setup-run.md](02-setup-run.md) - How to run compose, env vars, troubleshooting
- [Evidence](../progress/edge-ops-realdata.md) - Real data integration details
- [Evidence](../progress/edge-compose-verify.md) - Verified compose run results

