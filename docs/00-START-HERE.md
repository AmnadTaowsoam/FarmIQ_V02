Purpose: Fast entry point for FarmIQ documentation (read-first).  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27  

---

# Start Here (FarmIQ)

FarmIQ is a **multi-tenant livestock intelligence platform**. It ingests sensor/vision data from farms, processes it on **edge clusters**, and serves dashboards + analytics from the **cloud**.

## Quick start (local dev)

- Primary “run locally” guide: `docs/dev/01-running-locally.md`
- Common env notes: `docs/dev/02-env-vars.md`
- Fast dev compose checks: `cloud-layer/scripts/verify-compose.ps1` and `cloud-layer/scripts/verify-compose.sh`

## Service list / current status

- Canonical service status and ports: `docs/STATUS.md`
- Cloud service inventory and boundaries: `docs/cloud-layer/01-cloud-services.md`

## How dashboard-web talks to backend (BFF principle)

- **Rule**: `dashboard-web` calls **only** `cloud-api-gateway-bff` for dashboard features (no direct calls to internal services).
- Dashboard docs: `docs/cloud-layer/02-dashboard.md`
- BFF contract reference: `docs/cloud-layer/dashboard/04-bff-api-contracts.md`

## APIs and contracts

- API catalog (single catalog across services): `docs/shared/00-api-catalog.md`
- API standards (base path, error shape, correlation headers): `docs/shared/01-api-standards.md`
- Contracts (service-by-service): `docs/contracts/`

## Evidence / demos

- Evidence index: `docs/evidence/README.md`
- Notifications evidence: `docs/evidence/NOTIFICATIONS_EVIDENCE.md`
- Insights evidence: `docs/evidence/INSIGHTS_EVIDENCE.md`

## Roadmap and decisions

- Roadmap (phased, measurable exit criteria): `docs/ROADMAP.md`
- Decisions (short ADR-style log): `docs/DECISIONS.md`

## Recommended reading order (new contributors)

1) `docs/00-START-HERE.md`  
2) `docs/STATUS.md`  
3) `docs/00-index.md`  
4) `docs/shared/01-api-standards.md`  
5) `docs/shared/00-api-catalog.md`  
6) Feature-specific: `docs/cloud-layer/02-dashboard.md` + `docs/contracts/` + `docs/evidence/`  

