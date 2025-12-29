import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { MediaConfig } from '../config'
import { PresignFn, buildObjectKey } from '../services/presign'
import { logger } from '../utils/logger'

const presignSchema = z.object({
  tenant_id: z.string().min(1),
  farm_id: z.string().min(1),
  barn_id: z.string().min(1),
  device_id: z.string().min(1),
  content_type: z.string().min(1),
  filename: z.string().min(1),
})

export function buildMediaRoutes(deps: {
  config: MediaConfig
  presign: PresignFn
  now: () => Date
}) {
  const router = Router()

  router.post('/v1/media/images/presign', async (req: Request, res: Response) => {
    const parsed = presignSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => e.message).join(', '),
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    // TODO (Production Enhancement): Add JWT token validation or mTLS client certificate authentication
    // Current MVP implementation only validates x-tenant-id header matches request body tenant_id.
    // For production, implement proper JWT validation middleware or mTLS certificate validation.
    // See docs/edge-layer/00-overview.md and docs/edge-layer/01-edge-services.md for authentication requirements.
    const tenantHeader = req.header('x-tenant-id')
    if (!tenantHeader || tenantHeader !== parsed.data.tenant_id) {
      return res.status(403).json({
        error: {
          code: 'TENANT_MISMATCH',
          message: 'tenant_id does not match token/header',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    if (!deps.config.allowedContentTypes.has(parsed.data.content_type)) {
      return res.status(400).json({
        error: {
          code: 'UNSUPPORTED_CONTENT_TYPE',
          message: 'content_type must be image/jpeg, image/png, or image/webp',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    if (!deps.config.bucket) {
      return res.status(503).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'MEDIA_BUCKET is not configured',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    try {
      const objectKey = buildObjectKey({
        tenantId: parsed.data.tenant_id,
        farmId: parsed.data.farm_id,
        barnId: parsed.data.barn_id,
        deviceId: parsed.data.device_id,
        filename: parsed.data.filename,
        now: deps.now(),
      })

      const uploadUrl = await deps.presign({
        bucket: deps.config.bucket,
        key: objectKey,
        contentType: parsed.data.content_type,
        expiresIn: deps.config.presignExpiresIn,
      })

      logger.info('Issued presign upload', {
        tenantId: parsed.data.tenant_id,
        deviceId: parsed.data.device_id,
        objectKey,
        traceId: res.locals.traceId,
      })

      return res.status(200).json({
        object_key: objectKey,
        upload_url: uploadUrl,
        expires_in: deps.config.presignExpiresIn,
        method: 'PUT',
        headers: {
          'Content-Type': parsed.data.content_type,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error'
      logger.error('Presign request failed', {
        error: message,
        traceId: res.locals.traceId,
      })
      return res.status(400).json({
        error: {
          code: 'PRESIGN_FAILED',
          message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
  })

  return router
}
