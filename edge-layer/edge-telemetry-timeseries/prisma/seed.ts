import { PrismaClient, Prisma } from '@prisma/client'
import { SEED_IDS, getAllDeviceIds } from './seed-constants'

const prisma = new PrismaClient()

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
    await prisma.telemetryAgg.deleteMany({})
    await prisma.telemetryRaw.deleteMany({})
  }

  const deviceIds = getAllDeviceIds()
  const now = Date.now()
  const metrics = ['temperature', 'humidity', 'weight']
  const units: Record<string, string> = {
    temperature: 'C',
    humidity: '%',
    weight: 'kg',
  }

  // Create TelemetryRaw records: at least SEED_COUNT
  const rawCount = Math.max(SEED_COUNT, 30)
  const rawRecords = []

  const deviceConfig = [
    { id: SEED_IDS.DEVICE_SENSOR_1, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_SENSOR_2, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_WEIGH_1, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_SENSOR_3, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_WEIGH_2, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_SENSOR_4, tenantId: SEED_IDS.TENANT_2 },
    { id: SEED_IDS.DEVICE_WEIGH_3, tenantId: SEED_IDS.TENANT_2 },
    { id: SEED_IDS.DEVICE_SENSOR_5, tenantId: SEED_IDS.TENANT_2 },
  ]

  for (let i = 0; i < rawCount; i++) {
    const config = deviceConfig[i % deviceConfig.length]
    const metric = metrics[i % metrics.length]
    const minutesAgo = Math.floor(i / deviceConfig.length)

    rawRecords.push({
      tenantId: config.tenantId,
      farmId: SEED_IDS.FARM_1A,
      barnId: SEED_IDS.BARN_1A_1,
      deviceId: config.id,
      metricType: metric,
      metricValue: new Prisma.Decimal(
        metric === 'temperature' ? 25 + (i % 10) * 0.5 :
        metric === 'humidity' ? 60 + (i % 15) :
        metric === 'weight' ? 1.2 + (i % 20) * 0.1 : 0
      ),
      unit: units[metric] || null,
      occurredAt: new Date(now - minutesAgo * 60 * 1000),
    })
  }

  // Insert with skipDuplicates for idempotency
  await prisma.telemetryRaw.createMany({
    data: rawRecords,
    skipDuplicates: true,
  })
  console.log(`Inserted ${rawRecords.length} telemetry_raw records`)

  // Create TelemetryAgg records
  const aggCount = Math.max(SEED_COUNT, 30)
  const aggRecords = []

  for (let i = 0; i < aggCount; i++) {
    const config = deviceConfig[i % deviceConfig.length]
    const metric = metrics[i % metrics.length]
    const window = ['1m', '1h', '1d'][i % 3]
    const hoursAgo = Math.floor(i / 3)

    const baseValue = metric === 'temperature' ? 25 : metric === 'humidity' ? 65 : 1.5

    aggRecords.push({
      tenantId: config.tenantId,
      deviceId: config.id,
      metricType: metric,
      window,
      bucketStartAt: new Date(now - hoursAgo * 60 * 60 * 1000),
      bucketEndAt: new Date(now - hoursAgo * 60 * 60 * 1000 + 60 * 60 * 1000),
      avgValue: new Prisma.Decimal(baseValue + (i % 5)),
      minValue: new Prisma.Decimal(baseValue + (i % 5) - 1),
      maxValue: new Prisma.Decimal(baseValue + (i % 5) + 1),
      count: 10 + (i % 5),
    })
  }

  // Upsert aggregate records
  for (const record of aggRecords) {
    await prisma.telemetryAgg.upsert({
      where: {
        tenantId_deviceId_window_bucketStartAt_metricType: {
          tenantId: record.tenantId,
          deviceId: record.deviceId,
          window: record.window,
          bucketStartAt: record.bucketStartAt,
          metricType: record.metricType,
        },
      },
      update: {
        avgValue: record.avgValue,
        minValue: record.minValue,
        maxValue: record.maxValue,
        count: record.count,
        bucketEndAt: record.bucketEndAt,
      },
      create: record,
    })
  }
  console.log(`Upserted ${aggRecords.length} telemetry_agg records`)

  console.log('Seed completed successfully!')
  console.log(`Summary: ${rawRecords.length} raw records, ${aggRecords.length} aggregate records`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
