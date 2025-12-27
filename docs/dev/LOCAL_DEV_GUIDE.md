Purpose: Practical local dev guide (docker compose + common issues + smoke steps).  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27  

---

# Local Dev Guide

## Run the stack (cloud-layer)

Primary references:
- `docs/dev/01-running-locally.md`
- `cloud-layer/docker-compose.yml`
- `cloud-layer/docker-compose.dev.yml`

Typical:
```bash
docker compose -f cloud-layer/docker-compose.yml -f cloud-layer/docker-compose.dev.yml up -d
```

## Useful ports (dev compose)

See `docs/STATUS.md` for the full list. Common ones:
- BFF: `http://localhost:5125/api/health` + `http://localhost:5125/api-docs`
- Notification service: `http://localhost:5128/api-docs`
- Analytics service: `http://localhost:5124/api-docs`
- LLM insights service: `http://localhost:5134/api-docs`
- Dashboard web: `http://localhost:5142`

## Auth + tenant context

- Frontend sends:
  - `Authorization: Bearer <jwt>`
  - `x-request-id`
  - tenant context (`x-tenant-id` header + `tenantId` query for GETs)
  - Source: `apps/dashboard-web/src/api/http.ts`

## Smoke checks

- Compose sanity: `cloud-layer/scripts/verify-compose.ps1` or `cloud-layer/scripts/verify-compose.sh`
- Dashboard pages: `cloud-layer/scripts/verify-dashboard-pages.ps1`
- Evidence scripts:
  - `docs/evidence/NOTIFICATIONS_EVIDENCE.md`
  - `docs/evidence/INSIGHTS_EVIDENCE.md`

## Common issues

- **Missing tenantId**: many endpoints require tenant scope; ensure `tenantId` query is present for notifications.
- **Auth disabled in dev**: some services allow dev-mode requests, but production requires JWT.
- **304 responses / stale cache**: BFF disables ETags for `/api/*` responses; FE also sets `Cache-Control: no-store` on GETs.

Back to index: `docs/00-index.md`

