# Dashboard Web Gap Analysis (Specs vs App)

Scope: Compare `docs/cloud-layer/dashboard/02-page-specs.md` against actual routes/pages in `apps/dashboard-web`.

Last Updated: 2025-12-20

## Summary

- Spec pages: 27
- Implemented + routed: 27
- Partial/placeholder: 0
- Missing (no route/page): 0

## Page-by-Page Status

1) Login / Access
- Spec: Login
- App: `/login` -> `LoginPage`
- Status: Implemented

2) Tenant/Farm/Barn Selection (Context)
- Spec: Context selection page
- App: `/select-context` + selection pages wired to registry APIs
- Status: Implemented

3) Overview (Executive + Ops)
- Spec: Overview
- App: `/overview` -> `OverviewPage`
- Status: Implemented

4) Barn Overview (Ops Cockpit)
- Spec: Barn Overview
- App: `/barns/:barnId/overview` -> `BarnOverviewPage`
- Status: Implemented

5) Farms List + Farm Detail
- Spec: `/farms`, `/farms/:id`
- App: `/farms` -> `FarmListPage`, `/farms/:farmId` -> `FarmDetailPage`
- Status: Implemented

6) Barns List + Barn Detail
- Spec: `/barns`, `/barns/:id`
- App: `/barns` -> `BarnsListPage`, `/barns/:barnId` -> `BarnDetailPage`
- Status: Implemented

7) Devices List + Device Detail
- Spec: `/devices`, `/devices/:id`
- App: `/devices` -> `DevicesPage`, `/devices/:deviceId` -> `DeviceDetailPage`
- Status: Implemented

8) Telemetry Explorer
- Spec: `/telemetry`
- App: `/telemetry` -> `TelemetryPage`
- Status: Implemented

9) WeighVision Sessions List
- Spec: `/weighvision/sessions`
- App: `/weighvision/sessions` -> `SessionsListPage`
- Status: Implemented

10) WeighVision Session Detail
- Spec: `/weighvision/sessions/:sessionId`
- App: `/weighvision/sessions/:sessionId` -> `SessionDetailPage`
- Status: Implemented

11) Weight Dashboard (Farm/Barn)
- Spec: Weight analytics dashboard
- App: `/weighvision/analytics` -> `AnalyticsPage`
- Status: Implemented

12) Size Distribution
- Spec: `/weighvision/distribution`
- App: `/weighvision/distribution` -> `DistributionPage`
- Status: Implemented

13) Daily Feed Intake
- Spec: `/feeding/daily`
- App: `/feeding/daily` -> `DailyFeedingPage`
- Status: Implemented

14) FCR & Forecast
- Spec: `/feeding/fcr`
- App: `/feeding/fcr` -> `FcrForecastPage`
- Status: Implemented

15) Sensor Matrix (Barn)
- Spec: `/sensors/matrix`
- App: `/sensors/matrix` -> `SensorsPage`
- Status: Implemented

16) Sensor Trends & Correlation
- Spec: `/sensors/trends`
- App: `/sensors/trends` -> `SensorTrendsPage`
- Status: Implemented

17) Anomalies & Early Warning
- Spec: `/ai/anomalies`
- App: `/ai/anomalies` -> `AnomaliesPage`
- Status: Implemented

18) Recommendations (AI Coach)
- Spec: `/ai/recommendations`
- App: `/ai/recommendations` -> `RecommendationsPage`
- Status: Implemented

19) Scenario Planner (What-if)
- Spec: `/ai/scenario`
- App: `/ai/scenario` -> `ScenarioPlannerPage`
- Status: Implemented

20) Alerts Center
- Spec: `/alerts`
- App: `/alerts` -> `AlertsPage`
- Status: Implemented

21) Reports & Export
- Spec: `/reports`
- App: `/reports` -> `ReportsPage`
- Status: Implemented

22) Data Quality & Coverage
- Spec: `/ops/data-quality`
- App: `/ops/data-quality` -> `DataQualityPage`
- Status: Implemented

23) Ops Health
- Spec: `/ops/health`
- App: `/ops/health` -> `OpsHealthPage`
- Status: Implemented

24) Admin: Tenant Registry
- Spec: `/admin/tenants`
- App: `/admin/tenants` -> `AdminTenantsPage`
- Status: Implemented

25) Admin: Device Onboarding
- Spec: `/admin/devices`
- App: `/admin/devices` -> `AdminDevicesPage`
- Status: Implemented

26) Admin: Users & Roles (RBAC)
- Spec: `/admin/users`
- App: `/admin/users` -> `AdminUsersPage`
- Status: Implemented

27) Admin: Audit Log
- Spec: `/admin/audit`
- App: `/admin/audit` -> `AdminAuditPage`
- Status: Implemented

## Route/Spec Mismatches (Immediate)

- None detected after implementation updates.

## Evidence (source files)

- Specs: `docs/cloud-layer/dashboard/02-page-specs.md`
- Routes: `apps/dashboard-web/src/App.tsx`
- Menu config: `apps/dashboard-web/src/config/routes.tsx`
