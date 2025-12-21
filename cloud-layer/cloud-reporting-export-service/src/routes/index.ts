import { Express } from 'express'
import reportRoutes from './reportJobsRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/reports', reportRoutes)
}
