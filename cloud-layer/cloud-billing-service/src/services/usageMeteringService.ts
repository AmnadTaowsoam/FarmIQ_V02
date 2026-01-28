import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Record usage metric
 */
export async function recordUsageMetric(
  tenantId: string,
  metricType: string,
  value: number,
  period: 'hourly' | 'daily' | 'monthly',
  periodStart: Date,
  periodEnd: Date
) {
  try {
    return await prisma.usageMetric.upsert({
      where: {
        tenantId_metricType_period_periodStart: {
          tenantId,
          metricType,
          period,
          periodStart,
        },
      },
      create: {
        tenantId,
        metricType,
        value,
        period,
        periodStart,
        periodEnd,
      },
      update: {
        value: {
          increment: value,
        },
      },
    })
  } catch (error) {
    logger.error('Error recording usage metric', error)
    throw error
  }
}

/**
 * Get usage metrics for tenant
 */
export async function getUsageMetrics(
  tenantId: string,
  metricType?: string,
  period?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const where: any = { tenantId }
    if (metricType) where.metricType = metricType
    if (period) where.period = period
    if (startDate) where.periodStart = { gte: startDate }
    if (endDate) where.periodEnd = { lte: endDate }

    return await prisma.usageMetric.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    })
  } catch (error) {
    logger.error('Error getting usage metrics', error)
    throw error
  }
}

/**
 * Aggregate usage metrics
 */
export async function aggregateUsageMetrics(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
) {
  try {
    const metrics = await prisma.usageMetric.findMany({
      where: {
        tenantId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    })

    const aggregated: Record<string, number> = {}
    for (const metric of metrics) {
      if (!aggregated[metric.metricType]) {
        aggregated[metric.metricType] = 0
      }
      aggregated[metric.metricType] += metric.value
    }

    return aggregated
  } catch (error) {
    logger.error('Error aggregating usage metrics', error)
    throw error
  }
}
