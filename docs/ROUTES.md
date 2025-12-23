# FarmIQ Dashboard Routes

This document maps all sidebar navigation items to their routes and page components.

## Operations Section

| Label | Route | Component | File Path |
|-------|-------|-----------|-----------|
| Overview | `/overview` | OverviewPage | [OverviewPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/dashboard/pages/OverviewPage.tsx) |
| Farms | `/farms` | FarmListPage | [FarmListPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/farms/pages/FarmListPage.tsx) |
| **Barns** | | | |
| → Overview | `/barns` | BarnsListPage | [BarnsListPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/barns/pages/BarnsListPage.tsx) |
| → Health & Records | `/barns/records` | BarnRecordsPage | [BarnRecordsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/barns/pages/BarnRecordsPage.tsx) |
| → Batches & Flocks | `/barns/batches` | BatchesPage | [BatchesPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/barns/pages/BatchesPage.tsx) |
| **Devices** | | | |
| → Inventory | `/devices` | DevicesPage | [DevicesPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/dashboard/pages/DevicesPage.tsx) |
| → Status | `/devices/status` | DeviceStatusPage | [DeviceStatusPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/devices/pages/DeviceStatusPage.tsx) |
| Telemetry | `/telemetry` | TelemetryPage | [TelemetryPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/dashboard/pages/TelemetryPage.tsx) |
| **WeighVision** | | | |
| → Sessions | `/weighvision/sessions` | SessionsPage | [SessionsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/dashboard/pages/SessionsPage.tsx) |
| → Analytics | `/weighvision/analytics` | WeighVisionPage | [WeighVisionPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/landing/pages/WeighVisionPage.tsx) |
| → Size Distribution | `/weighvision/distribution` | WeighVisionPage | [WeighVisionPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/landing/pages/WeighVisionPage.tsx) |
| **Sensors** | | | |
| → Catalog | `/sensors/catalog` | SensorCatalogPage | [SensorCatalogPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/sensors/pages/SensorCatalogPage.tsx) |
| → Bindings | `/sensors/bindings` | SensorBindingsPage | [SensorBindingsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/sensors/pages/SensorBindingsPage.tsx) |
| → Sensor Matrix | `/sensors/matrix` | SensorsPage | [SensorsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/sensors/pages/SensorsPage.tsx) |
| → Trends & Correlation | `/sensors/trends` | SensorTrendsPage | [SensorTrendsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/sensors/pages/SensorTrendsPage.tsx) |
| **Feeding Module** | | | |
| → KPI Dashboard | `/feeding/kpi` | FeedingKpiPage | [FeedingKpiPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/feeding/pages/FeedingKpiPage.tsx) |
| → Daily Feed Intake | `/feeding/intake` | FeedingIntakePage | [FeedingIntakePage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/feeding/pages/FeedingIntakePage.tsx) |
| → Feed Lots & Deliveries | `/feeding/lots` | FeedingLotsPage | [FeedingLotsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/feeding/pages/FeedingLotsPage.tsx) |
| → Feed Quality Results | `/feeding/quality` | FeedingQualityPage | [FeedingQualityPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/feeding/pages/FeedingQualityPage.tsx) |
| → Feed Programs | `/feeding/programs` | FeedingProgramsPage | [FeedingProgramsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/feeding/pages/FeedingProgramsPage.tsx) |
| Alerts | `/alerts` | AlertsPage | [AlertsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/dashboard/pages/AlertsPage.tsx) |
| Notifications | `/notifications` | NotificationsPage | Placeholder page |
| Reports | `/reports` | ReportsPage | Placeholder page |
| **Ops** | | | |
| → Data Quality | `/ops/data-quality` | OpsLandingPage | [OpsLandingPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/landing/pages/OpsLandingPage.tsx) |
| → Health Monitor | `/ops/health` | OpsLandingPage | [OpsLandingPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/landing/pages/OpsLandingPage.tsx) |

## AI Section

| Label | Route | Component | File Path |
|-------|-------|-----------|-----------|
| **AI Insights** | | | |
| → Anomalies | `/ai/anomalies` | AnomaliesPage | [AnomaliesPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/ai/pages/AnomaliesPage.tsx) |
| → Recommendations | `/ai/recommendations` | RecommendationsPage | [RecommendationsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/ai/pages/RecommendationsPage.tsx) |
| → Scenario Planner | `/ai/scenario` | ScenarioPlannerPage | [ScenarioPlannerPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/ai/pages/ScenarioPlannerPage.tsx) |

## Admin Section

| Label | Route | Component | File Path |
|-------|-------|-----------|-----------|
| **Admin** | | | |
| → Tenants | `/admin/tenants` | AdminTenantsPage | [AdminTenantsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/admin/pages/AdminTenantsPage.tsx) |
| → Device Onboarding | `/admin/devices` | AdminDevicesPage | [AdminDevicesPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/admin/pages/AdminDevicesPage.tsx) |
| → Users & Roles | `/admin/users` | AdminUsersPage | [AdminUsersPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/admin/pages/AdminUsersPage.tsx) |
| → Audit Log | `/admin/audit` | AdminAuditPage | [AdminAuditPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/admin/pages/AdminAuditPage.tsx) |

## Other Routes (Not in Sidebar)

| Label | Route | Component | File Path |
|-------|-------|-----------|-----------|
| Profile | `/profile` | ProfilePage | Placeholder page |
| Settings | `/settings` | SettingsPage | [SettingsPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/dashboard/pages/SettingsPage.tsx) |
| Context Selection | `/select-context` | ContextSelectionPage | [ContextSelectionPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/context/pages/ContextSelectionPage.tsx) |
| Farm Selection | `/select-farm` | FarmSelectionPage | [FarmSelectionPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/context/pages/FarmSelectionPage.tsx) |
| Tenant Selection | `/select-tenant` | TenantSelectionPage | [TenantSelectionPage.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/features/context/pages/TenantSelectionPage.tsx) |

## Notes

- Routes marked with **bold** are parent menu items with children
- Routes prefixed with → are child menu items
- Some routes may require specific user roles to access (see [routes.tsx](file:///d:/FarmIQ/FarmIQ_V02/apps/dashboard-web/src/config/routes.tsx) for role requirements)
- Feed Programs menu item is controlled by `VITE_FEED_PROGRAMS_ENABLED` environment variable
