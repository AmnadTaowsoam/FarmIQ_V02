import { Express } from 'express'
import tenantRoutes from './tenantRoutes'
import farmRoutes from './farmRoutes'
import barnRoutes from './barnRoutes'
import batchRoutes from './batchRoutes'
import deviceRoutes from './deviceRoutes'
import stationRoutes from './stationRoutes'
import topologyRoutes from './topologyRoutes'

/**
 * Setup all routes for cloud-tenant-registry service
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  // Health and ready endpoints are in index.ts
  // Business routes under /api/v1
  app.use('/api/v1/tenants', tenantRoutes)
  app.use('/api/v1/farms', farmRoutes)
  app.use('/api/v1/barns', barnRoutes)
  app.use('/api/v1/batches', batchRoutes)
  app.use('/api/v1/devices', deviceRoutes)
  app.use('/api/v1/stations', stationRoutes)
  app.use('/api/v1/topology', topologyRoutes)
}
