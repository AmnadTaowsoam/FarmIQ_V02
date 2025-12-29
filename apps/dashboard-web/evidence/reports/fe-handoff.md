# Frontend Handoff Report
**Date:** 2025-12-20
**Version:** v0.2.0 (Skeleton Complete)

## 1. Executive Summary
The Frontend Foundation is complete. The application skeleton, routing, authentications guards, and core layouts are implemented. 
All pages documented in `02-page-specs.md` are accounted for, either with functional skeletons or "Coming Soon" placeholders.
The API layer is centralized in `bffClient.ts` and currently operates in **MOCK MODE** (enabled via `VITE_MOCK_MODE=true`).

## 2. Route Map
| Path | Component | Status | Guard |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | Functional (Mock Auth) | Public |
| `/` | `Navigate -> /overview` | - | Auth |
| `/overview` | `OverviewPage` | Skeleton | Auth |
| `/farms` | `FarmListPage` | Functional (Mock) | Auth |
| `/farms/:id` | `FarmDetailPage` | Skeleton | Auth + Tenant |
| `/barns` | `BarnsListPage` | Functional (Mock) | Auth + Tenant |
| `/barns/:id` | `BarnDetailPage` | Skeleton | Auth + Tenant |
| `/devices` | `DevicesPage` | Skeleton | Auth + Tenant |
| `/telemetry` | `TelemetryPage` | Skeleton | Auth + Tenant + Farm |
| `/weighvision/sessions` | `SessionsListPage` | Functional (Mock) | Auth + Tenant |
| `/weighvision/analytics` | `AnalyticsPage` | Skeleton | Auth + Tenant |
| `/feeding/daily` | `DailyFeedingPage` | Functional (Mock) | Auth + Tenant |
| `/sensors/matrix` | `SensorsPage` | Functional (Mock) | Auth + Tenant |
| `/alerts` | `AlertsPage` | Skeleton | Auth |
| `/settings` | `SettingsPage` | Functional (UI) | Auth |
| `/admin/users` | `AdminUsersPage` | Functional (Mock) | Auth + Admin |
| `/admin/*` | `ComingSoonPage` | Placeholder | Auth + Admin |
| All others | `ComingSoonPage` | Placeholder | Auth |

## 3. API Status & BE TODO
All frontend features currently use **Mock Data**. The backend endpoints required are listed below.

| Feature | Method | Path | Status |
| :--- | :--- | :--- | :--- |
| **Auth** | POST | `/auth/login` | MOCK (Local) |
| **Context** | GET | `/context/tenants` | MOCK |
| **Context** | GET | `/context/farms` | MOCK |
| **Context** | GET | `/context/barns` | MOCK |
| **Barns** | GET | `/barns/:id/status` | MOCK |
| **Feeding** | GET | `/feeding/daily` | MOCK |
| **Feeding** | GET | `/feeding/logs` | MOCK |
| **Sensors** | GET | `/sensors/matrix` | MOCK |
| **WeighVision** | GET | `/weighvision/sessions` | MOCK |
| **Admin** | GET | `/admin/users` | MOCK |

**BE Action Required:** Implement these endpoints in `cloud-api-gateway-bff`.

## 4. Run Instructions
### Prerequisites
- Node.js > 18
- `npm install`

### Local Development
```bash
npm run dev
# Opens at http://localhost:5173
```
- **Login**: Any email/password (Mock Auth).
- **Mock Mode**: Controls visible in `src/api/client.ts`. Default `true`.

### Debugging
- A **Debug Panel** is available in the bottom-right corner to view active context and `x-request-id`.

## 5. Artifacts
- **Screenshots**: See `evidence/ui/README.md`.
- **Codebase**: `apps/dashboard-web`
