import { Request, Response } from 'express'
import {
  getTelemetryReadings,
  getAvailableMetrics,
} from '../services/telemetryService'
import {
  getAggregates,
  computeAggregates,
} from '../services/aggregationService'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'

/**
 * Get telemetry readings
 */
export async function getReadings(req: Request, res: Response) {
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

    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    const deviceId = req.query.deviceId as string | undefined
    const metric = req.query.metric as string | undefined
    const from = req.query.from ? new Date(req.query.from as string) : undefined
    const to = req.query.to ? new Date(req.query.to as string) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 1000

    if (limit > 10000) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'limit cannot exceed 10000',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const readings = await getTelemetryReadings({
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric,
      from,
      to,
      limit,
    })

    res.json(readings)
  } catch (error) {
    logger.error('Error in getReadings:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch telemetry readings',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get telemetry aggregates
 */
export async function getAggregatesHandler(req: Request, res: Response) {
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

    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    const deviceId = req.query.deviceId as string | undefined
    const metric = req.query.metric as string | undefined
    const from = req.query.from ? new Date(req.query.from as string) : undefined
    const to = req.query.to ? new Date(req.query.to as string) : undefined
    const bucket = (req.query.bucket as string) || '1h' // Default to 1 hour

    if (!['5m', '1h', '1d'].includes(bucket)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'bucket must be one of: 5m, 1h, 1d',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    if (!from || !to) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'from and to dates are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    // Try to get pre-computed aggregates first
    let aggregates = await getAggregates({
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric,
      from,
      to,
      bucketSize: bucket,
    })

    // If no pre-computed aggregates, compute on-the-fly
    if (aggregates.length === 0) {
      const computed = await computeAggregates({
        tenantId,
        farmId,
        barnId,
        deviceId,
        metric,
        from,
        to,
        bucketSize: bucket,
      })

      // Optionally persist computed aggregates (async, don't wait)
      // This could be done in a background job
      aggregates = computed.map((agg) => ({
        id: '',
        tenantId: agg.tenant_id,
        farmId: agg.farm_id || null,
        barnId: agg.barn_id || null,
        deviceId: agg.device_id,
        metric: agg.metric,
        bucketStart: agg.bucket_start,
        bucketSize: agg.bucket_size,
        avgValue: agg.avg_value,
        minValue: agg.min_value,
        maxValue: agg.max_value,
        count: agg.count,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    }

    res.json(aggregates)
  } catch (error) {
    logger.error('Error in getAggregatesHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch telemetry aggregates',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get available metrics
 */
export async function getMetrics(req: Request, res: Response) {
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

    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    const deviceId = req.query.deviceId as string | undefined

    const metrics = await getAvailableMetrics({
      tenantId,
      farmId,
      barnId,
      deviceId,
    })

    res.json({ metrics })
  } catch (error) {
    logger.error('Error in getMetrics:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch available metrics',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

