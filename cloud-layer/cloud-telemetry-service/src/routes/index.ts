import { Express } from 'express'
import telemetryRoutes from './telemetryRoutes'

/**
 * Setup all routes for cloud-telemetry-service
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  // Health and ready endpoints are in index.ts
  // Business routes under /api/v1
  app.use('/api/v1/telemetry', telemetryRoutes)
}
