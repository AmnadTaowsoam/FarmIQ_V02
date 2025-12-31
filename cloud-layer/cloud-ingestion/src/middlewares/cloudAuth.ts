import { NextFunction, Request, Response } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '../utils/logger'

type CloudAuthMode = 'none' | 'api_key' | 'hmac'

type RawBodyRequest = Request & {
  rawBody?: string
  requestId?: string
  authMode?: CloudAuthMode
  hmacValidated?: boolean
}

/**
 * Configurable HMAC timestamp skew tolerance
 * Defaults to ±300 seconds to account for clock drift
 */
const DEFAULT_HMAC_MAX_SKEW_MS = parseInt(process.env.HMAC_MAX_SKEW_MS || '300000', 10)
const MAX_SKEW_MS = Number.isFinite(DEFAULT_HMAC_MAX_SKEW_MS) ? DEFAULT_HMAC_MAX_SKEW_MS : 300000

const REDIS_URL = process.env.REDIS_URL
let redisClient: any | null = null
let redisConnecting: Promise<any | null> | null = null
let redisAvailable = true

async function getRedisClient(): Promise<any | null> {
  if (!REDIS_URL || !redisAvailable) return null

  if (!redisClient) {
    let createClient: ((options: { url: string }) => any) | undefined
    try {
      const redisModule = require('redis')
      createClient = redisModule.createClient
    } catch (err) {
      redisAvailable = false
      logger.warn('Redis module not available; replay protection disabled', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }

    if (!createClient) {
      redisAvailable = false
      logger.warn('Redis module missing createClient; replay protection disabled')
      return null
    }

    redisClient = createClient({ url: REDIS_URL })
    redisClient.on('error', (err: unknown) => {
      logger.warn('Redis client error', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  if (redisClient.isOpen) return redisClient

  if (!redisConnecting) {
    redisConnecting = redisClient
      .connect()
      .then(() => redisClient)
      .catch((err: unknown) => {
        logger.warn('Redis connection failed; replay protection disabled', {
          error: err instanceof Error ? err.message : String(err),
        })
        return null
      })
      .finally(() => {
        redisConnecting = null
      })
  }

  return redisConnecting
}

/**
 * Parse authentication mode from environment variable
 * Normalizes input and validates against allowed values
 */
function parseAuthMode(value?: string): CloudAuthMode {
  const normalized = (value ?? 'none').toLowerCase()
  if (normalized === 'none' || normalized === 'api_key' || normalized === 'hmac') {
    return normalized
  }
  return 'none'
}

/**
 * Parse comma-separated environment variable list
 */
function parseEnvList(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

/**
 * Normalize signature header to remove algorithm prefix
 * Accepts both "sha256=hex" and raw hex signatures
 */
function normalizeSignature(value: string): string {
  return value.startsWith('sha256=') ? value.slice('sha256='.length) : value
}

/**
 * Timing-safe constant-time string comparison
 * Prevents timing attacks by using constant-time comparison
 */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

function normalizeUrlPath(value: string): string {
  const noQuery = value.split('?')[0] || '/'
  if (noQuery.length > 1 && noQuery.endsWith('/')) {
    return noQuery.slice(0, -1)
  }
  return noQuery
}

/**
 * Create signing payload following strict format that MUST match Edge:
 * Format: ${timestamp}.${req.method}.${urlPath}.${rawBody}
 */
function createSigningPayload(timestamp: string, req: Request, rawBody: string): string {
  const urlPath = normalizeUrlPath(req.originalUrl || req.url)
  const method = req.method.toUpperCase()
  return `${timestamp}.${method}.${urlPath}.${rawBody}`
}

/**
 * Cloud authentication middleware
 * Enforces authentication based on CLOUD_AUTH_MODE:
 * - none: no authentication (development only)
 * - api_key: simple shared secret authentication
 * - hmac: cryptographic signature with replay prevention
 */
export async function cloudAuthMiddleware(
  req: RawBodyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const mode = parseAuthMode(process.env.CLOUD_AUTH_MODE)
  if (mode === 'none') {
    next()
    return
  }

  const requestId = req.requestId || 'unknown'
  const traceId = (req.headers['x-trace-id'] as string) || requestId

  // =====================================================================
  // API KEY MODE
  // =====================================================================
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

    next()
    return
  }

  // =====================================================================
  // HMAC MODE with Replay Prevention
  // =====================================================================
  const signatureHeader = req.headers['x-edge-signature']
  const signatureRaw = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader
  const signature = signatureRaw ? normalizeSignature(signatureRaw) : ''
  const timestampHeader = req.headers['x-edge-timestamp']

  if (!timestampHeader) {
    logger.error('HMAC authentication requires x-edge-timestamp header', { requestId, traceId })
    res.status(401).json({
      error: {
        code: 'HMAC_TIMESTAMP_MISSING',
        message: 'HMAC authentication requires x-edge-timestamp header',
        traceId,
      },
    })
    return
  }

  if (!signature) {
    logger.error('HMAC authentication requires x-edge-signature header', { requestId, traceId })
    res.status(401).json({
      error: {
        code: 'HMAC_SIGNATURE_MISSING',
        message: 'HMAC authentication requires x-edge-signature header',
        traceId,
      },
    })
    return
  }

  // Parse and validate timestamp
  const timestampStr = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader
  if (!timestampStr || !/^[0-9]+$/.test(timestampStr)) {
    logger.error('Invalid HMAC timestamp format', { requestId, traceId, timestamp: timestampHeader })
    res.status(401).json({
      error: {
        code: 'HMAC_TIMESTAMP_INVALID',
        message: 'HMAC timestamp must be a valid unix epoch milliseconds number',
        traceId,
      },
    })
    return
  }

  const timestamp = Number.parseInt(timestampStr, 10)

  // Validate timestamp window (± skew from server time)
  const serverTime = Date.now()
  const timeDiff = Math.abs(serverTime - timestamp)

  if (timeDiff > MAX_SKEW_MS) {
    logger.warn('HMAC timestamp outside allowed window', {
      requestId,
      traceId,
      clientTimestamp: timestamp,
      serverTime: serverTime,
      skewMs: timeDiff,
      maxSkewMs: MAX_SKEW_MS,
    })
    res.status(401).json({
      error: {
        code: 'HMAC_TIMESTAMP_OUT_OF_WINDOW',
        message: `HMAC timestamp is outside allowed window (±${MAX_SKEW_MS / 1000}s).`,
        traceId,
        clientTimestamp: timestamp,
        serverTime: new Date(serverTime).toISOString(),
        skewMs: timeDiff,
        maxSkewMs: MAX_SKEW_MS,
      },
    })
    return
  }

  // Get raw body for signing (required in HMAC mode)
  if (typeof req.rawBody !== 'string') {
    logger.error('rawBody capture is not configured for HMAC auth', { requestId, traceId })
    res.status(500).json({
      error: {
        code: 'AUTH_CONFIG_ERROR',
        message: 'HMAC authentication requires rawBody capture to be enabled',
        traceId,
      },
    })
    return
  }

  const rawBody = req.rawBody

  // Load HMAC secrets (support for rotation via comma-separated list)
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

  // =====================================================================
  // SIGNATURE VALIDATION (must happen before replay detection)
  // =====================================================================
  const payloadToSign = createSigningPayload(timestampStr, req, rawBody)
  const expectedSignatures = secrets.map((secret) =>
    createHmac('sha256', secret).update(payloadToSign).digest('hex')
  )

  const signatureMatches = expectedSignatures.some((expectedSig) => safeEqual(expectedSig, signature))

  if (!signatureMatches) {
    logger.warn('HMAC signature validation failed', {
      requestId,
      traceId,
      signature: signature.substring(0, 16) + '...',
      expectedSignatures: expectedSignatures.map((s) => s.substring(0, 16)),
      timestamp,
    })
    res.status(401).json({
      error: {
        code: 'HMAC_SIGNATURE_INVALID',
        message: 'HMAC signature does not match any configured secret',
        traceId,
      },
    })
    return
  }

  // =====================================================================
  // REPLAY PREVENTION (Optional)
  // =====================================================================
  if (REDIS_URL) {
    try {
      const redis = await getRedisClient()
      if (redis) {
        const ttlSeconds = Math.ceil((MAX_SKEW_MS / 1000) * 2)
        const tenantIdHeader = req.headers['x-tenant-id']
        const tenantId =
          (typeof req.body?.tenant_id === 'string' && req.body.tenant_id) ||
          (Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader) ||
          'unknown'
        const replayKey = `replay:${tenantId}:${timestampStr}:${signature}`
        const setResult = await redis.set(replayKey, '1', { NX: true, EX: ttlSeconds })

        if (setResult === null) {
          logger.warn('Replay attack detected', {
            requestId,
            traceId,
            timestamp,
            replayKey,
          })
          res.status(401).json({
            error: {
              code: 'HMAC_REPLAY_DETECTED',
              message: 'Request replay detected. This request has already been processed.',
              traceId,
              timestamp,
            },
          })
          return
        }

        logger.debug('Replay cache set', {
          requestId,
          traceId,
          timestamp,
          replayKey,
          ttl: ttlSeconds,
        })
      }
    } catch (redisErr) {
      logger.warn('Redis error during replay prevention; allowing request', {
        requestId,
        traceId,
        error: redisErr instanceof Error ? redisErr.message : String(redisErr),
      })
    }
  }

  // =====================================================================
  // AUTHENTICATION SUCCESS
  // =====================================================================
  logger.info('HMAC authentication successful', {
    requestId,
    traceId,
    timestamp,
    mode: 'hmac',
    signature: signature.substring(0, 16) + '...',
    timeSkewMs: timeDiff,
  })

  req.authMode = mode
  req.hmacValidated = true

  next()
}
