import { Express } from 'express'
import auditRoutes from './auditRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/audit', auditRoutes)
}

