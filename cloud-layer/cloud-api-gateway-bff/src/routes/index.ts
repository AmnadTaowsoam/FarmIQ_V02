import { Express } from 'express'
import dashboardRoutes from './dashboardRoutes'
import publicVariableRoutes from './public-variable-routes'
import configRoutes from './configRoutes'
import auditRoutes from './auditRoutes'
import feedRoutes from './feedRoutes'
import barnRecordsRoutes from './barnRecordsRoutes'
import tenantRegistryRoutes from './tenantRegistryRoutes'
import sensorsRoutes from './sensorsRoutes'
import weighvisionRoutes from './weighvisionRoutes'
import reportingRoutes from './reportingRoutes'
import opsRoutes from './opsRoutes'
import standardsRoutes from './standardsRoutes'
import telemetryRoutes from './telemetryRoutes'
import notificationRoutes from './notificationRoutes'
import dashboardNotificationRoutes from './dashboardNotificationRoutes'
import identityRoutes from './identityRoutes'
import authProxyRoutes from './authProxyRoutes'
import billingRoutes from './billingRoutes'
import fleetRoutes from './fleetRoutes'
import inferenceRoutes from './inferenceRoutes'
import advancedAnalyticsRoutes from './advancedAnalyticsRoutes'
import adminRoutes from './adminRoutes'
import identityProxyRoutes from './identityProxyRoutes'
import quotaRoutes from './quotaRoutes'

/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express): void {
  // Dashboard notification routes (must be registered before /api/v1/dashboard)
  app.use('/api/v1/dashboard/notifications', dashboardNotificationRoutes)

  // Auth proxy routes (identity access)
  app.use('/api/v1', authProxyRoutes)

  // BFF dashboard routes
  app.use('/api/v1/dashboard', dashboardRoutes)

  // Admin routes (Overview)
  app.use('/api/v1/admin', adminRoutes)

  // Config routes
  app.use('/api/v1/config', configRoutes)

  // Audit routes
  app.use('/api/v1/audit', auditRoutes)

  // Feed service proxy routes
  app.use('/api/v1', feedRoutes)

  // Barn records service proxy routes
  app.use('/api/v1', barnRecordsRoutes)

  // Tenant registry service proxy routes
  app.use('/api/v1', tenantRegistryRoutes)

  // Quota routes (must be registered along with tenant routes)
  app.use('/api/v1', quotaRoutes)

  // Identity access admin proxy routes
  app.use('/api/v1', identityRoutes)

  // New Identity Proxy Routes (RBAC, SCIM, SSO)
  app.use('/api/v1/identity', identityProxyRoutes)

  // Sensor module proxy routes (part of tenant-registry)
  app.use('/api/v1', sensorsRoutes)

  // Telemetry service proxy routes
  app.use('/api/v1/telemetry', telemetryRoutes)

  // WeighVision read model proxy routes
  app.use('/api/v1/weighvision', weighvisionRoutes)

  // Reporting export service proxy routes
  app.use('/api/v1/reports', reportingRoutes)

  // Ops aggregation routes (health/sync status)
  app.use('/api/v1/ops', opsRoutes)

  // Standards service proxy routes
  app.use('/api/v1/standards', standardsRoutes)

  // Notification service proxy routes
  app.use('/api/v1/notifications', notificationRoutes)

  // Keep existing public variable route for frontend config
  app.use('/api/public-variable-frontend', publicVariableRoutes)

  // NEW ROUTES
  app.use('/api/v1/billing', billingRoutes)
  app.use('/api/v1/fleet', fleetRoutes)
  app.use('/api/v1/inference', inferenceRoutes)
  app.use('/api/v1/analytics', advancedAnalyticsRoutes)
}
