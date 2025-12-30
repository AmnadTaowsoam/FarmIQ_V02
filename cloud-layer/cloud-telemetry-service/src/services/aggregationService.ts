import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

/**
 * Compute aggregates for a time window
 * Bucket sizes: "5m", "1h", "1d"
 */
export async function computeAggregates(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  deviceId?: string
  metric?: string
  from: Date
  to: Date
  bucketSize: string // "5m", "1h", "1d"
}) {
  try {
    // Parse bucket size to interval
    let interval: string
    switch (params.bucketSize) {
      case '5m':
        interval = '5 minutes'
        break
      case '1h':
        interval = '1 hour'
        break
      case '1d':
        interval = '1 day'
        break
      default:
        throw new Error(`Unsupported bucket size: ${params.bucketSize}`)
    }

    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`"tenantId" = ${params.tenantId}`,
      Prisma.sql`"occurredAt" >= ${params.from}`,
      Prisma.sql`"occurredAt" <= ${params.to}`,
    ]

    if (params.farmId) whereConditions.push(Prisma.sql`"farmId" = ${params.farmId}`)
    if (params.barnId) whereConditions.push(Prisma.sql`"barnId" = ${params.barnId}`)
    if (params.deviceId) whereConditions.push(Prisma.sql`"deviceId" = ${params.deviceId}`)
    if (params.metric) whereConditions.push(Prisma.sql`metric = ${params.metric}`)

    const whereClause = Prisma.join(whereConditions, ' AND ')
    const intervalSql = Prisma.raw(`'${interval}'::interval`)

    // Use raw SQL for time-bucketing aggregation
    const query = Prisma.sql`
      SELECT
        "tenantId" as tenant_id,
        COALESCE("farmId", '') as farm_id,
        COALESCE("barnId", '') as barn_id,
        "deviceId" as device_id,
        metric,
        date_bin(${intervalSql}, "occurredAt", '2000-01-01'::timestamp) as bucket_start,
        ${params.bucketSize} as bucket_size,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*)::int as count
      FROM "telemetry_raw"
      WHERE ${whereClause}
      GROUP BY "tenantId", "farmId", "barnId", "deviceId", metric, bucket_start
      ORDER BY bucket_start DESC
    `

    const results = await prisma.$queryRaw<
      Array<{
        tenant_id: string
        farm_id: string
        barn_id: string
        device_id: string
        metric: string
        bucket_start: Date
        bucket_size: string
        avg_value: number
        min_value: number
        max_value: number
        count: number
      }>
    >(query)

    return results
  } catch (error) {
    logger.error('Error computing aggregates', { error, params })
    throw error
  }
}

/**
 * Upsert aggregate into telemetry_agg table
 */
export async function upsertAggregate(data: {
  tenantId: string
  farmId?: string
  barnId?: string
  deviceId: string
  metric: string
  bucketStart: Date
  bucketSize: string
  avgValue: number
  minValue: number
  maxValue: number
  count: number
}) {
  try {
    await prisma.telemetryAgg.upsert({
      where: {
        tenantId_farmId_barnId_deviceId_metric_bucketStart_bucketSize: {
          tenantId: data.tenantId,
          // Prisma's compound-unique input does not accept nulls here, so normalize to empty string.
          // This matches the aggregation query which COALESCEs farmId/barnId to ''.
          farmId: data.farmId || '',
          barnId: data.barnId || '',
          deviceId: data.deviceId,
          metric: data.metric,
          bucketStart: data.bucketStart,
          bucketSize: data.bucketSize,
        },
      },
      update: {
        avgValue: data.avgValue,
        minValue: data.minValue,
        maxValue: data.maxValue,
        count: data.count,
      },
      create: {
        id: newUuidV7(),
        tenantId: data.tenantId,
        farmId: data.farmId || '',
        barnId: data.barnId || '',
        deviceId: data.deviceId,
        metric: data.metric,
        bucketStart: data.bucketStart,
        bucketSize: data.bucketSize,
        avgValue: data.avgValue,
        minValue: data.minValue,
        maxValue: data.maxValue,
        count: data.count,
      },
    })
  } catch (error) {
    logger.error('Error upserting aggregate', { error, data })
    throw error
  }
}

/**
 * Get aggregates from telemetry_agg table (pre-computed)
 */
export async function getAggregates(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  deviceId?: string
  metric?: string
  from?: Date
  to?: Date
  bucketSize?: string
}) {
  try {
    const where: any = {
      tenantId: params.tenantId,
    }

    if (params.farmId) where.farmId = params.farmId
    if (params.barnId) where.barnId = params.barnId
    if (params.deviceId) where.deviceId = params.deviceId
    if (params.metric) where.metric = params.metric
    if (params.bucketSize) where.bucketSize = params.bucketSize
    if (params.from || params.to) {
      where.bucketStart = {}
      if (params.from) where.bucketStart.gte = params.from
      if (params.to) where.bucketStart.lte = params.to
    }

    const aggregates = await prisma.telemetryAgg.findMany({
      where,
      orderBy: { bucketStart: 'desc' },
    })

    return aggregates
  } catch (error) {
    logger.error('Error fetching aggregates', { error, params })
    throw error
  }
}
