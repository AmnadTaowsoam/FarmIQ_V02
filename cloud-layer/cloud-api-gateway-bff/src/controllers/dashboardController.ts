import { Request, Response } from 'express'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import {
  fetchOverview,
  fetchFarmDashboard,
  fetchBarnDashboard,
  fetchAlerts,
} from '../services/dashboardService'
import { logger } from '../utils/logger'

function buildDownstreamHeaders(req: Request, tenantId: string): Record<string, string> {
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

  return headers
}

function resolveTimeWindow(req: Request): { from: string; to: string; bucket: '5m' | '1h' | '1d' } {
  const now = new Date()
  const to = typeof req.query.to === 'string' ? req.query.to : now.toISOString()

  const fromQuery = typeof req.query.from === 'string' ? req.query.from : undefined
  const preset = typeof req.query.timeRange === 'string' ? req.query.timeRange : '24h'

  if (fromQuery) {
    // If caller provides explicit from/to, default to 1h bucket unless overridden
    const bucket =
      req.query.bucket === '5m' || req.query.bucket === '1h' || req.query.bucket === '1d'
        ? (req.query.bucket as '5m' | '1h' | '1d')
        : '1h'
    return { from: fromQuery, to, bucket }
  }

  const start = new Date(now)
  let bucket: '5m' | '1h' | '1d' = '1h'

  switch (preset) {
    case '24h':
      start.setHours(start.getHours() - 24)
      bucket = '5m'
      break
    case '7d':
      start.setDate(start.getDate() - 7)
      bucket = '1h'
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      bucket = '1d'
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      bucket = '1d'
      break
    default:
      // Keep sane defaults
      start.setHours(start.getHours() - 24)
      bucket = '5m'
  }

  return { from: start.toISOString(), to, bucket }
}

export async function getOverview(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const window = resolveTimeWindow(req)
    const farmId = (req.query.farmId as string | undefined) || (req.query.farm_id as string | undefined)
    const barnId = (req.query.barnId as string | undefined) || (req.query.barn_id as string | undefined)
    const batchId = (req.query.batchId as string | undefined) || (req.query.batch_id as string | undefined)

    const data = await fetchOverview({ tenantId, farmId, barnId, batchId, headers, ...window })
    return res.json(data)
  } catch (error) {
    logger.error('Error in getOverview', { error })
    return res.status(502).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: 'Failed to build overview from downstream services',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getFarmDashboard(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const farmId = req.params.farmId
    if (!farmId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'farmId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const data = await fetchFarmDashboard({ tenantId, farmId, headers })
    return res.json(data)
  } catch (error) {
    logger.error('Error in getFarmDashboard', { error })
    return res.status(502).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: 'Failed to build farm dashboard from downstream services',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getBarnDashboard(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const barnId = req.params.barnId
    if (!barnId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'barnId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const data = await fetchBarnDashboard({ tenantId, barnId, headers })
    return res.json(data)
  } catch (error) {
    logger.error('Error in getBarnDashboard', { error })
    return res.status(502).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: 'Failed to build barn dashboard from downstream services',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getAlerts(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const headers = buildDownstreamHeaders(req, tenantId)
    const data = await fetchAlerts({ tenantId, headers })
    return res.json(data)
  } catch (error) {
    logger.error('Error in getAlerts', { error })
    return res.status(502).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: 'Failed to fetch alerts from downstream services',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}


