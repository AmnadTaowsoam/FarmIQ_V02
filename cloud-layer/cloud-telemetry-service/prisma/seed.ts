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
  const now = new Date()
  const metrics = ['temperature', 'humidity', 'weight', 'co2', 'ammonia']
  const units: Record<string, string> = {
    temperature: 'C',
    humidity: '%',
    weight: 'kg',
    co2: 'ppm',
    ammonia: 'ppm',
  }

  // Create TelemetryRaw records: SEED_COUNT per device = 30+ * 30 devices = 900+ records minimum
  // But for performance, let's create SEED_COUNT records distributed across devices
  const rawRecords: Array<{
    tenantId: string
    farmId: string | null
    barnId: string | null
    deviceId: string
    batchId: string | null
    metric: string
    value: Prisma.Decimal
    unit: string | null
    occurredAt: Date
    traceId: string
    eventId: string
  }> = []

  const deviceConfig = [
    { id: SEED_IDS.DEVICE_SENSOR_1, farmId: SEED_IDS.FARM_1A, barnId: SEED_IDS.BARN_1A_1, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_SENSOR_2, farmId: SEED_IDS.FARM_1A, barnId: SEED_IDS.BARN_1A_2, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_WEIGH_1, farmId: SEED_IDS.FARM_1A, barnId: SEED_IDS.BARN_1A_1, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_SENSOR_3, farmId: SEED_IDS.FARM_1B, barnId: SEED_IDS.BARN_1B_1, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_WEIGH_2, farmId: SEED_IDS.FARM_1B, barnId: SEED_IDS.BARN_1B_2, tenantId: SEED_IDS.TENANT_1 },
    { id: SEED_IDS.DEVICE_SENSOR_4, farmId: SEED_IDS.FARM_2A, barnId: SEED_IDS.BARN_2A_1, tenantId: SEED_IDS.TENANT_2 },
    { id: SEED_IDS.DEVICE_WEIGH_3, farmId: SEED_IDS.FARM_2A, barnId: SEED_IDS.BARN_2A_2, tenantId: SEED_IDS.TENANT_2 },
    { id: SEED_IDS.DEVICE_SENSOR_5, farmId: SEED_IDS.FARM_2B, barnId: SEED_IDS.BARN_2B_1, tenantId: SEED_IDS.TENANT_2 },
  ]

  // Generate at least SEED_COUNT raw records
  const rawCount = Math.max(SEED_COUNT, 30)
  for (let i = 0; i < rawCount; i++) {
    const config = deviceConfig[i % deviceConfig.length]
    const metric = metrics[i % metrics.length]
    const hoursAgo = Math.floor(i / deviceConfig.length)
    const minutesOffset = (i % deviceConfig.length) * 10

    rawRecords.push({
      tenantId: config.tenantId,
      farmId: config.farmId,
      barnId: config.barnId,
      deviceId: config.id,
      batchId: SEED_IDS.BATCH_1A_1,
      metric,
      value: new Prisma.Decimal(
        metric === 'temperature' ? 25 + (i % 10) * 0.5 :
        metric === 'humidity' ? 60 + (i % 15) :
        metric === 'weight' ? 1.2 + (i % 20) * 0.1 :
        metric === 'co2' ? 800 + (i % 200) :
        metric === 'ammonia' ? 10 + (i % 5) : 0
      ),
      unit: units[metric] || null,
      occurredAt: new Date(now.getTime() - (hoursAgo * 60 + minutesOffset) * 60 * 1000), // Spread over 7 days
      traceId: `trace-${i.toString().padStart(6, '0')}`,
      eventId: `event-${i.toString().padStart(6, '0')}`,
    })
  }

  // Upsert raw records (idempotent by unique constraint tenantId + eventId)
  for (const record of rawRecords) {
    await prisma.telemetryRaw.upsert({
      where: {
        tenantId_eventId: {
          tenantId: record.tenantId,
          eventId: record.eventId,
        },
      },
      update: {
        value: record.value,
        occurredAt: record.occurredAt,
      },
      create: record,
    })
  }
  console.log(`Upserted ${rawRecords.length} telemetry_raw records`)

  // Create TelemetryAgg records (aggregated data)
  const aggRecords: Array<{
    tenantId: string
    farmId: string | null
    barnId: string | null
    deviceId: string
    metric: string
    bucketStart: Date
    bucketSize: string
    avgValue: Prisma.Decimal
    minValue: Prisma.Decimal
    maxValue: Prisma.Decimal
    count: number
  }> = []

  // Generate at least SEED_COUNT aggregate records
  const aggCount = Math.max(SEED_COUNT, 30)
  for (let i = 0; i < aggCount; i++) {
    const config = deviceConfig[i % deviceConfig.length]
    const metric = metrics[i % metrics.length]
    const bucketSize = ['5m', '1h', '1d'][i % 3]
    const hoursAgo = Math.floor(i / 3)

    const baseValue =
      metric === 'temperature' ? 25 :
      metric === 'humidity' ? 65 :
      metric === 'weight' ? 1.5 :
      metric === 'co2' ? 900 :
      15

    aggRecords.push({
      tenantId: config.tenantId,
      farmId: config.farmId,
      barnId: config.barnId,
      deviceId: config.id,
      metric,
      bucketStart: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
      bucketSize,
      avgValue: new Prisma.Decimal(baseValue + (i % 5)),
      minValue: new Prisma.Decimal(baseValue + (i % 5) - 1),
      maxValue: new Prisma.Decimal(baseValue + (i % 5) + 1),
      count: 10 + (i % 5),
    })
  }

  // Upsert aggregate records (filter out records with null farmId/barnId as they can't be used in composite key)
  // Type guard function to filter valid records
  type ValidAggRecord = {
    tenantId: string
    farmId: string
    barnId: string
    deviceId: string
    metric: string
    bucketStart: Date
    bucketSize: string
    avgValue: Prisma.Decimal
    minValue: Prisma.Decimal
    maxValue: Prisma.Decimal
    count: number
  };
  
  const validAggRecords: ValidAggRecord[] = [];
  
  for (const r of aggRecords) {
    // Only process records with non-null farmId and barnId
    if (r.farmId && r.barnId) {
      validAggRecords.push({
        tenantId: r.tenantId,
        farmId: r.farmId,
        barnId: r.barnId,
        deviceId: r.deviceId,
        metric: r.metric,
        bucketStart: r.bucketStart,
        bucketSize: r.bucketSize,
        avgValue: r.avgValue,
        minValue: r.minValue,
        maxValue: r.maxValue,
        count: r.count,
      });
    }
  }
  
  for (const record of validAggRecords) {
    await prisma.telemetryAgg.upsert({
      where: {
        tenantId_farmId_barnId_deviceId_metric_bucketStart_bucketSize: {
          tenantId: record.tenantId,
          farmId: record.farmId,
          barnId: record.barnId,
          deviceId: record.deviceId,
          metric: record.metric,
          bucketStart: record.bucketStart,
          bucketSize: record.bucketSize,
        },
      },
      update: {
        avgValue: record.avgValue,
        minValue: record.minValue,
        maxValue: record.maxValue,
        count: record.count,
      },
      create: {
        tenantId: record.tenantId,
        farmId: record.farmId,
        barnId: record.barnId,
        deviceId: record.deviceId,
        metric: record.metric,
        bucketStart: record.bucketStart,
        bucketSize: record.bucketSize,
        avgValue: record.avgValue,
        minValue: record.minValue,
        maxValue: record.maxValue,
        count: record.count,
      },
    })
  }
  console.log(`Upserted ${validAggRecords.length} telemetry_agg records`)

  console.log('Seed completed successfully!')
  console.log(`Summary: ${rawRecords.length} raw records, ${validAggRecords.length} aggregate records`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
