import { Express } from 'express'
import notificationRoutes from './notificationRoutes'

export function setupRoutes(app: Express): void {
  app.use('/api/v1/notifications', notificationRoutes)
}
