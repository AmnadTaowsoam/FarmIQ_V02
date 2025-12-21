import { Request, Response } from 'express'
import { createWeighVisionServiceClient } from '../services/weighvisionService'
import { logger } from '../utils/logger'

const weighvisionService = createWeighVisionServiceClient()

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

    // Map downstream errors to standard error envelope
    if (error.response?.status) {
      res.status(error.response.status).json(error.response.data || {
        error: {
          code: 'DOWNSTREAM_ERROR',
          message: error.message || 'Failed to fetch weighvision sessions',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch weighvision sessions',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
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
    if (error.response?.status === 404) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'WeighVision session not found',
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

