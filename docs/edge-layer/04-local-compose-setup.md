Purpose: Local docker-compose setup for FE/ops users of the Edge layer.  
Scope: Starting the stack, ports, and how Edge Ops Web reaches “real APIs” via `/svc/*` proxies.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-31  

---

## Local quickstart (Docker Compose)

### Prerequisites

- Docker Desktop (or Docker Engine) with Compose v2
- Ports available on your machine (see the port map below)

### Start the stack

From repo root:

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Stop the stack

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Reset state (optional)

This removes Postgres/MinIO volumes and will delete local data.

```bash
cd edge-layer
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

---

## Ports and URLs (local)

### Ops UI

- Edge Ops Web (recommended): `http://localhost:5110`
  - When running with both compose files, `5113` may also be bound to the same container: `http://localhost:5113`

### Core HTTP services (host → container)

| Service | Host port | Container port | Notes |
|---|---:|---:|---|
| edge-ingress-gateway | 5103 | 3000 | API docs: `/api-docs` |
| edge-telemetry-timeseries | 5104 | 3000 | DB-backed telemetry; API docs: `/api-docs` |
| edge-weighvision-session | 5105 | 3000 | API docs: `/api-docs` |
| edge-media-store | 5106 | 3000 | Uses MinIO; API docs: `/api-docs` |
| edge-vision-inference | 5107 | 8000 | FastAPI docs: `/api-docs` |
| edge-sync-forwarder | 5108 | 3000 | Sync/outbox admin APIs |
| edge-policy-sync | 5109 | 3000 | Cloud policy caching |
| edge-feed-intake | 5112 | 5109 | Local feed intake (DB-backed) |
| edge-observability-agent | 5111 | 3000 | Aggregated health/status for ops UI |
| edge-retention-janitor | 5115 | 3000 | When both compose files run, `5114` may also be bound |

### Infrastructure (local)

| Component | Host port(s) | Notes |
|---|---:|---|
| Postgres | 5141 | `postgres://farmiq:farmiq_dev@localhost:5141/farmiq` |
| MinIO API | 9000 | S3-compatible endpoint |
| MinIO Console | 9001 | UI login default: `minioadmin` / `minioadmin` |
| MQTT Broker | 5100 | MQTT TCP (1883) |
| Cloud ingestion mock | (no host port) | Internal only (compose network) |

---

## How Edge Ops Web uses “real APIs”

`edge-ops-web` is shipped with an embedded Node server (`edge-layer/edge-ops-web/server.js`) that proxies:

- `/svc/ingress/*` → `edge-ingress-gateway`
- `/svc/telemetry/*` → `edge-telemetry-timeseries`
- `/svc/weighvision/*` → `edge-weighvision-session`
- `/svc/media/*` → `edge-media-store`
- `/svc/vision/*` → `edge-vision-inference`
- `/svc/sync/*` → `edge-sync-forwarder`
- `/svc/ops/*` → `edge-observability-agent`
- `/svc/policy/*` → `edge-policy-sync`
- `/svc/janitor/*` → `edge-retention-janitor`
- `/svc/feed/*` → `edge-feed-intake`

This means the browser can call `http://localhost:5110/svc/...` and get real service responses without CORS issues.

---

## Quick verification commands

```bash
# Ops UI reachable
curl -I http://localhost:5110/

# Aggregated edge status (from real services)
curl http://localhost:5110/svc/ops/api/v1/ops/edge/status

# Telemetry metrics + DB-backed readings (real DB data)
curl http://localhost:5110/svc/telemetry/api/v1/telemetry/metrics
curl "http://localhost:5110/svc/telemetry/api/v1/telemetry/readings?tenant_id=t-001&limit=2"

# Vision inference health/ready
curl http://localhost:5107/api/health
curl http://localhost:5107/api/ready
```

