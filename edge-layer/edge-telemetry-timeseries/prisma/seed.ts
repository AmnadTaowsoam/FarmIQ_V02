import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Guard: prevent seed in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
  console.error('ERROR: Seed is not allowed in production!')
  console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
  process.exit(1)
}

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

function seededUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
}

async function main() {
  console.log(`Starting seed (SEED_COUNT=${SEED_COUNT})...`)

  const tenants = ['t-001', 't-002']
  const deviceIds = Array.from({ length: 8 }, (_, i) =>
    `d-${(i + 1).toString().padStart(3, '0')}`
  )
  const now = Date.now()
  const metrics = ['temperature', 'humidity', 'weight']
  const units: Record<string, string> = {
    temperature: 'C',
    humidity: '%',
    weight: 'kg',
  }

  const rawCount = Math.max(SEED_COUNT, 30)
  for (let i = 0; i < rawCount; i++) {
    const tenantId = tenants[i % tenants.length]
    const deviceId = deviceIds[i % deviceIds.length]
    const metricType = metrics[i % metrics.length]
    const minutesAgo = Math.floor(i / deviceIds.length)

    const metricValue =
      metricType === 'temperature'
        ? 25 + (i % 10) * 0.5
        : metricType === 'humidity'
          ? 60 + (i % 15)
          : 1.2 + (i % 20) * 0.1

    const id = seededUuid(1_000 + i)
    await prisma.telemetryRaw.upsert({
      where: { id },
      update: {
        tenantId,
        farmId: 'f-001',
        barnId: 'b-001',
        deviceId,
        metricType,
        metricValue: new Prisma.Decimal(metricValue),
        unit: units[metricType] ?? null,
        occurredAt: new Date(now - minutesAgo * 60 * 1000),
      },
      create: {
        id,
        tenantId,
        farmId: 'f-001',
        barnId: 'b-001',
        deviceId,
        metricType,
        metricValue: new Prisma.Decimal(metricValue),
        unit: units[metricType] ?? null,
        occurredAt: new Date(now - minutesAgo * 60 * 1000),
      },
    })
  }
  console.log(`Upserted ${rawCount} telemetry_raw records`)

  // Create TelemetryAgg records
  const aggCount = Math.max(SEED_COUNT, 30)
  for (let i = 0; i < aggCount; i++) {
    const tenantId = tenants[i % tenants.length]
    const deviceId = deviceIds[i % deviceIds.length]
    const metricType = metrics[i % metrics.length]
    const window = ['1m', '1h', '1d'][i % 3]
    const hoursAgo = Math.floor(i / 3)
    const bucketStartAt = new Date(now - hoursAgo * 60 * 60 * 1000)
    const bucketEndAt = new Date(now - hoursAgo * 60 * 60 * 1000 + 60 * 60 * 1000)

    const baseValue = metricType === 'temperature' ? 25 : metricType === 'humidity' ? 65 : 1.5

    await prisma.telemetryAgg.upsert({
      where: {
        tenantId_deviceId_window_bucketStartAt_metricType: {
          tenantId,
          deviceId,
          window,
          bucketStartAt,
          metricType,
        },
      },
      update: {
        avgValue: new Prisma.Decimal(baseValue + (i % 5)),
        minValue: new Prisma.Decimal(baseValue + (i % 5) - 1),
        maxValue: new Prisma.Decimal(baseValue + (i % 5) + 1),
        count: 10 + (i % 5),
        bucketEndAt,
      },
      create: {
        tenantId,
        deviceId,
        metricType,
        window,
        bucketStartAt,
        bucketEndAt,
        avgValue: new Prisma.Decimal(baseValue + (i % 5)),
        minValue: new Prisma.Decimal(baseValue + (i % 5) - 1),
        maxValue: new Prisma.Decimal(baseValue + (i % 5) + 1),
        count: 10 + (i % 5),
      },
    })
  }
  console.log(`Upserted ${aggCount} telemetry_agg records`)

  console.log('Seed completed successfully!')
  console.log(`Summary: ${rawCount} raw records, ${aggCount} aggregate records`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
