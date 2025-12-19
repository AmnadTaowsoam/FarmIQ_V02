import { Express } from 'express'
import dashboardRoutes from './dashboardRoutes'
import publicVariableRoutes from './public-variable-routes'

/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  // BFF dashboard routes
  app.use('/api/v1/dashboard', dashboardRoutes)

  // Keep existing public variable route for frontend config
  app.use('/api/public-variable-frontend', publicVariableRoutes)
}
