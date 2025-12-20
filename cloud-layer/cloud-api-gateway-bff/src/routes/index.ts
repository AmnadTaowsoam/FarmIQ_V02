import { Express } from 'express'
import dashboardRoutes from './dashboardRoutes'
import publicVariableRoutes from './public-variable-routes'
import configRoutes from './configRoutes'
import auditRoutes from './auditRoutes'

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

  // Keep existing public variable route for frontend config
  app.use('/api/public-variable-frontend', publicVariableRoutes)
}
