import { Express } from 'express'
import weighvisionRoutes from './weighvisionRoutes'

/**
 * Setup all routes for cloud-weighvision-readmodel
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  // Health and ready endpoints are in index.ts
  // Business routes under /api/v1
  app.use('/api/v1/weighvision', weighvisionRoutes)
}

