import { Request, Response } from 'express'
import {
  recordUsageMetric,
  getUsageMetrics,
  aggregateUsageMetrics,
} from '../services/usageMeteringService'
import { logger } from '../utils/logger'

/**
 * Record usage metric
 */
export async function recordUsage(req: Request, res: Response) {
  try {
    const { tenantId, metricType, value, period, periodStart, periodEnd } = req.body

    if (!tenantId || !metricType || value === undefined || !period || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId, metricType, value, period, periodStart, and periodEnd are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const metric = await recordUsageMetric(
      tenantId,
      metricType,
      value,
      period,
      new Date(periodStart),
      new Date(periodEnd)
    )

    return res.status(201).json(metric)
  } catch (error) {
    logger.error('Error recording usage', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to record usage',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get usage metrics
 */
export async function getUsage(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    const { metricType, period, startDate, endDate } = req.query

    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const metrics = await getUsageMetrics(
      tenantId,
      metricType as string | undefined,
      period as string | undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    )

    return res.status(200).json({
      data: metrics,
      total: metrics.length,
    })
  } catch (error) {
    logger.error('Error getting usage metrics', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get usage metrics',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get aggregated usage
 */
export async function getAggregatedUsage(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    const { startDate, endDate } = req.query

    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const aggregated = await aggregateUsageMetrics(
      tenantId,
      startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate as string) : new Date()
    )

    return res.status(200).json(aggregated)
  } catch (error) {
    logger.error('Error getting aggregated usage', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get aggregated usage',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
