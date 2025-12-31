import { Router, Request, Response } from 'express'
import type { MediaConfig } from '../config'
import type { PresignFn } from '../services/presign'
import type { S3Client } from '@aws-sdk/client-s3'
import type { PrismaClient } from '@prisma/client'
import { v5 as uuidv5 } from 'uuid'
import { buildObjectKey } from '../services/presign'
import { headObject, getObject } from '../services/s3Client'
import { logger } from '../utils/logger'
import {
  MediaImageCompleteRequestSchema,
  MediaImagePresignRequestSchema,
  MediaStoredPayloadSchema,
} from '@farmiq/edge-contracts'

export function buildMediaRoutes(deps: {
  config: MediaConfig
  presign: PresignFn
  s3: S3Client
  prisma: PrismaClient
  now: () => Date
}) {
  const router = Router()
  const mediaNamespace = uuidv5('farmiq.edge.media-store', uuidv5.DNS)

  router.get('/v1/media/stats', async (req: Request, res: Response) => {
    const tenantId = req.header('x-tenant-id')
    if (!tenantId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'x-tenant-id header is required', traceId: res.locals.traceId || 'unknown' },
      })
    }

    try {
      const rows = await deps.prisma.$queryRawUnsafe<
        Array<{ total_objects: bigint | number; total_size_bytes: bigint | number; last_created_at: Date | string | null }>
      >(
        `
        SELECT
          COUNT(*)::bigint AS total_objects,
          COALESCE(SUM(size_bytes), 0)::bigint AS total_size_bytes,
          MAX(created_at) AS last_created_at
        FROM media_objects
        WHERE tenant_id = $1::text
        `,
        tenantId
      )

      const row = rows[0] ?? { total_objects: 0, total_size_bytes: 0, last_created_at: null }
      const totalObjects = Number(row.total_objects ?? 0)
      const totalSizeBytes = Number(row.total_size_bytes ?? 0)
      const totalSizeMb = totalSizeBytes > 0 ? Math.round((totalSizeBytes / (1024 * 1024)) * 10) / 10 : 0
      const lastCreatedAt =
        row.last_created_at == null
          ? null
          : row.last_created_at instanceof Date
            ? row.last_created_at.toISOString()
            : new Date(row.last_created_at).toISOString()

      return res.status(200).json({
        total_objects: totalObjects,
        total_size_mb: totalSizeMb,
        last_created_at: lastCreatedAt,
        tenant_id: tenantId,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('Failed to get media stats', { tenantId, error: message, traceId: res.locals.traceId })
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get media stats', traceId: res.locals.traceId || 'unknown' },
      })
    }
  })

  router.post('/v1/media/images/presign', async (req: Request, res: Response) => {
    const parsed = MediaImagePresignRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '), traceId: res.locals.traceId || 'unknown' },
      })
    }

    const tenantHeader = req.header('x-tenant-id')
    if (!tenantHeader || tenantHeader !== parsed.data.tenant_id) {
      return res.status(403).json({
        error: { code: 'TENANT_MISMATCH', message: 'tenant_id does not match token/header', traceId: res.locals.traceId || 'unknown' },
      })
    }

    if (!deps.config.allowedContentTypes.has(parsed.data.content_type)) {
      return res.status(400).json({
        error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'content_type must be image/jpeg, image/png, or image/webp', traceId: res.locals.traceId || 'unknown' },
      })
    }

    if (!deps.config.bucket) {
      return res.status(503).json({
        error: { code: 'CONFIG_ERROR', message: 'MEDIA_BUCKET is not configured', traceId: res.locals.traceId || 'unknown' },
      })
    }

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
      headers: { 'Content-Type': parsed.data.content_type },
    })
  })

  // Upload completion handshake: verifies the object exists, then persists metadata and emits outbox.
  router.post('/v1/media/images/complete', async (req: Request, res: Response) => {
    const parsed = MediaImageCompleteRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '), traceId: res.locals.traceId || 'unknown' },
      })
    }

    const tenantHeader = req.header('x-tenant-id')
    if (!tenantHeader || tenantHeader !== parsed.data.tenant_id) {
      return res.status(403).json({
        error: { code: 'TENANT_MISMATCH', message: 'tenant_id does not match token/header', traceId: res.locals.traceId || 'unknown' },
      })
    }

    if (!deps.config.bucket) {
      return res.status(503).json({
        error: { code: 'CONFIG_ERROR', message: 'MEDIA_BUCKET is not configured', traceId: res.locals.traceId || 'unknown' },
      })
    }

    // Idempotency: if we've already recorded this object_key for the tenant, treat completion as a replay.
    const existing = await deps.prisma.$queryRawUnsafe<
      Array<{
        id: string
        object_key: string
        bucket: string
        etag: string | null
        size_bytes: number | null
      }>
    >(
      `SELECT id, object_key, bucket, etag, size_bytes
       FROM media_objects
       WHERE tenant_id = $1::text AND object_key = $2::text
       LIMIT 1`,
      parsed.data.tenant_id,
      parsed.data.object_key
    )
    if (existing[0]) {
      const row = existing[0]
      const eventId = uuidv5(`${row.id}:media.stored`, mediaNamespace)
      logger.info('Media complete replay (idempotent)', {
        tenantId: parsed.data.tenant_id,
        mediaId: row.id,
        eventId,
        objectKey: row.object_key,
        sizeBytes: row.size_bytes ?? undefined,
        traceId: res.locals.traceId,
      })
      return res.status(200).json({
        media_id: row.id,
        event_id: eventId,
        object_key: row.object_key,
        bucket: row.bucket,
        etag: row.etag,
        size_bytes: row.size_bytes,
        inference_job_id: null,
      })
    }

    let head
    try {
      head = await headObject({ client: deps.s3, bucket: deps.config.bucket, key: parsed.data.object_key })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown error'
      logger.warn('S3 head failed', { objectKey: parsed.data.object_key, traceId: res.locals.traceId, error: message })
      return res.status(404).json({
        error: { code: 'OBJECT_NOT_FOUND', message: 'object not found in bucket', traceId: res.locals.traceId || 'unknown' },
      })
    }

    const contentLength = typeof head.ContentLength === 'number' ? head.ContentLength : undefined
    const contentType = typeof head.ContentType === 'string' ? head.ContentType : undefined
    const etag = typeof head.ETag === 'string' ? head.ETag.replace(/\"/g, '') : undefined

    if (parsed.data.size_bytes != null && contentLength != null && parsed.data.size_bytes !== contentLength) {
      return res.status(409).json({
        error: { code: 'SIZE_MISMATCH', message: 'size_bytes does not match object size', traceId: res.locals.traceId || 'unknown' },
      })
    }
    if (contentType && parsed.data.mime_type && contentType !== parsed.data.mime_type) {
      return res.status(409).json({
        error: { code: 'CONTENT_TYPE_MISMATCH', message: 'mime_type does not match object content-type', traceId: res.locals.traceId || 'unknown' },
      })
    }

    const mediaId = uuidv5(`${parsed.data.tenant_id}:${deps.config.bucket}:${parsed.data.object_key}`, mediaNamespace)
    const eventId = uuidv5(`${mediaId}:media.stored`, mediaNamespace)
    const now = deps.now()
    const capturedAtIso = parsed.data.captured_at ?? now.toISOString()

    const mediaRows = await deps.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO media_objects (
        id, tenant_id, farm_id, barn_id, device_id, session_id,
        bucket, object_key, etag, mime_type, size_bytes, captured_at, created_at
      ) VALUES (
        $1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text,
        $7::text, $8::text, $9::text, $10::text, $11::bigint, $12::timestamptz, NOW()
      )
      ON CONFLICT (tenant_id, object_key)
      DO UPDATE SET
        farm_id = EXCLUDED.farm_id,
        barn_id = EXCLUDED.barn_id,
        device_id = EXCLUDED.device_id,
        session_id = COALESCE(EXCLUDED.session_id, media_objects.session_id),
        bucket = EXCLUDED.bucket,
        etag = COALESCE(EXCLUDED.etag, media_objects.etag),
        mime_type = EXCLUDED.mime_type,
        size_bytes = COALESCE(EXCLUDED.size_bytes, media_objects.size_bytes),
        captured_at = COALESCE(EXCLUDED.captured_at, media_objects.captured_at)
      RETURNING id
      `,
      mediaId,
      parsed.data.tenant_id,
      parsed.data.farm_id,
      parsed.data.barn_id,
      parsed.data.device_id,
      parsed.data.session_id ?? null,
      deps.config.bucket,
      parsed.data.object_key,
      etag ?? null,
      parsed.data.mime_type,
      (parsed.data.size_bytes ?? contentLength ?? null) as any,
      capturedAtIso,
    )
    const persistedMediaId = mediaRows[0]?.id ?? mediaId

    const outboxPayload = MediaStoredPayloadSchema.parse({
      media_id: persistedMediaId,
      object_key: parsed.data.object_key,
      bucket: deps.config.bucket,
      etag,
      captured_at: capturedAtIso,
      mime_type: parsed.data.mime_type,
      size_bytes: Number(parsed.data.size_bytes ?? contentLength ?? 0),
      session_id: parsed.data.session_id,
      tenant_id: parsed.data.tenant_id,
      farm_id: parsed.data.farm_id,
      barn_id: parsed.data.barn_id,
      device_id: parsed.data.device_id,
    })

    await deps.prisma.$executeRawUnsafe(
      `
      INSERT INTO sync_outbox (
        id, tenant_id, farm_id, barn_id, device_id, session_id,
        event_type, occurred_at, trace_id, payload_json, payload_size_bytes,
        status, next_attempt_at, priority, attempt_count, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text,
        'media.stored', $7::timestamptz, $8::text, $9::jsonb, $10::int,
        'pending', NOW(), 0, 0, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING
      `,
      eventId,
      parsed.data.tenant_id,
      parsed.data.farm_id,
      parsed.data.barn_id,
      parsed.data.device_id,
      parsed.data.session_id ?? null,
      capturedAtIso,
      (res.locals.traceId as string) || null,
      JSON.stringify(outboxPayload),
      Buffer.byteLength(JSON.stringify(outboxPayload), 'utf8'),
    )

    logger.info('Media upload completed', {
      tenantId: parsed.data.tenant_id,
      mediaId: persistedMediaId,
      eventId,
      objectKey: parsed.data.object_key,
      sizeBytes: parsed.data.size_bytes ?? contentLength,
      traceId: res.locals.traceId,
    })

    // Optional inference trigger (best-effort).
    let inferenceJobId: string | undefined
    if (process.env.TRIGGER_INFERENCE_ON_COMPLETE === 'true') {
      const baseUrl = process.env.EDGE_VISION_INFERENCE_URL ?? 'http://edge-vision-inference:8000'
      try {
        const resp = await fetch(`${baseUrl}/api/v1/inference/jobs`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-tenant-id': parsed.data.tenant_id,
            'x-request-id': eventId,
            'x-trace-id': res.locals.traceId ?? eventId,
          },
          body: JSON.stringify({
            tenant_id: parsed.data.tenant_id,
            farm_id: parsed.data.farm_id,
            barn_id: parsed.data.barn_id,
            device_id: parsed.data.device_id,
            session_id: parsed.data.session_id,
            media_id: persistedMediaId,
            object_key: parsed.data.object_key,
          }),
        })
        const text = await resp.text().catch(() => '')
        if (resp.ok && text) {
          const json = JSON.parse(text) as any
          inferenceJobId = typeof json.job_id === 'string' ? json.job_id : undefined
        }
        if (!resp.ok) {
          logger.warn('Inference trigger failed', { status: resp.status, traceId: res.locals.traceId })
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown error'
        logger.warn('Inference trigger error', { error: message, traceId: res.locals.traceId })
      }
    }

    return res.status(200).json({
      media_id: persistedMediaId,
      event_id: eventId,
      object_key: parsed.data.object_key,
      bucket: deps.config.bucket,
      etag,
      size_bytes: parsed.data.size_bytes ?? contentLength ?? null,
      inference_job_id: inferenceJobId ?? null,
    })
  })

  // Internal: bytes by mediaId
  router.get('/v1/media/objects/:mediaId', async (req: Request, res: Response) => {
    const tenantHeader = req.header('x-tenant-id')
    if (!tenantHeader) {
      return res.status(400).json({
        error: { code: 'MISSING_TENANT', message: 'x-tenant-id is required', traceId: res.locals.traceId || 'unknown' },
      })
    }
    const mediaId = req.params.mediaId
    const rows = await deps.prisma.$queryRawUnsafe<
      Array<{ bucket: string; object_key: string; mime_type: string | null; size_bytes: number | null }>
    >(
      `SELECT bucket, object_key, mime_type, size_bytes FROM media_objects WHERE id = $1::uuid AND tenant_id = $2::text`,
      mediaId,
      tenantHeader
    )
    const row = rows[0]
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'media object not found', traceId: res.locals.traceId || 'unknown' },
      })
    }

    const obj = await getObject({ client: deps.s3, bucket: row.bucket, key: row.object_key })
    if (obj.contentType) res.setHeader('Content-Type', obj.contentType)
    if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength))

    // Body is a stream in Node; pipe it.
    const body: any = obj.body
    if (body && typeof body.pipe === 'function') {
      body.pipe(res)
      return
    }
    const buf = await body?.transformToByteArray?.()
    if (buf) {
      res.status(200).send(Buffer.from(buf))
      return
    }
    res.status(500).json({
      error: { code: 'STREAM_ERROR', message: 'unable to stream object', traceId: res.locals.traceId || 'unknown' },
    })
  })

  // Internal: bytes by object_key (used by inference for object_key-only jobs)
  router.get('/v1/media/objects/by-key', async (req: Request, res: Response) => {
    const tenantHeader = req.header('x-tenant-id')
    if (!tenantHeader) {
      return res.status(400).json({
        error: { code: 'MISSING_TENANT', message: 'x-tenant-id is required', traceId: res.locals.traceId || 'unknown' },
      })
    }
    const objectKey = String(req.query.object_key ?? '')
    if (!objectKey) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'object_key is required', traceId: res.locals.traceId || 'unknown' },
      })
    }
    const rows = await deps.prisma.$queryRawUnsafe<
      Array<{ bucket: string; object_key: string; mime_type: string | null; size_bytes: number | null }>
    >(
      `SELECT bucket, object_key, mime_type, size_bytes FROM media_objects WHERE tenant_id = $1::text AND object_key = $2::text LIMIT 1`,
      tenantHeader,
      objectKey
    )
    const row = rows[0]
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'media object not found', traceId: res.locals.traceId || 'unknown' },
      })
    }

    const obj = await getObject({ client: deps.s3, bucket: row.bucket, key: row.object_key })
    if (obj.contentType) res.setHeader('Content-Type', obj.contentType)
    if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength))

    const body: any = obj.body
    if (body && typeof body.pipe === 'function') {
      body.pipe(res)
      return
    }
    const buf = await body?.transformToByteArray?.()
    if (buf) {
      res.status(200).send(Buffer.from(buf))
      return
    }
    res.status(500).json({
      error: { code: 'STREAM_ERROR', message: 'unable to stream object', traceId: res.locals.traceId || 'unknown' },
    })
  })

  router.get('/v1/media/objects/:mediaId/meta', async (req: Request, res: Response) => {
    const tenantHeader = req.header('x-tenant-id')
    if (!tenantHeader) {
      return res.status(400).json({
        error: { code: 'MISSING_TENANT', message: 'x-tenant-id is required', traceId: res.locals.traceId || 'unknown' },
      })
    }
    const mediaId = req.params.mediaId
    const rows = await deps.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM media_objects WHERE id = $1::uuid AND tenant_id = $2::text`,
      mediaId,
      tenantHeader
    )
    const row = rows[0]
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'media object not found', traceId: res.locals.traceId || 'unknown' },
      })
    }
    return res.status(200).json({ media: row })
  })

  return router
}
