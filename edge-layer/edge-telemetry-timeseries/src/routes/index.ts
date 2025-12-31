import { Express } from 'express'
import { createTelemetryRoutes } from './telemetryRoutes'
import publicVariableRoutes from './public-variable-routes'
/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  app.use('/api', createTelemetryRoutes)
  app.use('/api/public-variable-frontend', publicVariableRoutes)
}
