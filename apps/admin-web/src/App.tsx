import React, { Suspense } from 'react';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './contexts/AuthContext';

import { SettingsProvider } from './contexts/SettingsContext';

import { AuthGuard } from './guards/AuthGuard';

import { RoleGuard } from './guards/RoleGuard';

import { useTranslation } from 'react-i18next';

import { ThemeProvider } from './theme';

import { LoginPage } from './features/auth/pages/LoginPage';

import { AdminShell } from './layout/AdminShell';
import { SettingsPage } from './features/admin/pages/SettingsPage';



// #region agent log disabled

// fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:9',message:'App.tsx imports started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});

// #endregion



// Import pages with error handling - use React.lazy for dynamic loading

const AdminOverviewPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/AdminOverviewPage');

    return { default: module.AdminOverviewPage };

  } catch (e: any) {

    return { default: () => <div>Admin Overview (Error: {String(e)})</div> };

  }

});



const AdminTenantsPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/AdminTenantsPage');

    return { default: module.AdminTenantsPage };

  } catch (e: any) {

    return { default: () => <div>Admin Tenants (Error: {String(e)})</div> };

  }

});



const AdminUsersPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/AdminUsersPage');

    return { default: module.AdminUsersPage };

  } catch (e: any) {

    return { default: () => <div>Admin Users (Error: {String(e)})</div> };

  }

});



const AdminDevicesPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/AdminDevicesPage');

    return { default: module.AdminDevicesPage };

  } catch (e: any) {

    return { default: () => <div>Admin Devices (Error: {String(e)})</div> };

  }

});



const SsoConfigurationPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/SsoConfigurationPage');

    return { default: module.SsoConfigurationPage };

  } catch (e: any) {

    return { default: () => <div>SSO Configuration (Error: {String(e)})</div> };

  }

});



const ScimConfigurationPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/ScimConfigurationPage');

    return { default: module.ScimConfigurationPage };

  } catch (e: any) {

    return { default: () => <div>SCIM Configuration (Error: {String(e)})</div> };

  }

});



const ProfileSettingsPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/ProfileSettingsPage');

    return { default: module.ProfileSettingsPage };

  } catch (e: any) {

    return { default: () => <div>Profile Settings (Error: {String(e)})</div> };

  }

});



const CustomRolesPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/CustomRolesPage');

    return { default: module.CustomRolesPage };

  } catch (e: any) {

    return { default: () => <div>Custom Roles (Error: {String(e)})</div> };

  }

});



const TenantQuotasPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/TenantQuotasPage');

    return { default: module.TenantQuotasPage };

  } catch (e: any) {

    return { default: () => <div>Tenant Quotas (Error: {String(e)})</div> };

  }

});



const BillingDashboardPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/BillingDashboardPage');

    return { default: module.BillingDashboardPage };

  } catch (e: any) {

    return { default: () => <div>Billing Dashboard (Error: {String(e)})</div> };

  }

});



// Placeholder pages â†’ wired with React.lazy

const TenantDetailPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/TenantDetailPage');

    return { default: module.TenantDetailPage };

  } catch (e: any) {

    return { default: () => <div>Tenant Detail (Error: {String(e)})</div> };

  }

});

const UserDetailPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/UserDetailPage');

    return { default: module.UserDetailPage };

  } catch (e: any) {

    return { default: () => <div>User Detail (Error: {String(e)})</div> };

  }

});

const RolesPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/RolesPage');

    return { default: module.RolesPage };

  } catch (e: any) {

    return { default: () => <div>Roles (Error: {String(e)})</div> };

  }

});

const PermissionMatrixPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/PermissionMatrixPage');

    return { default: module.PermissionMatrixPage };

  } catch (e: any) {

    return { default: () => <div>Permission Matrix (Error: {String(e)})</div> };

  }

});

const SyncDashboardPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/SyncDashboardPage');

    return { default: module.SyncDashboardPage };

  } catch (e: any) {

    return { default: () => <div>Sync Dashboard (Error: {String(e)})</div> };

  }

});

const MqttMonitoringPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/MqttMonitoringPage');

    return { default: module.MqttMonitoringPage };

  } catch (e: any) {

    return { default: () => <div>MQTT Monitoring (Error: {String(e)})</div> };

  }

});

const StorageDashboardPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/StorageDashboardPage');

    return { default: module.StorageDashboardPage };

  } catch (e: any) {

    return { default: () => <div>Storage Dashboard (Error: {String(e)})</div> };

  }

});

const QueueMonitoringPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/QueueMonitoringPage');

    return { default: module.QueueMonitoringPage };

  } catch (e: any) {

    return { default: () => <div>Queue Monitoring (Error: {String(e)})</div> };

  }

});

const IncidentsPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/IncidentsPage');

    return { default: module.IncidentsPage };

  } catch (e: any) {

    return { default: () => <div>Incidents (Error: {String(e)})</div> };

  }

});

const SystemHealthPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/SystemHealthPage');

    return { default: module.SystemHealthPage };

  } catch (e: any) {

    return { default: () => <div>System Health (Error: {String(e)})</div> };

  }

});

const DeviceDetailPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/DeviceDetailPage');

    return { default: module.DeviceDetailPage };

  } catch (e: any) {

    return { default: () => <div>Device Detail (Error: {String(e)})</div> };

  }

});

const DeviceOnboardingPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/DeviceOnboardingPage');

    return { default: module.DeviceOnboardingPage };

  } catch (e: any) {

    return { default: () => <div>Device Onboarding (Error: {String(e)})</div> };

  }

});

const AdminAuditPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/AdminAuditPage');

    return { default: module.AdminAuditPage };

  } catch (e: any) {

    return { default: () => <div>Admin Audit (Error: {String(e)})</div> };

  }

});

const AuditDetailPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/AuditDetailPage');

    return { default: module.AuditDetailPage };

  } catch (e: any) {

    return { default: () => <div>Audit Detail (Error: {String(e)})</div> };

  }

});

const DataPolicyPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/DataPolicyPage');

    return { default: module.DataPolicyPage };

  } catch (e: any) {

    return { default: () => <div>Data Policy (Error: {String(e)})</div> };

  }

});

const NotificationsPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/NotificationsPage');

    return { default: module.NotificationsPage };

  } catch (e: any) {

    return { default: () => <div>Notifications (Error: {String(e)})</div> };

  }

});

const ImpersonatePage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/ImpersonatePage');

    return { default: module.ImpersonatePage };

  } catch (e: any) {

    return { default: () => <div>Impersonate (Error: {String(e)})</div> };

  }

});

const ContextDebugPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/ContextDebugPage');

    return { default: module.ContextDebugPage };

  } catch (e: any) {

    return { default: () => <div>Context Debug (Error: {String(e)})</div> };

  }

});



const ForbiddenPage = React.lazy(async () => {

  try {

    const module = await import('./features/admin/pages/ForbiddenPage');

    return { default: module.ForbiddenPage };

  } catch (e: any) {

    return { default: () => <div>403 (Error: {String(e)})</div> };

  }

});



function App() {

  const { t } = useTranslation();

  

  // #region agent log disabled

  // fetch('http://127.0.0.1:7245/ingest/cc045650-7261-4ab6-a60c-2e050afa9fcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:48',message:'App component rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});

  // #endregion



  return (

    <AuthProvider>

      <SettingsProvider>

        <ThemeProvider>

          <CssBaseline />

          <BrowserRouter>

            <Routes>

              {/* Login page - public route */}

              <Route path="/login" element={<LoginPage />} />

              

              {/* Protected Admin Routes */}

              <Route element={

                <AuthGuard>

                  <AdminShell />

                </AuthGuard>

              }>

                {/* Default redirect */}

                <Route path="/" element={<Navigate to="/overview" replace />} />



                {/* Overview */}

                <Route

                  path="/overview"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <AdminOverviewPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Tenants */}

                <Route

                  path="/tenants"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <AdminTenantsPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />

                <Route

                  path="/tenants/:tenantId"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <TenantDetailPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Identity - Users */}

                <Route

                  path="/identity/users"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <AdminUsersPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />

                <Route

                  path="/identity/users/:userId"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <UserDetailPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Identity - Roles */}

                <Route

                  path="/identity/roles"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <RolesPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Identity - Permission Matrix */}

                <Route

                  path="/identity/permission-matrix"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <PermissionMatrixPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Identity - SSO Configuration */}

                <Route

                  path="/identity/sso"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <SsoConfigurationPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Identity - SCIM Configuration */}

                <Route

                  path="/identity/scim"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <ScimConfigurationPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Identity - Custom Roles */}

                <Route

                  path="/identity/custom-roles"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <CustomRolesPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Profile Settings */}

                <Route

                  path="/profile"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <ProfileSettingsPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Settings Hub */}

                <Route

                  path="/settings"

                  element={

                    <RoleGuard allowedRoles={["platform_admin"]}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <SettingsPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



{/* Settings - Tenant Quotas */}

                <Route

                  path="/settings/quotas"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <TenantQuotasPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Billing */}

                <Route

                  path="/billing"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <BillingDashboardPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Ops - Sync */}

                <Route

                  path="/ops/sync"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <SyncDashboardPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Ops - MQTT */}

                <Route

                  path="/ops/mqtt"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <MqttMonitoringPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Ops - Storage */}

                <Route

                  path="/ops/storage"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <StorageDashboardPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Ops - Queues */}

                <Route

                  path="/ops/queues"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <QueueMonitoringPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Ops - Incidents */}

                <Route

                  path="/ops/incidents"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <IncidentsPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Ops - Health */}

                <Route

                  path="/ops/health"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <SystemHealthPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Devices */}

                <Route

                  path="/devices"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <AdminDevicesPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />

                <Route

                  path="/devices/:deviceId"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <DeviceDetailPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Devices - Onboarding */}

                <Route

                  path="/devices/onboarding"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <DeviceOnboardingPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Audit Log */}

                <Route

                  path="/audit-log"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <AdminAuditPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />

                <Route

                  path="/audit-log/:auditId"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'tenant_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <AuditDetailPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Settings - Data Policy */}

                <Route

                  path="/settings/data-policy"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <DataPolicyPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Settings - Notifications */}

                <Route

                  path="/settings/notifications"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <NotificationsPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Support - Impersonate */}

                <Route

                  path="/support/impersonate"

                  element={

                    <RoleGuard allowedRoles={['platform_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <ImpersonatePage />

                      </Suspense>

                    </RoleGuard>

                  }

                />



                {/* Support - Context Debug */}

                <Route

                  path="/support/context-debug"

                  element={

                    <RoleGuard allowedRoles={['platform_admin', 'ops_admin']}>

                      <Suspense fallback={<div>Loading...</div>}>

                        <ContextDebugPage />

                      </Suspense>

                    </RoleGuard>

                  }

                />

              </Route>



              {/* 403 Forbidden */}

              <Route path="/403" element={<Suspense fallback={<div>Loading...</div>}><ForbiddenPage /></Suspense>} />



              {/* Catch all */}

              <Route path="*" element={<Navigate to="/overview" replace />} />

            </Routes>

          </BrowserRouter>

        </ThemeProvider>

      </SettingsProvider>

    </AuthProvider>

  );

}



export default App;


