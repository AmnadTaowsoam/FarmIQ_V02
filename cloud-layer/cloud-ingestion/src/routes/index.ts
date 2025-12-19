import { Express } from 'express'
import ingestionRoutes from './ingestionRoutes'

export function setupRoutes(app: Express) {
  app.use('/api/v1/edge', ingestionRoutes)
}
