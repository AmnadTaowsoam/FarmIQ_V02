import { Express } from 'express'
import standardsRoutes from './standardsRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/standards', standardsRoutes)
}

