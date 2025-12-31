import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

export interface TelemetryEvent {
  schema_version?: string
  event_id: string
  trace_id?: string
  tenant_id: string
  device_id: string
  event_type: string
  ts: string
  farm_id?: string
  barn_id?: string
  payload: {
    metric?: string
    value: number
    unit?: string
  }
}

export interface IngestReadingParams {
  eventId: string
  tenantId: string
  farmId?: string
  barnId?: string
  deviceId: string
  metricType: string
  metricValue: number
  unit?: string
  occurredAt: Date
  traceId?: string
}

export interface QueryReadingsParams {
  tenantId: string
  deviceId?: string
  startTime?: Date
  endTime?: Date
  limit?: number
}

export interface QueryAggregatesParams {
  tenantId: string
  deviceId?: string
  window: '1m' | '1h' | '1d'
  startTime?: Date
  endTime?: Date
  limit?: number
}

export class TelemetryService {
  constructor(private prisma: PrismaClient) {}

  async ingestReading(params: IngestReadingParams): Promise<string> {
    const reading = await this.prisma.telemetryRaw.create({
      data: {
        tenantId: params.tenantId,
        farmId: params.farmId || null,
        barnId: params.barnId || null,
        deviceId: params.deviceId,
        metricType: params.metricType,
        metricValue: params.metricValue,
        unit: params.unit || null,
        occurredAt: params.occurredAt,
      },
    })

    // Write outbox event to sync_outbox table (shared table, use raw SQL)
    try {
      const payloadJson = JSON.stringify({
        telemetry_raw_id: reading.id,
        tenant_id: params.tenantId,
        device_id: params.deviceId,
        metric_type: params.metricType,
        metric_value: params.metricValue,
        unit: params.unit,
        occurred_at: params.occurredAt.toISOString(),
      })

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO sync_outbox (
          id, tenant_id, farm_id, barn_id, device_id, event_type, occurred_at, trace_id, payload_json, status, next_attempt_at, priority, attempt_count, created_at, updated_at
        ) VALUES (
          $1::uuid,
          $2::text,
          $3::text,
          $4::text,
          $5::text,
          'telemetry.ingested',
          $6::timestamptz,
          $7::text,
          $8::jsonb,
          'pending',
          NOW(),
          0,
          0,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING`,
        params.eventId,
        params.tenantId,
        params.farmId || null,
        params.barnId || null,
        params.deviceId,
        params.occurredAt,
        params.traceId || null,
        payloadJson
      )
    } catch (error) {
      logger.error('Failed to write outbox event', {
        error: error instanceof Error ? error.message : String(error),
        telemetryRawId: reading.id,
      })
      // Continue even if outbox write fails - telemetry is already stored
    }

    return reading.id
  }

  async queryReadings(params: QueryReadingsParams) {
    const where: Prisma.TelemetryRawWhereInput = {
      tenantId: params.tenantId,
    }

    if (params.deviceId) {
      where.deviceId = params.deviceId
    }

    if (params.startTime || params.endTime) {
      where.occurredAt = {}
      if (params.startTime) {
        where.occurredAt.gte = params.startTime
      }
      if (params.endTime) {
        where.occurredAt.lte = params.endTime
      }
    }

    const readings = await this.prisma.telemetryRaw.findMany({
      where,
      orderBy: {
        occurredAt: 'desc',
      },
      take: params.limit || 100,
    })

    return readings
  }

  async createAggregate(
    tenantId: string,
    deviceId: string,
    window: '1m' | '1h' | '1d',
    metricType: string,
    bucketStartAt: Date,
    bucketEndAt: Date,
    readings: Array<{ metricValue: number }>
  ): Promise<string> {
    const values = readings.map((r) => Number(r.metricValue))
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const count = values.length

    const aggregate = await this.prisma.telemetryAgg.upsert({
      where: {
        tenantId_deviceId_window_bucketStartAt_metricType: {
          tenantId,
          deviceId,
          window,
          bucketStartAt,
          metricType,
        },
      },
      create: {
        tenantId,
        deviceId,
        window,
        bucketStartAt,
        bucketEndAt,
        metricType,
        avgValue,
        minValue,
        maxValue,
        count,
      },
      update: {
        avgValue,
        minValue,
        maxValue,
        count,
      },
    })

    return aggregate.id
  }

  async queryAggregates(params: QueryAggregatesParams) {
    const where: Prisma.TelemetryAggWhereInput = {
      tenantId: params.tenantId,
      window: params.window,
    }

    if (params.deviceId) {
      where.deviceId = params.deviceId
    }

    if (params.startTime || params.endTime) {
      where.bucketStartAt = {}
      if (params.startTime) {
        where.bucketStartAt.gte = params.startTime
      }
      if (params.endTime) {
        where.bucketEndAt = { lte: params.endTime }
      }
    }

    const aggregates = await this.prisma.telemetryAgg.findMany({
      where,
      orderBy: {
        bucketStartAt: 'desc',
      },
      take: params.limit || 100,
    })

    return aggregates
  }

  async getMetrics(tenantId?: string) {
    const whereTenant = tenantId ? { tenantId } : undefined

    const [totalReadings, totalAggregates] = await Promise.all([
      this.prisma.telemetryRaw.count({ where: whereTenant }),
      this.prisma.telemetryAgg.count({ where: whereTenant }),
    ])

    // Calculate ingestion rate (last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const recentReadings = await this.prisma.telemetryRaw.count({
      where: {
        ...(whereTenant ?? {}),
        ingestedAt: {
          gte: oneMinuteAgo,
        },
      },
    })

    return {
      ingestionRatePerMinute: recentReadings,
      totalReadings,
      totalAggregates,
    }
  }

  async getLastReading(tenantId: string): Promise<{ occurredAt: Date } | null> {
    const row = await this.prisma.telemetryRaw.findFirst({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    })

    return row ?? null
  }

  async ingestEvents(events: TelemetryEvent[]): Promise<number> {
    let ingestedCount = 0

    for (const event of events) {
      try {
        const metricType = event.payload.metric || 'unknown'
        const metricValue = event.payload.value
        const unit = event.payload.unit

        const occurredAt = new Date(event.ts)

        await this.ingestReading({
          eventId: event.event_id,
          tenantId: event.tenant_id,
          farmId: event.farm_id,
          barnId: event.barn_id,
          deviceId: event.device_id,
          metricType,
          metricValue,
          unit,
          occurredAt,
          traceId: event.trace_id,
        })

        ingestedCount++
      } catch (error) {
        logger.error('Failed to ingest telemetry event', {
          error: error instanceof Error ? error.message : String(error),
          eventId: event.event_id,
          traceId: event.trace_id,
        })
        // Continue processing other events
      }
    }

    return ingestedCount
  }
}

