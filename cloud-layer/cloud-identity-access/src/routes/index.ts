import { Express } from 'express'
import authRoutes from './authRoutes'
import adminRoutes from './adminRoutes'
import ssoRoutes from './ssoRoutes'
import scimRoutes from './scimRoutes'
import rbacRoutes from './rbacRoutes'

export function setupRoutes(app: Express) {
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/admin', adminRoutes)
  app.use('/api/v1', ssoRoutes)
  app.use('/api/v1', scimRoutes)
  app.use('/api/v1', rbacRoutes)
}
