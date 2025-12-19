import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * RabbitMQ event envelope (from cloud-ingestion)
 */
export interface TelemetryIngestedEvent {
  event_id: string
  event_type: string
  tenant_id: string
  farm_id?: string
  barn_id?: string
  device_id: string
  session_id?: string
  occurred_at: string
  trace_id: string
  payload: {
    metric_type?: string
    metric_value: number
    unit?: string
  }
}

/**
 * Persist telemetry reading to telemetry_raw table
 * Deduplication handled by unique constraint (tenantId, eventId)
 */
export async function persistTelemetryReading(event: TelemetryIngestedEvent) {
  try {
    const metric = event.payload.metric_type || 'unknown'
    const value = event.payload.metric_value
    const unit = event.payload.unit

    // Try to create - if duplicate, Prisma will throw P2002
    await prisma.telemetryRaw.create({
      data: {
        tenantId: event.tenant_id,
        farmId: event.farm_id || null,
        barnId: event.barn_id || null,
        deviceId: event.device_id,
        batchId: null,
        metric,
        value,
        unit: unit || null,
        occurredAt: new Date(event.occurred_at),
        traceId: event.trace_id || null,
        eventId: event.event_id,
      },
    })

    logger.debug('Telemetry reading persisted', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      deviceId: event.device_id,
      metric,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    // If it's a unique constraint violation, it's a duplicate - that's ok
    if (error.code === 'P2002') {
      logger.debug('Duplicate telemetry event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error persisting telemetry reading', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Get telemetry readings with filters
 */
export async function getTelemetryReadings(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  deviceId?: string
  metric?: string
  from?: Date
  to?: Date
  limit?: number
}) {
  try {
    const where: any = {
      tenantId: params.tenantId,
    }

    if (params.farmId) where.farmId = params.farmId
    if (params.barnId) where.barnId = params.barnId
    if (params.deviceId) where.deviceId = params.deviceId
    if (params.metric) where.metric = params.metric
    if (params.from || params.to) {
      where.occurredAt = {}
      if (params.from) where.occurredAt.gte = params.from
      if (params.to) where.occurredAt.lte = params.to
    }

    const readings = await prisma.telemetryRaw.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: params.limit || 1000,
    })

    return readings
  } catch (error) {
    logger.error('Error fetching telemetry readings', { error, params })
    throw error
  }
}

/**
 * Get available metrics for a tenant (optionally filtered)
 */
export async function getAvailableMetrics(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  deviceId?: string
}) {
  try {
    const where: any = {
      tenantId: params.tenantId,
    }

    if (params.farmId) where.farmId = params.farmId
    if (params.barnId) where.barnId = params.barnId
    if (params.deviceId) where.deviceId = params.deviceId

    const metrics = await prisma.telemetryRaw.findMany({
      where,
      select: {
        metric: true,
        deviceId: true,
      },
      distinct: ['metric', 'deviceId'],
    })

    // Group by metric
    const metricSet = new Set<string>()
    metrics.forEach((m) => metricSet.add(m.metric))

    return Array.from(metricSet)
  } catch (error) {
    logger.error('Error fetching available metrics', { error, params })
    throw error
  }
}

