import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { identityServiceClient } from '../services/identityService'

function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
  const headers: Record<string, string> = {}

  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization as string
  }

  if (res.locals.requestId) {
    headers['x-request-id'] = res.locals.requestId
  }
  if (res.locals.traceId) {
    headers['x-trace-id'] = res.locals.traceId
  }

  return headers
}

function handleDownstreamResponse(
  result: { ok: boolean; status: number; data?: unknown },
  res: Response,
  defaultErrorCode: string = 'INTERNAL_ERROR'
): void {
  if (result.ok && result.data !== undefined) {
    res.status(result.status).json(result.data)
  } else {
    // 401 is expected in dev mode when no auth token is provided
    if (result.status === 401) {
      logger.debug('Downstream service returned 401 (expected in dev mode)', {
        status: result.status,
        traceId: res.locals.traceId,
      })
    } else {
      logger.warn('Downstream service error', {
        status: result.status,
        traceId: res.locals.traceId,
      })
    }

    const status = result.status >= 400 && result.status < 600 ? result.status : 502
    res.status(status).json({
      error: {
        code: status === 502 ? 'SERVICE_UNAVAILABLE' : defaultErrorCode,
        message: 'Downstream service error',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await identityServiceClient.login({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in loginHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await identityServiceClient.refresh({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in refreshHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await identityServiceClient.me({
      headers: buildDownstreamHeaders(req, res),
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in meHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch profile',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
