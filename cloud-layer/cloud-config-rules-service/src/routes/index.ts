import { Express } from 'express'
import configRoutes from './configRoutes'

/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express): void {
  // Config routes
  app.use('/api/v1/config', configRoutes)
}

