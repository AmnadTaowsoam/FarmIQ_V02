import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fixed IDs matching shared-seed-constants
const SEED_IDS = {
  TENANT_1: '00000000-0000-4000-8000-000000000001',
  TENANT_2: '00000000-0000-4000-8000-000000000002',
  FARM_1A: '00000000-0000-4000-8000-000000000101',
  FARM_1B: '00000000-0000-4000-8000-000000000102',
  FARM_2A: '00000000-0000-4000-8000-000000000201',
  FARM_2B: '00000000-0000-4000-8000-000000000202',
  BARN_1A_1: '00000000-0000-4000-8000-000000001101',
  BARN_1A_2: '00000000-0000-4000-8000-000000001102',
  BARN_1B_1: '00000000-0000-4000-8000-000000001201',
  BARN_1B_2: '00000000-0000-4000-8000-000000001202',
  BARN_2A_1: '00000000-0000-4000-8000-000000002101',
  BARN_2A_2: '00000000-0000-4000-8000-000000002102',
  BATCH_1A_1: '00000000-0000-4000-8000-000000010101',
  BATCH_1A_2: '00000000-0000-4000-8000-000000010102',
  BATCH_1B_1: '00000000-0000-4000-8000-000000010201',
  BATCH_1B_2: '00000000-0000-4000-8000-000000010202',
}

// Guard: prevent seed in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
  console.error('ERROR: Seed is not allowed in production!')
  console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
  process.exit(1)
}

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

async function main() {
  console.log(`Starting seed (SEED_COUNT=${SEED_COUNT})...`)

  // Idempotent: Clear existing data (dev only)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.reportJob.deleteMany({})
  }

  const jobCount = Math.max(SEED_COUNT, 30)
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]
  const batchIds = [SEED_IDS.BATCH_1A_1, SEED_IDS.BATCH_1A_2, SEED_IDS.BATCH_1B_1, SEED_IDS.BATCH_1B_2]
  const jobTypes = ['FEED_INTAKE_EXPORT', 'KPI_FEEDING_EXPORT', 'TELEMETRY_EXPORT', 'WEIGHVISION_EXPORT'] as const
  const formats = ['csv', 'json'] as const
  const statuses = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const
  const now = new Date()

  for (let i = 0; i < jobCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]
    const jobType = jobTypes[i % jobTypes.length]
    const format = formats[i % formats.length]
    const status = statuses[i % statuses.length]
    const startDate = new Date(now.getTime() - (30 + (i % 30)) * 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() - (i % 30) * 24 * 60 * 60 * 1000)

    const reportJob = await prisma.reportJob.create({
      data: {
        tenantId,
        requestedBy: `user-${(i % 10) + 1}`,
        jobType,
        format,
        farmId,
        barnId,
        batchId,
        startDate,
        endDate,
        filters: {
          includeMetadata: true,
          includeRawData: i % 2 === 0,
        },
        status,
        progressPct: status === 'succeeded' ? 100 :
                    status === 'running' ? 30 + (i % 70) :
                    status === 'failed' ? 50 :
                    0,
        filePath: status === 'succeeded' ? `/data/exports/report-${i}.${format}` : null,
        fileName: status === 'succeeded' ? `report-${i}.${format}` : null,
        mimeType: format === 'csv' ? 'text/csv' : 'application/json',
        sizeBytes: status === 'succeeded' ? BigInt(1024 * 100 * (i + 1)) : null,
        sha256: status === 'succeeded' ? `sha256-${i.toString().padStart(64, '0')}` : null,
        expiresAt: status === 'succeeded' ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        errorCode: status === 'failed' ? 'EXPORT_ERROR' : null,
        errorMessage: status === 'failed' ? `Export failed for job ${i}` : null,
        idempotencyKey: `idemp-report-${i}`,
        createdAt: new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)),
      },
    })

    if (i % 10 === 0) {
      console.log(`Created ${i + 1} report jobs...`)
    }
  }

  console.log(`Created ${jobCount} report jobs`)
  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
