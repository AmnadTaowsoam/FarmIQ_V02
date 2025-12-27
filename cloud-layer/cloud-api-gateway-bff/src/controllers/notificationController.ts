import { Request, Response } from 'express'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'
import { notificationProxyServiceClient } from '../services/notificationProxyService'

function buildDownstreamHeaders(req: Request, res: Response, tenantId: string): Record<string, string> {
  const requestId = (req as any).id || (req.headers['x-request-id'] as string) || ''
  const traceId =
    (req.headers['x-trace-id'] as string) ||
    (req.headers['trace_id'] as string) ||
    requestId ||
    ''

  const headers: Record<string, string> = {
    'x-request-id': requestId,
    'x-trace-id': traceId,
    'x-tenant-id': tenantId,
  }

  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization as string
  }

  if (req.headers['idempotency-key']) {
    headers['idempotency-key'] = req.headers['idempotency-key'] as string
  }

  return headers
}

function normalizeCursorList(
  data: any,
  limitRaw: string | undefined
): { data: any[]; meta: { cursor?: string | null; limit: number; hasNext: boolean } } {
  const items = Array.isArray(data?.items) ? data.items : []
  const cursor = data?.nextCursor ?? null
  const parsedLimit = limitRaw ? Number(limitRaw) : NaN
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : 25
  return { data: items, meta: { cursor, limit, hasNext: Boolean(cursor) } }
}

export async function listNotificationHistoryHandler(req: Request, res: Response) {
  try {
    const reqTenantId = (req.query.tenantId as string) || (req.query.tenant_id as string)
    if (!reqTenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const tenantId = getTenantIdFromRequest(res, reqTenantId)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, res, tenantId)
    const query: Record<string, string> = {
      tenantId,
      farmId: (req.query.farmId as string) || '',
      barnId: (req.query.barnId as string) || '',
      batchId: (req.query.batchId as string) || '',
      severity: (req.query.severity as string) || '',
      channel: (req.query.channel as string) || '',
      status: (req.query.status as string) || '',
      startDate: (req.query.startDate as string) || '',
      endDate: (req.query.endDate as string) || '',
      cursor: (req.query.cursor as string) || '',
      limit: (req.query.limit as string) || '',
    }

    const result = await notificationProxyServiceClient.getHistory({ query, headers })

    if (result.ok) {
      return res.status(result.status).json(normalizeCursorList(result.data, req.query.limit as string | undefined))
    }

    if ([400, 401, 403, 409, 422].includes(result.status) && result.data !== undefined) {
      return res.status(result.status).json(result.data)
    }

    return res.status(502).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to fetch notification history',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  } catch (error: any) {
    logger.error('Error in listNotificationHistoryHandler', {
      error: error.message,
      traceId: res.locals.traceId,
    })
    return res.status(502).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to fetch notification history',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function listNotificationInboxHandler(req: Request, res: Response) {
  try {
    const reqTenantId = (req.query.tenantId as string) || (req.query.tenant_id as string)
    if (!reqTenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const tenantId = getTenantIdFromRequest(res, reqTenantId)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, res, tenantId)
    const result = await notificationProxyServiceClient.getInbox({
      headers,
      query: {
        topic: (req.query.topic as string) || '',
        cursor: (req.query.cursor as string) || '',
        limit: (req.query.limit as string) || '',
      },
    })

    if (result.ok) {
      return res.status(result.status).json(normalizeCursorList(result.data, req.query.limit as string | undefined))
    }

    if ([400, 401, 403, 409, 422].includes(result.status) && result.data !== undefined) {
      return res.status(result.status).json(result.data)
    }

    return res.status(502).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to fetch notification inbox',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  } catch (error: any) {
    logger.error('Error in listNotificationInboxHandler', {
      error: error.message,
      traceId: res.locals.traceId,
    })
    return res.status(502).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to fetch notification inbox',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function sendNotificationHandler(req: Request, res: Response) {
  try {
    const reqTenantId = (req.query.tenantId as string) || (req.query.tenant_id as string)
    if (!reqTenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const tenantId = getTenantIdFromRequest(res, reqTenantId)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, res, tenantId)
    const result = await notificationProxyServiceClient.send({ body: req.body, headers })

    if (result.ok) {
      return res.status(result.status).json(result.data)
    }

    if ([400, 401, 403, 409, 422].includes(result.status) && result.data !== undefined) {
      return res.status(result.status).json(result.data)
    }

    return res.status(502).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to send notification',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  } catch (error: any) {
    logger.error('Error in sendNotificationHandler', { error: error.message, traceId: res.locals.traceId })
    return res.status(502).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Failed to send notification', traceId: res.locals.traceId || 'unknown' },
    })
  }
}
