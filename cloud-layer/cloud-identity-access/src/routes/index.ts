import { Express } from 'express'
import authRoutes from './authRoutes'
import adminRoutes from './adminRoutes'

export function setupRoutes(app: Express) {
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/admin', adminRoutes)
}
