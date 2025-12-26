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

/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express): void {
  // BFF dashboard routes
  app.use('/api/v1/dashboard', dashboardRoutes)

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

  // Sensor module proxy routes (part of tenant-registry)
  app.use('/api/v1', sensorsRoutes)

  // WeighVision read model proxy routes
  app.use('/api/v1/weighvision', weighvisionRoutes)

  // Reporting export service proxy routes
  app.use('/api/v1/reports', reportingRoutes)

  // Ops aggregation routes (health/sync status)
  app.use('/api/v1/ops', opsRoutes)

  // Standards service proxy routes
  app.use('/api/v1/standards', standardsRoutes)

  // Keep existing public variable route for frontend config
  app.use('/api/public-variable-frontend', publicVariableRoutes)
}
