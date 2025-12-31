import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { TelemetryService } from '../services/telemetryService'
import { z } from 'zod'

// Validation schemas
const ingestReadingsSchema = z.object({
  events: z.array(
    z.object({
      schema_version: z.string().optional(),
      event_id: z.string(),
      trace_id: z.string().optional(),
      tenant_id: z.string(),
      device_id: z.string(),
      event_type: z.string(),
      ts: z.string(),
      farm_id: z.string().optional(),
      barn_id: z.string().optional(),
      payload: z.object({
        metric: z.string().optional(),
        value: z.number(),
        unit: z.string().optional(),
      }),
    })
  ),
})

const queryReadingsSchema = z.object({
  tenant_id: z.string(),
  device_id: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
})

const queryAggregatesSchema = z.object({
  tenant_id: z.string(),
  device_id: z.string().optional(),
  window: z.enum(['1m', '1h', '1d']),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
})

export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  ingestReadings = async (req: Request, res: Response): Promise<void> => {
    const traceId = res.locals.traceId || (req as any).traceId || 'unknown'

    try {
      const validated = ingestReadingsSchema.parse(req.body)
      const ingestedCount = await this.telemetryService.ingestEvents(validated.events)

      res.status(200).json({
        ingested_count: ingestedCount,
      })
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors,
            traceId,
          },
        })
        return
      }

      logger.error('Failed to ingest readings', {
        error: error instanceof Error ? error.message : String(error),
        traceId,
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to ingest readings',
          traceId,
        },
      })
    }
  }

  queryReadings = async (req: Request, res: Response): Promise<void> => {
    const traceId = res.locals.traceId || (req as any).traceId || 'unknown'

    try {
      const validated = queryReadingsSchema.parse({
        tenant_id: req.query.tenant_id,
        device_id: req.query.device_id,
        start_time: req.query.start_time,
        end_time: req.query.end_time,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })

      const readings = await this.telemetryService.queryReadings({
        tenantId: validated.tenant_id,
        deviceId: validated.device_id,
        startTime: validated.start_time ? new Date(validated.start_time) : undefined,
        endTime: validated.end_time ? new Date(validated.end_time) : undefined,
        limit: validated.limit || 100,
      })

      res.status(200).json({
        readings: readings.map((r) => ({
          id: r.id,
          tenant_id: r.tenantId,
          farm_id: r.farmId,
          barn_id: r.barnId,
          device_id: r.deviceId,
          metric_type: r.metricType,
          metric_value: Number(r.metricValue),
          unit: r.unit,
          occurred_at: r.occurredAt.toISOString(),
          ingested_at: r.ingestedAt.toISOString(),
        })),
        count: readings.length,
      })
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors,
            traceId,
          },
        })
        return
      }

      logger.error('Failed to query readings', {
        error: error instanceof Error ? error.message : String(error),
        traceId,
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query readings',
          traceId,
        },
      })
    }
  }

  queryAggregates = async (req: Request, res: Response): Promise<void> => {
    const traceId = res.locals.traceId || (req as any).traceId || 'unknown'

    try {
      const validated = queryAggregatesSchema.parse({
        tenant_id: req.query.tenant_id,
        device_id: req.query.device_id,
        window: req.query.window || '1h',
        start_time: req.query.start_time,
        end_time: req.query.end_time,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })

      const aggregates = await this.telemetryService.queryAggregates({
        tenantId: validated.tenant_id,
        deviceId: validated.device_id,
        window: validated.window,
        startTime: validated.start_time ? new Date(validated.start_time) : undefined,
        endTime: validated.end_time ? new Date(validated.end_time) : undefined,
        limit: validated.limit || 100,
      })

      res.status(200).json({
        aggregates: aggregates.map((a) => ({
          id: a.id,
          tenant_id: a.tenantId,
          device_id: a.deviceId,
          window: a.window,
          bucket_start_at: a.bucketStartAt.toISOString(),
          bucket_end_at: a.bucketEndAt.toISOString(),
          metric_type: a.metricType,
          avg_value: Number(a.avgValue),
          min_value: Number(a.minValue),
          max_value: Number(a.maxValue),
          count: a.count,
        })),
        count: aggregates.length,
      })
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors,
            traceId,
          },
        })
        return
      }

      logger.error('Failed to query aggregates', {
        error: error instanceof Error ? error.message : String(error),
        traceId,
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query aggregates',
          traceId,
        },
      })
    }
  }

  getMetrics = async (req: Request, res: Response): Promise<void> => {
    const traceId = res.locals.traceId || (req as any).traceId || 'unknown'

    try {
      const metrics = await this.telemetryService.getMetrics()

      res.status(200).json(metrics)
    } catch (error: unknown) {
      logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : String(error),
        traceId,
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get metrics',
          traceId,
        },
      })
    }
  }

  getHealth = (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'healthy' })
  }

  getStats = async (req: Request, res: Response): Promise<void> => {
    const traceId = res.locals.traceId || (req as any).traceId || 'unknown'

    try {
      // Get tenant_id from query or request header
      const tenantId = (req.query.tenant_id as string) || (req.headers['x-tenant-id'] as string);

      // Get metrics from service
      const metrics = await this.telemetryService.getMetrics(tenantId);

      // Get aggregate readings count (sum of all aggregates)
      const totalReadingsCount = metrics.totalReadings || 0;
      const totalAggregatesCount = metrics.totalAggregates || 0;

      // Get last reading timestamp
      let lastReadingAt: string | undefined;
      try {
        const lastReading = await this.telemetryService.getLastReading(tenantId);
        lastReadingAt = lastReading ? lastReading.occurredAt.toISOString() : undefined;
      } catch (e) {
        // If query fails, we'll omit the timestamp
      }

      res.status(200).json({
        total_readings: totalReadingsCount,
        total_aggregates: totalAggregatesCount,
        last_reading_at: lastReadingAt,
        tenant_id: tenantId,
      })
    } catch (error) {
      logger.error('Failed to get telemetry stats', {
        error: error instanceof Error ? error.message : String(error),
        traceId,
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get telemetry stats',
          traceId,
        },
      })
    }
  }

  getReady = async (_req: Request, res: Response): Promise<void> => {
    try {
      await this.telemetryService['prisma'].$queryRaw`SELECT 1`
      res.status(200).json({ status: 'ready' })
    } catch (error) {
      logger.error('Readiness check failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(503).json({ status: 'not_ready', error: 'Database unavailable' })
    }
  }
}

