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

  // Generate 30 days of historical telemetry data
  // Pattern: Temperature every 5 minutes, Humidity every 5 minutes, Ammonia every 15 minutes, Weight daily
  const DAYS_TO_GENERATE = 30
  const MINUTES_PER_DAY = 24 * 60
  const TEMP_INTERVAL_MINUTES = 5
  const HUMIDITY_INTERVAL_MINUTES = 5
  const AMMONIA_INTERVAL_MINUTES = 15
  const WEIGHT_INTERVAL_DAYS = 1

  // Generate realistic temperature with daily pattern
  function generateTemperature(hour: number, day: number): number {
    const baseTemp = 25 // base temperature
    const dailyVariation = Math.sin((hour * Math.PI) / 12) * 3 // day/night cycle
    const noise = (Math.random() - 0.5) * 2 // random noise
    return Math.round((baseTemp + dailyVariation + noise) * 10) / 10
  }

  // Generate realistic humidity with daily pattern
  function generateHumidity(hour: number, day: number): number {
    const baseHumidity = 60 // base humidity
    const dailyVariation = Math.sin((hour * Math.PI) / 12) * 10 // day/night cycle
    const noise = (Math.random() - 0.5) * 5 // random noise
    return Math.round((baseHumidity + dailyVariation + noise) * 10) / 10
  }

  // Generate realistic ammonia
  function generateAmmonia(hour: number, day: number): number {
    const baseAmmonia = 10
    const noise = (Math.random() - 0.5) * 3
    return Math.round((baseAmmonia + noise) * 10) / 10
  }

  // Generate realistic weight (daily growth)
  function generateWeight(day: number): number {
    const startingWeight = 0.04 // 40g on day 1
    const dailyGain = 0.055 // 55g/day ADG
    const weight = startingWeight + (day * dailyGain)
    return Math.round(weight * 100) / 100
  }

  let recordIndex = 0
  for (let day = 0; day < DAYS_TO_GENERATE; day++) {
    for (const config of deviceConfig) {
      // Temperature readings (every 5 minutes)
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += TEMP_INTERVAL_MINUTES) {
          const occurredAt = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000) - (hour * 60 * 60 * 1000) - (minute * 60 * 1000))
          rawRecords.push({
            tenantId: config.tenantId,
            farmId: config.farmId,
            barnId: config.barnId,
            deviceId: config.id,
            batchId: SEED_IDS.BATCH_1A_1,
            metric: 'temperature',
            value: new Prisma.Decimal(generateTemperature(hour, day)),
            unit: 'C',
            occurredAt,
            traceId: `trace-temp-${recordIndex.toString().padStart(6, '0')}`,
            eventId: `event-temp-${recordIndex.toString().padStart(6, '0')}`,
          })
          recordIndex++

          // Humidity readings (every 5 minutes, same interval as temperature)
          rawRecords.push({
            tenantId: config.tenantId,
            farmId: config.farmId,
            barnId: config.barnId,
            deviceId: config.id,
            batchId: SEED_IDS.BATCH_1A_1,
            metric: 'humidity',
            value: new Prisma.Decimal(generateHumidity(hour, day)),
            unit: '%',
            occurredAt,
            traceId: `trace-hum-${recordIndex.toString().padStart(6, '0')}`,
            eventId: `event-hum-${recordIndex.toString().padStart(6, '0')}`,
          })
          recordIndex++

          // Ammonia readings (every 15 minutes)
          if (minute % AMMONIA_INTERVAL_MINUTES === 0) {
            rawRecords.push({
              tenantId: config.tenantId,
              farmId: config.farmId,
              barnId: config.barnId,
              deviceId: config.id,
              batchId: SEED_IDS.BATCH_1A_1,
              metric: 'ammonia',
              value: new Prisma.Decimal(generateAmmonia(hour, day)),
              unit: 'ppm',
              occurredAt,
              traceId: `trace-amm-${recordIndex.toString().padStart(6, '0')}`,
              eventId: `event-amm-${recordIndex.toString().padStart(6, '0')}`,
            })
            recordIndex++
          }
        }
      }

      // Weight readings (daily)
      if (config.id.includes('WEIGH')) {
        const occurredAt = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000))
        rawRecords.push({
          tenantId: config.tenantId,
          farmId: config.farmId,
          barnId: config.barnId,
          deviceId: config.id,
          batchId: SEED_IDS.BATCH_1A_1,
          metric: 'weight',
          value: new Prisma.Decimal(generateWeight(day)),
          unit: 'kg',
          occurredAt,
          traceId: `trace-weight-${recordIndex.toString().padStart(6, '0')}`,
          eventId: `event-weight-${recordIndex.toString().padStart(6, '0')}`,
        })
        recordIndex++
      }
    }
  }

  // Limit records based on SEED_COUNT
  // For full 30-day data, use SEED_COUNT >= 1000
  // For quick testing, use smaller SEED_COUNT (default: 30)
  let finalRecords = rawRecords
  if (SEED_COUNT < 100) {
    // Quick mode: Sample data across 30 days
    const sampleSize = Math.max(SEED_COUNT, 30)
    const step = Math.floor(rawRecords.length / sampleSize)
    finalRecords = rawRecords.filter((_, i) => i % step === 0).slice(0, sampleSize)
  }

  // Upsert raw records (idempotent by unique constraint tenantId + eventId)
  for (const record of finalRecords) {
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
  console.log(`Upserted ${finalRecords.length} telemetry_raw records`)

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
  console.log(`Summary: ${finalRecords.length} raw records, ${validAggRecords.length} aggregate records`)
}

main()
  .catch((e) => {
    console.error('Error during seed:')
    if (e instanceof Error) {
      console.error('  Message:', e.message)
      console.error('  Code:', (e as any).code || 'N/A')
      console.error('  Meta:', JSON.stringify((e as any).meta || {}, null, 2))
      if (e.stack) {
        console.error('  Stack:', e.stack)
      }
    } else {
      console.error('  Error object:', JSON.stringify(e, null, 2))
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
