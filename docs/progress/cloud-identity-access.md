# Service Progress: cloud-identity-access

**Service**: `cloud-identity-access`  
**Layer**: `cloud`  
**Status**: `done`  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Authentication and authorization service for FarmIQ. Responsible for user management, JWT issuance (OIDC-lite), and RBAC enforcement.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 OK`
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints
- `POST /api/v1/auth/login` → Authenticate user and return JWT tokens.
- `POST /api/v1/auth/refresh` → Refresh access token using a refresh token.
- `GET /api/v1/users/me` → Get currently authenticated user profile.

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://${POSTGRES_USER:-farmiq}:${POSTGRES_PASSWORD:-farmiq_dev}@postgres:5432/${POSTGRES_DB:-farmiq}
DD_SERVICE=cloud-identity-access
DD_ENV=development

# Service-specific
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret-key
```

---

## Docker Build & Run

```bash
# Build
docker compose build cloud-identity-access

# Run
docker compose up cloud-identity-access
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5120/api/health
# Expected: 200 OK
```

### API Documentation
```powershell
# Open in browser
start http://localhost:5120/api-docs
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] `/api/health` returns 200
- [x] `/api-docs` accessible
- [x] Winston/JSON logging configured
- [x] Datadog tracing configured
- [x] Database schema defined (User, Role models)
- [x] Environment variables documented
- [x] Docker build succeeds (verified via task)
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] Basic endpoints implemented (login, refresh, me)
- [x] Tests written (minimal placeholders for Round 1)
- [x] Progress documented in this file

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings
- `docs/shared/01-api-standards.md` - API standards
- `docs/STATUS.md` - Overall project status
