import { Request, Response } from 'express'
import { createWeighVisionServiceClient } from '../services/weighvisionService'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'

const weighvisionService = createWeighVisionServiceClient()

function emptySessionsPayload() {
  return {
    items: [],
    nextCursor: null,
    hasMore: false,
    meta: { downstream_available: false },
  }
}

function emptyAnalyticsPayload() {
  return {
    data: null,
    meta: { downstream_available: false },
  }
}

function isRetryableDownstreamStatus(status: number) {
  return status === 502 || status === 503 || status === 504 || status >= 500
}

function parseStatusFromErrorMessage(message?: string): number | null {
  if (!message) return null
  const match = message.match(/:\s*(\d{3})\b/)
  if (!match) return null
  const status = Number(match[1])
  return Number.isFinite(status) ? status : null
}

/**
 * Get weighvision sessions (proxy to weighvision-readmodel)
 */
export async function getSessionsHandler(req: Request, res: Response) {
  try {
    // Get tenantId from JWT or query param
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    const batchId = req.query.batchId as string | undefined
    const stationId = req.query.stationId as string | undefined
    const status = req.query.status as string | undefined
    const from = req.query.from as string | undefined
    const to = req.query.to as string | undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const cursor = req.query.cursor as string | undefined

    const result = await weighvisionService.getSessions({
      tenantId,
      farmId,
      barnId,
      batchId,
      stationId,
      status,
      from,
      to,
      limit,
      cursor,
    })

    logger.info('WeighVision sessions retrieved', {
      tenantId,
      count: result.items?.length || 0,
      traceId: res.locals.traceId,
    })

    res.json(result)
  } catch (error: any) {
    logger.error('Error in getSessionsHandler', {
      error: error.message,
      traceId: res.locals.traceId,
    })

    // Dev-friendly fallback: if downstream readmodel is unavailable, return empty list instead of 5xx.
    const status =
      error.response?.status || parseStatusFromErrorMessage(error.message) || 500
    if (isRetryableDownstreamStatus(status)) {
      return res.json(emptySessionsPayload())
    }

    if (error.response?.status) {
      return res.status(error.response.status).json(error.response.data || {
        error: {
          code: 'DOWNSTREAM_ERROR',
          message: error.message || 'Failed to fetch weighvision sessions',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch weighvision sessions',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get weighvision session by ID (proxy to weighvision-readmodel)
 */
export async function getSessionByIdHandler(req: Request, res: Response) {
  try {
    // Get tenantId from JWT or query param
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const sessionId = req.params.sessionId
    if (!sessionId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'sessionId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const result = await weighvisionService.getSessionById(tenantId, sessionId)

    logger.info('WeighVision session retrieved', {
      tenantId,
      sessionId,
      traceId: res.locals.traceId,
    })

    res.json(result)
  } catch (error: any) {
    logger.error('Error in getSessionByIdHandler', {
      error: error.message,
      traceId: res.locals.traceId,
    })

    // Map downstream errors to standard error envelope
    const status =
      error.response?.status || parseStatusFromErrorMessage(error.message) || 500

    if (status === 404) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'WeighVision session not found',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    } else if (isRetryableDownstreamStatus(status)) {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'WeighVision readmodel unavailable',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    } else if (error.response?.status) {
      res.status(error.response.status).json(error.response.data || {
        error: {
          code: 'DOWNSTREAM_ERROR',
          message: error.message || 'Failed to fetch weighvision session',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch weighvision session',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
  }
}

/**
 * Get weighvision analytics (proxy to weighvision-readmodel)
 */
export async function getAnalyticsHandler(req: Request, res: Response) {
  try {
    // Get tenantId from JWT or query param
    const tenantId = res.locals.tenantId || req.query.tenantId as string || req.query.tenant_id as string
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const farmId = req.query.farm_id as string | undefined || req.query.farmId as string | undefined
    const barnId = req.query.barn_id as string | undefined || req.query.barnId as string | undefined
    const batchId = req.query.batch_id as string | undefined || req.query.batchId as string | undefined
    const startDate = req.query.start_date as string
    const endDate = req.query.end_date as string
    const aggregation = (req.query.aggregation as 'daily' | 'weekly' | 'monthly') || 'daily'

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'start_date and end_date are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const result = await weighvisionService.getAnalytics({
      tenantId,
      farmId,
      barnId,
      batchId,
      startDate,
      endDate,
      aggregation,
    })

    logger.info('WeighVision analytics retrieved', {
      tenantId,
      traceId: res.locals.traceId,
    })

    res.json(result)
  } catch (error: any) {
    logger.error('Error in getAnalyticsHandler', {
      error: error.message,
      traceId: res.locals.traceId,
    })

    const status =
      error.response?.status || parseStatusFromErrorMessage(error.message) || 500

    if (isRetryableDownstreamStatus(status)) {
      return res.json(emptyAnalyticsPayload())
    }

    if (error.response?.status) {
      return res.status(error.response.status).json(error.response.data || {
        error: {
          code: 'DOWNSTREAM_ERROR',
          message: error.message || 'Failed to fetch weighvision analytics',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch weighvision analytics',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get weighvision weight aggregates (proxy to weighvision-readmodel)
 */
export async function getWeightAggregatesHandler(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenant_id as string || req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const farmId = req.query.farm_id as string | undefined || req.query.farmId as string | undefined
    const barnId = req.query.barn_id as string | undefined || req.query.barnId as string | undefined
    const batchId = req.query.batch_id as string | undefined || req.query.batchId as string | undefined
    const start = (req.query.start as string) || (req.query.start_date as string) || (req.query.startDate as string)
    const end = (req.query.end as string) || (req.query.end_date as string) || (req.query.endDate as string)

    if (!start || !end) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'start and end are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const result = await weighvisionService.getWeightAggregates({
      tenantId,
      farmId,
      barnId,
      batchId,
      start,
      end,
    })

    res.json(result)
  } catch (error: any) {
    logger.error('Error fetching weighvision weight aggregates:', error)
    const status =
      error.response?.status || parseStatusFromErrorMessage(error.message) || 500
    if (isRetryableDownstreamStatus(status)) {
      return res.json({ data: [], meta: { downstream_available: false } })
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch weighvision weight aggregates',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

