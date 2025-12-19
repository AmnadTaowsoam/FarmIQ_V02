import { Express } from 'express'
import authRoutes from './authRoutes'

export function setupRoutes(app: Express) {
  app.use('/api/v1/auth', authRoutes)
}
