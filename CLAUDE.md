# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FarmIQ is a three-layer IoT agricultural management platform built as an event-driven distributed system with multi-tenancy support. It's a TypeScript/Node.js + Python monorepo using pnpm workspaces.

## Architecture

```
IoT Layer (devices) → MQTT → Edge Layer (local processing) → HTTPS → Cloud Layer (SaaS)
                                                                         ↓
                                                                    Frontend Apps
```

**Edge Layer**: Local Kubernetes services handling MQTT ingestion, telemetry storage, ML inference, and cloud sync
**Cloud Layer**: Multi-tenant SaaS with PostgreSQL, RabbitMQ, identity/access, domain services
**Frontend**: React 18 + Vite + MUI dashboards

## Tech Stack

- **Node Services**: Node 24, Express, TypeScript, Prisma, Winston logging, Jest
- **Python Services**: Python 3.11, FastAPI, asyncpg, pytest
- **Frontend**: React 18, Vite, MUI 6, Redux Toolkit, Vitest, Playwright
- **Infrastructure**: Docker Compose, PostgreSQL 16, RabbitMQ 3.13, Datadog

## Common Commands

### Development Environment

```powershell
# Start all services
.\scripts\dev-up.ps1

# Stop all services
.\scripts\dev-down.ps1

# View logs
docker compose logs -f <service-name>
```

### Node.js Services (in service directory)

```bash
npm run dev          # Dev with hot reload
npm run build        # Build TypeScript
npm run test         # Run Jest tests
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run migrate:up   # Prisma migrations
```

### Python Services (in service directory)

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest               # Run tests
pytest --cov=app     # With coverage
```

### Frontend (apps/dashboard-web)

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run typecheck    # TypeScript check
```

### Monorepo

```bash
pnpm install                           # Install all dependencies
pnpm -C <path/to/package> add <pkg>    # Add dependency to specific package
pnpm contracts:generate                # Generate TypeScript types from OpenAPI
pnpm api:generate                      # Generate API client
```

## Port Reference

| Service | Port | Notes |
|---------|------|-------|
| Edge Ingress Gateway | 5103 | Main edge API |
| Edge Telemetry | 5104 | |
| Edge Vision Inference | 5107 | Python/ML |
| Cloud API Gateway BFF | 5125 | Main cloud API |
| Cloud LLM Insights | 5134 | Python |
| Dashboard Web | 5130 | React frontend |
| PostgreSQL | 5140 | |
| RabbitMQ AMQP | 5150 | |
| RabbitMQ Management | 5151 | |

## API Conventions

All services expose:
- `GET /api/health` - Health check (returns 200)
- `GET /api-docs` - Swagger/OpenAPI documentation

Error response format:
```json
{"error": {"code": "ERROR_CODE", "message": "...", "traceId": "uuid"}}
```

Request tracing headers: `x-request-id`, `x-trace-id`

## Workspace Structure

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"           # Frontend (dashboard-web, admin-web)
  - "cloud-layer/*"    # Cloud services (17 services)
  - "edge-layer/*"     # Edge services (13 services)
  - "packages/*"       # Shared (contracts, farmiq-api-client)
```

## Documentation

- [docs/STATUS.md](docs/STATUS.md) - Service status and progress (read-only, Doc Captain only)
- [docs/progress/](docs/progress/) - Per-service progress tracking
- [docs/shared/openapi/cloud-bff.yaml](docs/shared/openapi/cloud-bff.yaml) - Main OpenAPI spec
- [docs/shared/02-service-registry.md](docs/shared/02-service-registry.md) - Complete port mapping

## Key Patterns

**Logging**: All services use JSON structured logging (Winston for Node, python-json-logger for Python)

**Database**: Prisma ORM for Node services, asyncpg for Python. Migrations in `prisma/` directory.

**Docker**: Multi-stage builds with development/build/production targets. Health checks required.

**Compose Profiles**: `infra`, `edge`, `cloud`, `ui` - start specific layers with `--profile`
