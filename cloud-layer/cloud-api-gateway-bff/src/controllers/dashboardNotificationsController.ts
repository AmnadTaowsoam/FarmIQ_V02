import { Request, Response } from 'express'
import { dashboardNotificationServiceClient } from '../services/dashboardNotificationService'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'

function getRequestId(req: Request): string {
  return ((req as any).id as string) || (req.headers['x-request-id'] as string) || ''
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

function getTraceId(req: Request, requestId: string): string {
  return (
    (req.headers['x-trace-id'] as string) ||
    (req.headers['trace_id'] as string) ||
    requestId ||
    ''
  )
}

function buildDownstreamHeaders(req: Request, tenantId: string): Record<string, string> {
  const requestId = getRequestId(req)
  const traceId = getTraceId(req, requestId)

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

function getBffTraceId(req: Request, res: Response): string {
  const requestId = getRequestId(req)
  return res.locals.traceId || requestId || 'unknown'
}

function sendBffDownstreamError(res: Response, traceId: string, message: string): void {
  res.status(502).json({
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message,
      traceId,
    },
  })
}

export async function getDashboardNotificationsInboxHandler(req: Request, res: Response) {
  const traceId = getBffTraceId(req, res)

  try {
    const tenantId = getTenantIdFromRequest(
      res,
      (req.query.tenantId as string) || (req.query.tenant_id as string)
    )
    if (!tenantId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const result = await dashboardNotificationServiceClient.getInbox({
      headers,
      query: {
        topic: req.query.topic as string | undefined,
        cursor: req.query.cursor as string | undefined,
        limit: req.query.limit as string | undefined,
      },
    })

    if (result.ok) {
      return res.status(result.status).json(normalizeCursorList(result.data, req.query.limit as string | undefined))
    }

    if ([400, 401, 403, 409, 422].includes(result.status) && result.data !== undefined) {
      return res.status(result.status).json(result.data)
    }

    logger.warn('Downstream notification-service call failed (inbox)', {
      status: result.status,
      traceId,
    })
    return sendBffDownstreamError(res, traceId, 'Failed to fetch notification inbox')
  } catch (error: any) {
    logger.error('Error in getDashboardNotificationsInboxHandler', {
      error: error.message,
      traceId,
    })
    return sendBffDownstreamError(res, traceId, 'Failed to fetch notification inbox')
  }
}

export async function getDashboardNotificationsHistoryHandler(req: Request, res: Response) {
  const traceId = getBffTraceId(req, res)

  try {
    const tenantId = getTenantIdFromRequest(
      res,
      (req.query.tenantId as string) || (req.query.tenant_id as string)
    )
    if (!tenantId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const query: Record<string, string | undefined> = {
      tenantId,
      farmId: req.query.farmId as string | undefined,
      barnId: req.query.barnId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      severity: req.query.severity as string | undefined,
      channel: req.query.channel as string | undefined,
      status: req.query.status as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit as string | undefined,
    }

    const result = await dashboardNotificationServiceClient.getHistory({ headers, query })

    if (result.ok) {
      return res.status(result.status).json(normalizeCursorList(result.data, req.query.limit as string | undefined))
    }

    if ([400, 401, 403, 409, 422].includes(result.status) && result.data !== undefined) {
      return res.status(result.status).json(result.data)
    }

    logger.warn('Downstream notification-service call failed (history)', {
      status: result.status,
      traceId,
    })
    return sendBffDownstreamError(res, traceId, 'Failed to fetch notification history')
  } catch (error: any) {
    logger.error('Error in getDashboardNotificationsHistoryHandler', {
      error: error.message,
      traceId,
    })
    return sendBffDownstreamError(res, traceId, 'Failed to fetch notification history')
  }
}

export async function postDashboardNotificationsSendHandler(req: Request, res: Response) {
  const traceId = getBffTraceId(req, res)

  try {
    const tenantId = getTenantIdFromRequest(
      res,
      (req.body?.tenantId as string) ||
        (req.body?.tenant_id as string) ||
        (req.query.tenantId as string) ||
        (req.query.tenant_id as string)
    )
    if (!tenantId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const result = await dashboardNotificationServiceClient.send({ headers, body: req.body })

    if (result.ok) {
      return res.status(result.status).json(result.data)
    }

    if ([400, 401, 403, 409, 422].includes(result.status) && result.data !== undefined) {
      return res.status(result.status).json(result.data)
    }

    logger.warn('Downstream notification-service call failed (send)', {
      status: result.status,
      traceId,
    })
    return sendBffDownstreamError(res, traceId, 'Failed to send notification')
  } catch (error: any) {
    logger.error('Error in postDashboardNotificationsSendHandler', {
      error: error.message,
      traceId,
    })
    return sendBffDownstreamError(res, traceId, 'Failed to send notification')
  }
}
