import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

export function createHealthRoutes(prisma: PrismaClient): Router {
  const router = Router()

  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' })
  })

  router.get('/ready', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.status(200).json({ status: 'ready', db: 'up' })
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        db: 'down',
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
  })

  return router
}

