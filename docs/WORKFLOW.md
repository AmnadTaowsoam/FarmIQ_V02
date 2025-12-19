Purpose: Define the multi-AI development workflow for FarmIQ to prevent collisions and ensure quality.  
Scope: Task selection, locking, implementation, evidence submission, and progress tracking.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-18  

---

## Workflow Overview

This workflow ensures multiple AI assistants can work on FarmIQ services without conflicts:

1. **Pick a task** from `docs/STATUS.md`
2. **Lock the service** in `docs/STATUS.md`
3. **Implement** the service following the Definition of Done
4. **Submit evidence** in `docs/progress/<service>.md`
5. **Mark complete** in `docs/STATUS.md` (Doc Captain only)

---

## Step 1: Pick a Task

### Where to Find Tasks

1. **Service List** in `docs/STATUS.md`:
   - Services marked as `not-started` or `in-progress` are available
   - Check the "Status" column

2. **Detailed TODO Checklists** in `docs/STATUS.md`:
   - Each service has a detailed checklist under "Detailed TODO Checklists (MVP)"
   - These are the implementation tasks

### Task Selection Rules

- **One AI = One Service**: Each AI assistant should work on one service at a time
- **Check Locks**: Verify no other AI has locked the service (see "Locks/Reservations" table)
- **Respect Dependencies**: Start with infrastructure (`edge-mqtt-broker`), then dependencies (`edge-ingress-gateway` before services that depend on it)

---

## Step 2: Lock the Service

### How to Lock

1. **Update `docs/STATUS.md`**:
   - Add your entry to the "Locks/Reservations" table:
     ```markdown
     | edge-ingress-gateway | Edge | Locked | AI Assistant Name | Starting implementation |
     ```
   - Update the service status to `in-progress` in the "Service List" table

2. **Lock Expiry**:
   - Locks expire after **24 hours** of inactivity
   - If you're blocked, update the lock with a note: `Blocked: waiting for edge-mqtt-broker`
   - Release the lock if you're switching to a different task

### Lock Format

```markdown
| Service Name | Layer | Status | Reserved By | Notes |
|---|---|---|---|---|
| edge-ingress-gateway | Edge | Locked | AI Assistant | Starting implementation |
```

---

## Step 3: Implement the Service

### Follow the Definition of Done

Each service must meet these criteria (from `docs/STATUS.md`):

- [ ] **Build**: `docker build` succeeds without errors
- [ ] **Health**: `GET /api/health` returns `200 OK` (or `{"status": "healthy"}` for Python)
- [ ] **API Docs**: `GET /api-docs` serves OpenAPI/Swagger UI
- [ ] **Logs**: Winston JSON logs (Node) or JSON logs (Python) to stdout
- [ ] **Tracing**: Datadog tracing configured (if applicable)
- [ ] **Docker Compose**: Service starts successfully in docker-compose with correct profile
- [ ] **Progress Doc**: `docs/progress/<service>.md` created and updated

### Implementation Checklist

Follow the detailed checklist for your service in `docs/STATUS.md`:

1. **Scaffold** from the correct boilerplate:
   - Node services: `boilerplates/Backend-node`
   - Python services: `boilerplates/Backend-python`
   - Frontend: `boilerplates/Frontend`

2. **Update service configuration**:
   - Service name in `package.json` (Node) or `app/config.py` (Python)
   - Port configuration
   - Datadog service name (`DD_SERVICE`)

3. **Implement core functionality**:
   - Health endpoint (`GET /api/health`)
   - API documentation (`/api-docs`)
   - Business endpoints (per service design)

4. **Add observability**:
   - JSON structured logging
   - Datadog tracing (if applicable)
   - Correlation headers (`x-request-id`, `x-trace-id`)

5. **Test locally**:
   - Build Docker image
   - Start in docker-compose
   - Verify health endpoint
   - Test API endpoints

---

## Step 4: Submit Evidence

### Create Progress Document

Create `docs/progress/<service-name>.md` using `docs/progress/TEMPLATE.md`:

```markdown
# Service Progress: edge-ingress-gateway

**Service**: `edge-ingress-gateway`  
**Layer**: `edge`  
**Status**: `done`  
**Owner**: `AI Assistant Name`  
**Last Updated**: `2025-12-18`

## Overview

Brief description of what the service does.

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `GET /api/v1/ingress/stats` → Ingress statistics

## Environment Variables

- `APP_PORT=3000`
- `DATABASE_URL=postgresql://...`
- `MQTT_BROKER_URL=mqtt://edge-mqtt-broker:1883`

## Evidence

### Build
```bash
docker build -t edge-ingress-gateway ./edge-layer/edge-ingress-gateway
# Success
```

### Health Check
```bash
curl http://localhost:5103/api/health
# 200 OK
```

### API Docs
```bash
curl http://localhost:5103/api-docs
# Swagger UI accessible
```

### Docker Compose
```bash
docker compose --profile edge up -d edge-ingress-gateway
# Service started successfully
```

### Logs
```bash
docker compose logs edge-ingress-gateway
# JSON logs with traceId and requestId
```
```

### Evidence Requirements

Include:
- **Build output** (successful `docker build`)
- **Health check** (curl output showing `200 OK`)
- **API docs** (screenshot or curl output)
- **Docker Compose** (service starts successfully)
- **Logs** (sample showing JSON structure with `traceId`/`requestId`)

---

## Step 5: Mark Complete (Doc Captain Only)

**Only the Doc Captain** updates `docs/STATUS.md`:

1. **Update Service List**:
   - Change status from `in-progress` to `done`
   - Update "Health" and "API Docs" columns if applicable

2. **Release Lock**:
   - Remove entry from "Locks/Reservations" table

3. **Update CHANGELOG** (at end of `docs/STATUS.md`):
   ```markdown
   ## CHANGELOG
   
   ### 2025-12-18
   - **edge-ingress-gateway**: Completed implementation
     - Files: `edge-layer/edge-ingress-gateway/`, `docs/progress/edge-ingress-gateway.md`
   ```

---

## Workflow Rules

### Who Can Edit What

- **Doc Captain** edits:
  - `docs/STATUS.md`
  - `docs/shared/00-api-catalog.md`

- **Everyone else** writes to:
  - `docs/progress/<service-name>.md`
  - Service code in `edge-layer/` or `cloud-layer/`

### Conflict Resolution

- **Port conflicts**: Check `docs/shared/02-service-registry.md` before assigning ports
- **Service dependencies**: Verify dependencies are complete before starting dependent services
- **Lock conflicts**: If two AIs try to lock the same service, the first lock wins; second AI should pick a different service

### Quality Gates

Before marking a service as "done":
- All Definition of Done items must be checked
- Evidence must be provided in progress doc
- Service must start successfully in docker-compose
- Health endpoint must return `200 OK`
- API docs must be accessible

---

## Example Workflow

1. **AI Assistant A** picks `edge-ingress-gateway`:
   - Locks in `docs/STATUS.md`: `| edge-ingress-gateway | Edge | Locked | AI Assistant A | Starting implementation |`
   - Updates status: `| edge-ingress-gateway | edge | 5103 | - | - | in-progress | AI Assistant A |`

2. **AI Assistant A** implements:
   - Scaffolds from `boilerplates/Backend-node`
   - Implements MQTT consumer, validation, routing
   - Tests locally

3. **AI Assistant A** creates `docs/progress/edge-ingress-gateway.md`:
   - Documents endpoints
   - Includes evidence (build, health, logs)

4. **Doc Captain** reviews and updates `docs/STATUS.md`:
   - Marks service as `done`
   - Releases lock
   - Updates CHANGELOG

---

## References

- `docs/STATUS.md` - Service status and locks
- `docs/progress/TEMPLATE.md` - Progress document template
- `docs/shared/02-service-registry.md` - Port assignments
- `docs/shared/01-api-standards.md` - API standards

