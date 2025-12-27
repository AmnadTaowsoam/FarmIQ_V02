Purpose: Documentation inventory and “truth sources” map for FarmIQ.  
Owner: FarmIQ Docs Steward  
Last updated: 2025-12-27  

---

# DOC Inventory (2025-12-27)

## Docs folder tree (depth 2)

```
docs/
  00-START-HERE.md
  00-index.md
  README.md
  STATUS.md
  ROADMAP.md
  DECISIONS.md
  audits/
  cloud-layer/
  compliance/
  contracts/
  dev/
  edge-layer/
  evidence/
  iot-layer/
  master_data/
  progress/
  shared/
  _templates/
  _archive/
```

## Top-level entrypoints (read first)

1) `docs/00-START-HERE.md` — fastest “what to read / how to run”
2) `docs/STATUS.md` — service list + current implementation status
3) `docs/00-index.md` — full navigation map
4) `docs/shared/00-api-catalog.md` — API catalog (single source of truth for endpoints)
5) `docs/shared/01-api-standards.md` — standards (base path, errors, correlation)
6) Evidence:
   - `docs/evidence/README.md`
   - `docs/evidence/NOTIFICATIONS_EVIDENCE.md`
   - `docs/evidence/INSIGHTS_EVIDENCE.md`

## “Truth sources” (what to trust when docs disagree)

### Service inventory / ports

- Cloud compose wiring (dev): `cloud-layer/docker-compose.dev.yml`
- Cloud compose baseline: `cloud-layer/docker-compose.yml`
- Service status list: `docs/STATUS.md`
- Dashboard-web dev port + BFF proxy target: `apps/dashboard-web/vite.config.ts`

### API “what exists”

- Service routes/controllers (Node):
  - e.g. `cloud-layer/cloud-notification-service/src/routes/notificationRoutes.ts`
- FastAPI routers (Python):
  - e.g. `cloud-layer/cloud-analytics-service/app/insights_routes.py`
  - e.g. `cloud-layer/cloud-llm-insights-service/app/routes.py`
- BFF router registration:
  - `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`
- OpenAPI UI/config (per service):
  - Node: `GET /api-docs` (swagger middleware)
  - FastAPI: `docs_url="/api-docs"` in `app/main.py`

### Frontend API usage

- Axios client injection (auth, tenant, request id): `apps/dashboard-web/src/api/http.ts`
- Notifications client/hook usage:
  - `apps/dashboard-web/src/api/notifications.ts`
  - `apps/dashboard-web/src/hooks/useNotifications.ts`

## Stale/outdated suspects (conflicts with code/compose)

These files have historically referenced ports/routes that changed; verify against compose + code before using them as “current truth”:
- `docs/progress/REPO-AUDIT-cloud-edge.md` (mixed references to localhost ports; may reflect earlier runs)
- Older progress docs that mention dashboard-web at `http://localhost:5130` (now `5142` per `apps/dashboard-web/vite.config.ts`)

If a document becomes actively misleading, move it to `docs/_archive/<YYYY-MM-DD>/` and leave a redirect note in its original location (policy: “do not delete docs”).

## Known current gaps (tracked in roadmap/audit)

- BFF-only principle for insights: BFF insights proxy routes may be planned but not implemented yet.
- Insight notification deep link target may require FE route alignment.

Related audit:
- `docs/progress/insights-notifications-audit.md`

