import { Express } from 'express'
import billingRoutes from './billingRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/billing', billingRoutes)
}
