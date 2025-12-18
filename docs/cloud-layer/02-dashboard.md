Purpose: Define the scope of the FarmIQ React dashboard and how it integrates with cloud APIs.  
Scope: Key pages, BFF API calls, and high-level Datadog RUM guidance.  
Owner: FarmIQ Frontend Team  
Last updated: 2025-12-17  

---

## Dashboard overview

The FarmIQ dashboard is a React application intended for:
- Farm operations monitoring (telemetry trends, device health).
- WeighVision session insights (weights, inference results, images where permitted).
- Analytics KPIs and anomaly views (optional for MVP, but supported).

Implementation starting point:
- **`dashboard-web`** uses `boilerplates/Frontend` (React 18 + TypeScript + Vite + Redux + optional Datadog RUM).

---

## Key pages (MVP scope)

- **Login / Access**
  - OIDC login flow (handled by `cloud-identity-access` and/or external IdP).
  - Tenant-scoped session.

- **Tenant / Farm selection**
  - Select tenant (if user has multiple).
  - Select farm and barn context.

- **Barn overview**
  - Summary tiles:
    - Active devices count
    - Latest telemetry snapshot
    - Alerts/anomalies (if enabled)
    - Recent WeighVision sessions

- **Device list and device detail**
  - Devices by barn with status indicators.
  - Device detail: time-series charts, last seen timestamps, recent events.

- **Telemetry explorer**
  - Charts over time for key metrics with filtering by device/barn/batch.
  - Aggregation windows (1m/1h/1d).

- **WeighVision sessions**
  - Session list with search/filter by device, time, status.
  - Session detail:
    - Captured weights
    - Inference results and confidence
    - Images/thumbnails (if retention + permissions allow)

- **Admin (optional in MVP)**
  - Tenant registry and device onboarding.
  - RBAC roles and user assignments.

---

## API calls to `cloud-api-gateway-bff`

The dashboard should call only the BFF (`cloud-api-gateway-bff`) for backend data. Example endpoints:

- **Health**
  - `GET /api/health`

- **Dashboard BFF (business)**
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/farms/{farmId}`
  - `GET /api/v1/dashboard/barns/{barnId}`
  - `GET /api/v1/dashboard/alerts`

Headers:
- `Authorization: Bearer <jwt>`
- `x-request-id` generated per request (frontend-side).

Error handling:
- Always assume the standard backend error shape:
  - `{"error":{"code":"...","message":"...","traceId":"..."}}`

---

## Optional: Datadog RUM notes

If enabled (recommended for production):
- Use `boilerplates/Frontend` `src/monitoring.ts` as starting point.
- Configure:
  - `service`: `dashboard-web`
  - `env`: `dev|qa|uat|prod`
  - `version`: commit id
- Avoid sending PII in RUM attributes.
- Correlate RUM with backend traces by forwarding `x-request-id` and ensuring backend logs/traces include it.

---

## Implementation Notes

- Use i18n patterns from the boilerplate for Thai/English readiness.
- Follow accessibility guidelines (WCAG 2.2 Level A) as required by GT&D standards.
- Implement a maintenance mode page controlled by an environment variable as required by infrastructure standards.


