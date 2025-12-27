Purpose: Summary of documentation changes performed on 2025-12-27.  
Owner: FarmIQ Docs Steward  
Last updated: 2025-12-27  

---

# Doc Update Summary (2025-12-27)

## Files created

- Entrypoints:
  - `docs/00-START-HERE.md`
  - `docs/ROADMAP.md`
  - `docs/DECISIONS.md`
- Service docs (cloud):
  - `docs/cloud-layer/cloud-api-gateway-bff.md`
  - `docs/cloud-layer/cloud-analytics-service.md`
  - `docs/cloud-layer/cloud-llm-insights-service.md`
  - `docs/cloud-layer/cloud-notification-service.md`
- Contracts:
  - `docs/contracts/cloud-api-gateway-bff.contract.md`
  - `docs/contracts/cloud-notification-service.contract.md`
- Evidence:
  - `docs/evidence/NOTIFICATIONS_EVIDENCE.md`
  - `docs/evidence/INSIGHTS_EVIDENCE.md`
- Dev/Ops:
  - `docs/dev/LOCAL_DEV_GUIDE.md`
  - `docs/cloud-layer/RUNBOOKS.md`
- Templates + archive:
  - `docs/_templates/service.md`
  - `docs/_templates/contract.md`
  - `docs/_templates/evidence.md`
  - `docs/_archive/2025-12-27/README.md`
- Audits:
  - `docs/audits/DOC_INVENTORY_2025-12-27.md`

## Files updated

- Index/README:
  - `docs/00-index.md`
  - `docs/README.md`
- Evidence index:
  - `docs/evidence/README.md`
- Service registry (ports):
  - `docs/shared/02-service-registry.md`
- Dev guide:
  - `docs/dev/01-running-locally.md`
- Contracts index:
  - `docs/contracts/README.md`

## Files moved (archived)

- `docs/cloud-layer/fe-staus.md` → `docs/_archive/2025-12-27/fe-staus.md`
  - Replaced with redirect stub at original path.

## Key changes (what’s now consistent)

- Added “Start Here”, “Roadmap”, and “Decisions” pages and linked them from the index.
- Added evidence pages for notifications and insights with curl-based verification steps.
- Added contract docs for notification service and BFF notification endpoints.
- Updated service registry and dev docs to align dashboard-web dev port with `apps/dashboard-web/vite.config.ts` and avoid conflicts with docker-compose ports.

## Conflicts found (docs vs code)

- Dashboard-web dev port mismatch existed across docs; source-of-truth is now `apps/dashboard-web/vite.config.ts`.
- Some older progress/audit docs may still reference earlier port assumptions; treat them as historical.

## Follow-up TODOs (next phase)

- Align “insights via BFF” implementation to fully meet the BFF-only principle (add BFF insights proxy routes and update FE usage).
- Confirm and document deep link route for insight notifications (notification payload link vs FE route).
- Decide and document unread/read semantics (notification service does not yet implement read tracking).

