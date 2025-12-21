import { Express } from 'express'
import feedRoutes from './feedRoutes'
import kpiRoutes from './kpiRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/feed', feedRoutes)
  app.use('/api/v1/kpi', kpiRoutes)
}

