import { Express } from 'express'
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import exampleRoutes from './exampleRoutes'
import publicVariableRoutes from './public-variable-routes'
import mediaRoutes from './mediaRoutes'
/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  const router = Router()
  
  // Health endpoint
  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' })
  })
  
  // Stats endpoint
  router.get('/stats', async (_req, res) => {
    const prisma = new PrismaClient()
    try {
      const tenantId = _req.headers['x-tenant-id'] as string || 't-001'
      
      const [totalObjects, totalSizeBytes] = await Promise.all([
        prisma.mediaObjects.count({ where: { tenantId } }),
        prisma.mediaObjects.aggregate({
          where: { tenantId },
          _sum: {
            size_bytes: true
          }
        })
      ])
      
      const totalSizeMb = totalSizeBytes._sum.size_bytes ? Math.round(totalSizeBytes._sum.size_bytes / (1024 * 1024)) : 0
      
      let lastCreated: string | null
      try {
        const latest = await prisma.mediaObjects.findFirst({
          where: { tenantId },
          orderBy: { created_at: 'desc' }
        })
        lastCreated = latest?.created_at?.toISOString() || null
      } catch (e) {
        // Ignore query errors
      }
      
      res.status(200).json({
        total_objects: totalObjects,
        total_size_mb: totalSizeMb,
        last_created_at: lastCreated,
        tenant_id: tenantId,
      })
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get media stats',
          details: error instanceof Error ? error.message : String(error)
        }
      })
    } finally {
      await prisma.$disconnect()
    }
  })
  
  app.use('/api', mediaRoutes)
  app.use('/api', exampleRoutes)
  app.use('/api/public-variable-frontend', publicVariableRoutes)
}
