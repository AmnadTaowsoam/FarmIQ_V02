import express, { Request, Response } from 'express'
import { DownstreamConfig } from '../http/downstream'

export function buildMediaRoutes(config: DownstreamConfig) {
  const router = express.Router()

  router.post('/v1/media/images', (_req: Request, res: Response) => {
    res.status(410).json({
      error: {
        code: 'GONE',
        message: 'use /api/v1/media/images/presign for presigned upload',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  })

  router.post('/v1/media/images/presign', async (req: Request, res: Response) => {
    res.status(410).json({
      error: {
        code: 'GONE',
        message: 'devices must call edge-media-store /api/v1/media/images/presign directly',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  })

  return router
}
