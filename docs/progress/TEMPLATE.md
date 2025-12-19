# Service Progress Template

**Service**: `<service-name>`  
**Layer**: `<edge|cloud|ui>`  
**Status**: `<not-started|in-progress|blocked|done>`  
**Owner**: `<developer-name>`  
**Last Updated**: `<date>`

---

## Overview

Brief description of the service and its responsibilities.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK` (or `{"status": "healthy"}` for Python)
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `GET /api/v1/...` → Description
- `POST /api/v1/...` → Description
- (List all endpoints)

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@postgres:5432/db
DD_SERVICE=<service-name>
DD_ENV=development

# Service-specific
CUSTOM_VAR=value
```

---

## Docker Build & Run

```bash
# Build
docker build -t <service-name> ./services/<layer>/<service-name>

# Run (standalone for testing)
docker run -p <host-port>:<container-port> \
  -e DATABASE_URL=... \
  <service-name>

# Or use docker-compose
docker compose --profile <profile> up <service-name> --build

# Note: Services are located in:
# - edge-layer/<service-name> for edge services
# - cloud-layer/<service-name> for cloud services
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:<port>/api/health
# Expected: 200 OK
```

### API Documentation
```powershell
# Open in browser
start http://localhost:<port>/api-docs
```

### Logs
```powershell
docker logs <container-name> -f
# Should show Winston JSON logs (Node) or JSON logs (Python)
```

### Database Connection
```powershell
# If using Prisma
docker exec <container-name> npx prisma studio
# Or direct psql
docker exec -it farmiq-postgres psql -U farmiq -d farmiq
```

---

## Progress Checklist

- [ ] Service scaffolded from boilerplate
- [ ] `/api/health` returns 200
- [ ] `/api-docs` accessible
- [ ] Winston/JSON logging configured
- [ ] Datadog tracing configured (if applicable)
- [ ] Database schema defined (if applicable)
- [ ] Environment variables documented
- [ ] Docker build succeeds
- [ ] Service starts in docker-compose
- [ ] Health check passes
- [ ] Basic endpoints implemented
- [ ] Tests written (if applicable)
- [ ] Progress documented in this file

---

## Notes

- Any blockers, decisions, or implementation notes
- Links to related documentation
- Known issues or TODOs

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings
- `docs/shared/01-api-standards.md` - API standards
- `docs/STATUS.md` - Overall project status

