import { NextFunction, Request, Response } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '../utils/logger'

type CloudAuthMode = 'none' | 'api_key' | 'hmac'
type RawBodyRequest = Request & { rawBody?: string; requestId?: string }

function parseAuthMode(value?: string): CloudAuthMode {
  const normalized = (value ?? 'none').toLowerCase()
  if (normalized === 'none' || normalized === 'api_key' || normalized === 'hmac') {
    return normalized
  }
  return 'none'
}

function parseEnvList(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function normalizeSignature(value: string): string {
  return value.startsWith('sha256=') ? value.slice('sha256='.length) : value
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

export function cloudAuthMiddleware(req: RawBodyRequest, res: Response, next: NextFunction): void {
  const mode = parseAuthMode(process.env.CLOUD_AUTH_MODE)
  if (mode === 'none') {
    return next()
  }

  const requestId = req.requestId || 'unknown'
  const traceId = (req.headers['x-trace-id'] as string) || requestId

  if (mode === 'api_key') {
    const apiKeyHeader = req.headers['x-api-key']
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader
    const keys = parseEnvList(process.env.CLOUD_API_KEYS).concat(
      parseEnvList(process.env.CLOUD_API_KEY)
    )
    if (keys.length === 0) {
      logger.error('CLOUD_API_KEYS is not configured for api_key auth', { requestId, traceId })
      res.status(500).json({
        error: {
          code: 'AUTH_CONFIG_ERROR',
          message: 'API key auth is enabled but no keys are configured',
          traceId,
        },
      })
      return
    }
    if (!apiKey || !keys.includes(apiKey)) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing API key',
          traceId,
        },
      })
      return
    }
    return next()
  }

  const signatureHeader = req.headers['x-edge-signature']
  const signatureRaw = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader
  const signature = signatureRaw ? normalizeSignature(signatureRaw) : ''
  const secrets = parseEnvList(process.env.CLOUD_HMAC_SECRETS).concat(
    parseEnvList(process.env.CLOUD_HMAC_SECRET)
  )

  if (secrets.length === 0) {
    logger.error('CLOUD_HMAC_SECRETS is not configured for hmac auth', { requestId, traceId })
    res.status(500).json({
      error: {
        code: 'AUTH_CONFIG_ERROR',
        message: 'HMAC auth is enabled but no secrets are configured',
        traceId,
      },
    })
    return
  }

  if (!signature) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing HMAC signature',
        traceId,
      },
    })
    return
  }

  const rawBody = req.rawBody ?? ''
  const matches = secrets.some((secret) => {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    return safeEqual(expected, signature)
  })

  if (!matches) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid HMAC signature',
        traceId,
      },
    })
    return
  }

  next()
}
