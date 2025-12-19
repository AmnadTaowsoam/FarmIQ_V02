# FarmIQ Development Environment

This repository contains the FarmIQ multi-service development environment setup using docker-compose.

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

3. **Verify services are running:**
   ```powershell
   # Check health endpoints
   curl http://localhost:5103/api/health  # Edge ingress gateway
   curl http://localhost:5125/api/health  # Cloud API gateway BFF
   ```

4. **Stop all services:**
   ```powershell
   .\scripts\dev-down.ps1
   ```

## Service Structure

```
edge-layer/
  edge-ingress-gateway/      # MQTT ingress + routing (Node)
  edge-telemetry-timeseries/ # Telemetry storage (Node)
  edge-weighvision-session/  # Session management (Node)
  edge-media-store/          # Media storage (Node)
  edge-vision-inference/     # ML inference (Python)
  edge-sync-forwarder/       # Cloud sync (Node)
cloud-layer/
  cloud-identity-access/     # AuthN/AuthZ (Node)
  cloud-tenant-registry/     # Master data (Node)
  cloud-ingestion/           # Edge sync ingress (Node)
  cloud-telemetry-service/   # Telemetry queries (Node)
  cloud-analytics-service/   # Analytics (Python)
  cloud-api-gateway-bff/     # API gateway (Node)
apps/
  dashboard-web/             # React frontend
infra/
  mosquitto/                 # MQTT broker config (Mosquitto)
```

## Port Mapping

See `docs/shared/02-service-registry.md` for complete port mapping.

- **Infrastructure**: 5140-5151 (PostgreSQL, RabbitMQ)
- **Edge Services**: 5100-5108
- **Cloud Services**: 5120-5125
- **Frontend**: 5130

## Docker Compose Profiles

Services are organized into profiles:

- `infra`: Infrastructure (postgres, rabbitmq)
- `edge`: Edge layer services
- `cloud`: Cloud layer services
- `ui`: Frontend dashboard

Start specific profiles:
```powershell
docker compose --profile infra up -d
docker compose --profile edge up -d --build
```

## Health Checks

All services expose `/api/health`:
- Node services: `GET /api/health` → `200 OK`
- Python services: `GET /api/health` → `200 {"status": "healthy"}` (also `/health` for compatibility)

## API Documentation

All services expose OpenAPI/Swagger at `/api-docs`:
- Node services: http://localhost:<port>/api-docs
- Python services: http://localhost:<port>/api-docs (FastAPI)

## Development Workflow

1. **Service Development:**
   - Each service is scaffolded from boilerplates in `boilerplates/`
   - Update service code in `edge-layer/<service-name>/` or `cloud-layer/<service-name>/`
   - Document progress in `docs/progress/<service>.md`

2. **Documentation:**
   - Only Doc Captain edits `docs/STATUS.md` and `docs/shared/00-api-catalog.md`
   - All other progress goes to `docs/progress/<service>.md`
   - See `docs/progress/TEMPLATE.md` for progress doc format

3. **Testing:**
   - Build: `docker compose build <service-name>`
   - Run: `docker compose up <service-name>`
   - Logs: `docker compose logs -f <service-name>`

## Environment Variables

See `.env.example` for required environment variables. Key variables:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `RABBITMQ_USER`, `RABBITMQ_PASS`
- `DD_SERVICE`, `DD_ENV` (Datadog)

## Compliance Requirements

All services must comply with:
- `/api/health` endpoint (required)
- `/api-docs` endpoint (required)
- Winston JSON logs (Node) or JSON logs (Python)
- Datadog tracing (if applicable)
- See `docs/compliance/` for full requirements

## Troubleshooting

**Services won't start:**
- Check if ports are already in use
- Verify `.env` file exists
- Check docker logs: `docker compose logs <service-name>`

**Health checks failing:**
- Wait a few seconds for services to initialize
- Check service logs for errors
- Verify database/rabbitmq connectivity

**Build failures:**
- Ensure all boilerplate files were copied correctly
- Check Dockerfile syntax
- Verify package.json/requirements.txt are valid

## Next Steps

1. Review `docs/STATUS.md` for service implementation status
2. Check `docs/shared/02-service-registry.md` for service URLs
3. Start implementing services following `docs/progress/TEMPLATE.md`

