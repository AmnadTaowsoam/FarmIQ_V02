import { PrismaClient } from '@prisma/client'
import { recordUsageMetric } from '../services/usageMeteringService'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Usage Metering Worker
 * Collects usage metrics from various sources and records them
 * Runs hourly to aggregate usage data
 */
async function collectUsageMetrics() {
  try {
    logger.info('Starting usage metrics collection')

    const now = new Date()
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

    // Get all active tenants
    const tenants = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM tenants WHERE status = 'active'
    `.catch(() => {
      // If query fails (tenant table might be in different DB), continue
      logger.warn('Could not fetch tenants from tenant registry, skipping tenant-specific metrics')
      return []
    })

    for (const tenant of tenants) {
      try {
        // Collect device count
        const deviceCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM devices WHERE tenant_id = ${tenant.id}
        `.catch(() => [{ count: BigInt(0) }])

        await recordUsageMetric(
          tenant.id,
          'devices',
          Number(deviceCount[0]?.count || 0),
          'hourly',
          hourStart,
          hourEnd
        )

        // Collect API calls (would need to be tracked separately, e.g., in API gateway)
        // This is a placeholder - actual implementation would query API gateway metrics
        await recordUsageMetric(
          tenant.id,
          'api_calls',
          0, // Placeholder - would be fetched from API gateway metrics
          'hourly',
          hourStart,
          hourEnd
        )

        logger.debug('Collected usage metrics for tenant', { tenantId: tenant.id })
      } catch (error) {
        logger.error('Error collecting metrics for tenant', { tenantId: tenant.id, error })
      }
    }

    logger.info('Usage metrics collection completed')
  } catch (error) {
    logger.error('Error in usage metrics collection', error)
  }
}

/**
 * Run worker
 */
async function runWorker() {
  logger.info('Usage metering worker started')
  
  // Run immediately
  await collectUsageMetrics()

  // Then run every hour
  setInterval(async () => {
    await collectUsageMetrics()
  }, 60 * 60 * 1000)
}

// Start worker if run directly
if (require.main === module) {
  runWorker().catch((error) => {
    logger.error('Worker failed to start', error)
    process.exit(1)
  })
}

export { runWorker, collectUsageMetrics }
