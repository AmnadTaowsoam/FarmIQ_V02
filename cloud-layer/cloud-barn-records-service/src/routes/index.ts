import { Express } from 'express'
import barnRecordsRoutes from './barnRecordsRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/barn-records', barnRecordsRoutes)
}

