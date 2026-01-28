import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider } from './theme';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './components/toast/ToastProvider';

// Guards & Layouts
import { AuthGuard } from './guards/AuthGuard';
import { ContextGuard } from './guards/ContextGuard';
import { RoleGuard } from './guards/RoleGuard';
import { AppShell } from './layout/AppShell';
import { AuthProvider } from './contexts/AuthContext';
import { ActiveContextProvider } from './contexts/ActiveContext';

// Pages
import { LoginPage } from './features/auth/pages/LoginPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { OverviewPage } from './features/dashboard/pages/OverviewPage';
import { FarmListPage } from './features/farms/pages/FarmListPage';
import { CreateFarmPage } from './features/farms/pages/CreateFarmPage';
import { FarmDetailPage } from './features/farms/pages/FarmDetailPage';
import { BarnsListPage } from './features/barns/pages/BarnsListPage';
import { CreateBarnPage } from './features/barns/pages/CreateBarnPage';
import { BarnDetailPage } from './features/barns/pages/BarnDetailPage';
import { BarnRecordsPage } from './features/barns/pages/BarnRecordsPage';
import { BarnOverviewPage } from './features/dashboard/pages/BarnOverviewPage';
import { BatchesPage } from './features/barns/pages/BatchesPage';
import { DevicesPage } from './features/dashboard/pages/DevicesPage';
import { DeviceDetailPage } from './features/dashboard/pages/DeviceDetailPage';
import { DeviceStatusPage } from './features/devices/pages/DeviceStatusPage';
import { TelemetryPage } from './features/dashboard/pages/TelemetryPage';
import { AlertsPage } from './features/dashboard/pages/AlertsPage';
import { SessionsListPage } from './features/weighvision/pages/SessionsListPage';
import { AnalyticsPage } from './features/weighvision/pages/AnalyticsPage';
import { DistributionPage } from './features/weighvision/pages/DistributionPage';
import { SessionDetailPage } from './features/weighvision/pages/SessionDetailPage';
import { FeedingKpiPage } from './features/feeding/pages/FeedingKpiPage';
import { FeedingIntakePage } from './features/feeding/pages/FeedingIntakePage';
import { FeedingLotsPage } from './features/feeding/pages/FeedingLotsPage';
import { FeedingQualityPage } from './features/feeding/pages/FeedingQualityPage';
import { FeedingProgramsPage } from './features/feeding/pages/FeedingProgramsPage';
import { SensorsPage } from './features/sensors/pages/SensorsPage';
import { SensorTrendsPage } from './features/sensors/pages/SensorTrendsPage';
import { SensorCatalogPage } from './features/sensors/pages/SensorCatalogPage';
import { SensorBindingsPage } from './features/sensors/pages/SensorBindingsPage';
import { CreateSensorPage } from './features/sensors/pages/CreateSensorPage';
import { SensorDetailPage } from './features/sensors/pages/SensorDetailPage';
import { ComingSoonPage } from './features/shared/pages/ComingSoonPage';
import { ContextSelectionPage } from './features/context/pages/ContextSelectionPage';
import { TenantSelectionPage } from './features/context/pages/TenantSelectionPage';
import { FarmSelectionPage } from './features/context/pages/FarmSelectionPage';
import { AnomaliesPage } from './features/ai/pages/AnomaliesPage';
import { RecommendationsPage } from './features/ai/pages/RecommendationsPage';
import { ScenarioPlannerPage } from './features/ai/pages/ScenarioPlannerPage';
import { AiOverviewPage } from './features/ai/pages/AiOverviewPage';
import { AiInsightsLandingPage } from './features/ai/pages/AiInsightsLandingPage';
import { InsightsFeedPage } from './features/ai/pages/InsightsFeedPage';
import { InsightDetailPage } from './features/ai/pages/InsightDetailPage';
import { ModelRegistryPage } from './features/ai/pages/ModelRegistryPage';
import { ModelHealthPage } from './features/ai/pages/ModelHealthPage';
import { AiSettingsPage } from './features/ai/pages/AiSettingsPage';
import { WhatIfSimulatorPage } from './features/ai/pages/WhatIfSimulatorPage';
import { ReportsLandingPage } from './features/reports/pages/ReportsLandingPage';
import { ReportJobsPage } from './features/reports/pages/ReportJobsPage';
import { CreateReportJobPage } from './features/reports/pages/CreateReportJobPage';
import { ReportJobDetailPage } from './features/reports/pages/ReportJobDetailPage';
import { NotificationsPage } from './features/notifications/pages/NotificationsPage';
import { DataQualityPage } from './features/ops/pages/DataQualityPage';
import { OpsHealthPage } from './features/ops/pages/OpsHealthPage';
import { OpsLandingPage } from './features/landing/pages/OpsLandingPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { FeedingLandingPage } from './features/feeding/pages/FeedingLandingPage';
import { WeighVisionLandingPage } from './features/weighvision/pages/WeighVisionLandingPage';
import { TelemetryLandingPage } from './features/telemetry/pages/TelemetryLandingPage';
import { StandardsLibraryPage } from './features/standards/pages/StandardsLibraryPage';
import { StandardsSetEditorPage } from './features/standards/pages/StandardsSetEditorPage';
import { StandardsImportPage } from './features/standards/pages/StandardsImportPage';
import { StandardsTargetBuilderPage } from './features/standards/pages/StandardsTargetBuilderPage';
import { SettingsLayout } from './features/settings/SettingsLayout';
import { SettingsRedirect } from './features/settings/components/SettingsRedirect';
import { AccountSettingsPage } from './features/settings/pages/AccountSettingsPage';
import { WorkspaceSettingsPage } from './features/settings/pages/WorkspaceSettingsPage';
import { HelpCenterPage } from './features/help/pages/HelpCenterPage';
import { UserGuidePage } from './features/help/pages/UserGuidePage';
import { ChangelogPage } from './features/help/pages/ChangelogPage';


// Error Pages
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { NotFoundPage } from './features/error/pages/NotFoundPage';
import { ForbiddenPage } from './features/error/pages/ForbiddenPage';
import { ServerErrorPage } from './features/error/pages/ServerErrorPage';
import { MaintenancePage } from './features/error/pages/MaintenancePage';
import ApiPlayground from './pages/dev/ApiPlayground';

export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ActiveContextProvider>
              <ErrorBoundary>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
              <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              
              {/* Error Routes */}
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/500" element={<ServerErrorPage />} />

              {/* Protected Routes */}
              <Route path="/" element={
                <AuthGuard>
                  <ErrorBoundary>
                    <AppShell />
                  </ErrorBoundary>
                </AuthGuard>
              }>
                {/* Dashboard & Overview */}
                <Route index element={<Navigate to="/overview" replace />} />
                <Route path="overview" element={<ContextGuard requireTenant><OverviewPage /></ContextGuard>} />
                <Route path="select-context" element={<ContextSelectionPage />} />
                <Route path="select-tenant" element={<TenantSelectionPage />} />
                <Route path="select-farm" element={<FarmSelectionPage />} />

                {/* Core Registry (Context Required) */}
                <Route path="farms" element={<ContextGuard requireTenant><FarmListPage /></ContextGuard>} />
                <Route path="farms/new" element={<ContextGuard requireTenant><CreateFarmPage /></ContextGuard>} />
                <Route path="farms/:farmId" element={<ContextGuard requireTenant><FarmDetailPage /></ContextGuard>} />
                
                <Route path="barns" element={<ContextGuard requireTenant><BarnsListPage /></ContextGuard>} />
                <Route path="barns/records" element={<ContextGuard requireTenant requireFarm requireBarn><BarnRecordsPage /></ContextGuard>} />
                <Route path="barns/batches" element={<ContextGuard requireTenant requireFarm requireBarn><BatchesPage /></ContextGuard>} />
                <Route path="barns/new" element={<ContextGuard requireTenant><CreateBarnPage /></ContextGuard>} />
                <Route path="barns/:barnId/batches" element={<ContextGuard requireTenant><BatchesPage /></ContextGuard>} />
                <Route path="barns/:barnId" element={<ContextGuard requireTenant><BarnDetailPage /></ContextGuard>} />
                <Route path="barns/:barnId/overview" element={<ContextGuard requireTenant><BarnOverviewPage /></ContextGuard>} />

                {/* Features */}
                <Route path="devices" element={<ContextGuard requireTenant><DevicesPage /></ContextGuard>} />
                <Route path="devices/status" element={<ContextGuard requireTenant><DeviceStatusPage /></ContextGuard>} />
                <Route path="devices/:deviceId" element={<ContextGuard requireTenant><DeviceDetailPage /></ContextGuard>} />
                
                {/* Telemetry */}
                <Route path="telemetry" element={<TelemetryLandingPage />} />
                <Route path="telemetry/explorer" element={
                    <ContextGuard requireTenant requireFarm>
                        <TelemetryPage />
                    </ContextGuard>
                } />

                {/* Standards */}
                <Route path="standards" element={<ContextGuard requireTenant><StandardsLibraryPage /></ContextGuard>} />
                <Route path="standards/import" element={
                  <ContextGuard requireTenant>
                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>
                      <StandardsImportPage />
                    </RoleGuard>
                  </ContextGuard>
                } />
                <Route path="standards/targets/new" element={
                  <ContextGuard requireTenant>
                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>
                      <StandardsTargetBuilderPage />
                    </RoleGuard>
                  </ContextGuard>
                } />
                <Route path="standards/sets/:setId" element={<ContextGuard requireTenant><StandardsSetEditorPage /></ContextGuard>} />

                {/* WeighVision */}
                <Route path="weighvision" element={<WeighVisionLandingPage />} />
                <Route path="weighvision/sessions" element={<SessionsListPage />} />
                <Route path="weighvision/sessions/:sessionId" element={<SessionDetailPage />} />
                <Route path="weighvision/analytics" element={<AnalyticsPage />} />
                <Route path="weighvision/distribution" element={<DistributionPage />} />

                {/* Feeding */}
                <Route path="feeding" element={<FeedingLandingPage />} />
                <Route path="feeding/kpi" element={<ContextGuard requireTenant><FeedingKpiPage /></ContextGuard>} />
                <Route path="feeding/intake" element={
                  <ContextGuard requireTenant>
                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin', 'farm_manager', 'operator']}>
                      <FeedingIntakePage />
                    </RoleGuard>
                  </ContextGuard>
                } />
                <Route path="feeding/lots" element={
                  <ContextGuard requireTenant>
                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                      <FeedingLotsPage />
                    </RoleGuard>
                  </ContextGuard>
                } />
                <Route path="feeding/quality" element={
                  <ContextGuard requireTenant>
                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                      <FeedingQualityPage />
                    </RoleGuard>
                  </ContextGuard>
                } />
                <Route path="feeding/programs" element={
                  <ContextGuard requireTenant>
                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                      <FeedingProgramsPage />
                    </RoleGuard>
                  </ContextGuard>
                } />
                <Route path="feeding-fcr" element={<Navigate to="/feeding/kpi" replace />} />
                <Route path="feeding/fcr" element={<Navigate to="/feeding/kpi" replace />} />
                <Route path="feeding/daily" element={<Navigate to="/feeding/intake" replace />} />

                {/* Sensors */}
                <Route path="sensors" element={<Navigate to="/sensors/catalog" replace />} />
                <Route path="sensors/new" element={<ContextGuard requireTenant><CreateSensorPage /></ContextGuard>} />
                <Route path="sensors/:sensorId" element={<ContextGuard requireTenant><SensorDetailPage /></ContextGuard>} />
                <Route path="sensors/matrix" element={<ContextGuard requireTenant><SensorsPage /></ContextGuard>} />
                <Route path="sensors/catalog" element={<ContextGuard requireTenant><SensorCatalogPage /></ContextGuard>} />
                <Route path="sensors/bindings" element={<ContextGuard requireTenant><SensorBindingsPage /></ContextGuard>} />
                <Route path="sensors/trends" element={<ContextGuard requireTenant><SensorTrendsPage /></ContextGuard>} />

                {/* AI & Ops */}
                <Route path="ai/overview" element={<ContextGuard requireTenant><AiOverviewPage /></ContextGuard>} />
                <Route path="ai/insights" element={<ContextGuard requireTenant><AiInsightsLandingPage /></ContextGuard>} />
                <Route path="ai/anomalies" element={<ContextGuard requireTenant><AnomaliesPage /></ContextGuard>} />
                <Route path="ai/recommendations" element={<ContextGuard requireTenant><RecommendationsPage /></ContextGuard>} />
                <Route path="ai/insights-feed" element={<ContextGuard requireTenant><InsightsFeedPage /></ContextGuard>} />
                <Route path="ai/insights/:insightId" element={<ContextGuard requireTenant><InsightDetailPage /></ContextGuard>} />
                <Route path="ai/scenario-planner" element={<ContextGuard requireTenant><ScenarioPlannerPage /></ContextGuard>} />
                <Route path="ai/what-if" element={<ContextGuard requireTenant><WhatIfSimulatorPage /></ContextGuard>} />
                <Route path="ai/models" element={<ContextGuard requireTenant><ModelRegistryPage /></ContextGuard>} />
                <Route path="ai/model-health" element={<ContextGuard requireTenant><ModelHealthPage /></ContextGuard>} />
                <Route path="ai/settings" element={<ContextGuard requireTenant><AiSettingsPage /></ContextGuard>} />
                <Route path="ops" element={<ContextGuard requireTenant><OpsLandingPage /></ContextGuard>} />
                <Route path="ops/data-quality" element={<ContextGuard requireTenant><DataQualityPage /></ContextGuard>} />
                <Route path="ops/health" element={<ContextGuard requireTenant><OpsHealthPage /></ContextGuard>} />

                {/* Utilities */}
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="notifications" element={<ContextGuard requireTenant><NotificationsPage /></ContextGuard>} />
                <Route path="reports" element={<ContextGuard requireTenant><ReportsLandingPage /></ContextGuard>} />
                <Route path="reports/jobs" element={<ContextGuard requireTenant><ReportJobsPage /></ContextGuard>} />
                <Route path="reports/jobs/new" element={<ContextGuard requireTenant><CreateReportJobPage /></ContextGuard>} />
                <Route path="reports/jobs/:jobId" element={<ContextGuard requireTenant><ReportJobDetailPage /></ContextGuard>} />
                <Route path="reports/new" element={<Navigate to="/reports/jobs/new" replace />} />
                <Route path="reports/:jobId" element={<ContextGuard requireTenant><ReportJobDetailPage /></ContextGuard>} />
                
                {/* Profile & Settings */}
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsRedirect />} />
                  <Route path="account" element={<AccountSettingsPage />} />
                  <Route path="workspace" element={<WorkspaceSettingsPage />} />
                </Route>
                <Route path="help" element={<HelpCenterPage />} />
                <Route path="user-guide" element={<UserGuidePage />} />
                <Route path="changelog" element={<ChangelogPage />} />


                {/* Redirect admin routes to admin-web */}
                <Route path="admin/*" element={
                  <Navigate to="http://localhost:5143" replace />
                } />


                {/* Dev Tools */}
                <Route path="dev/api-playground" element={<ApiPlayground />} />
              </Route>
              
              {/* Catch-all 404 - must be last */}
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </ErrorBoundary>
            </ActiveContextProvider>
          </BrowserRouter>
        </AuthProvider>
        </ToastProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};
