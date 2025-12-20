import express, { Request, Response } from 'express'
import { DownstreamConfig, postJsonForJson } from '../http/downstream'

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
    const tenantId = req.header('x-tenant-id') ?? ''
    const result = await postJsonForJson<Record<string, unknown>>({
      url: `${config.mediaBaseUrl}/api/v1/media/images/presign`,
      body: req.body,
      headers: tenantId ? { 'x-tenant-id': tenantId } : undefined,
      requestId: res.locals.requestId,
      traceId: res.locals.traceId,
      timeoutMs: config.timeoutMs,
    })

    if (!result.ok) {
      res.status(result.status ?? 502).json({
        error: {
          code: 'DOWNSTREAM_ERROR',
          message: result.error || 'downstream error',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    res.status(200).json(result.data)
  })

  return router
}
