import { PrismaClient, Prisma } from '@prisma/client'
import { SEED_IDS, getAllSessionIds } from './seed-constants'

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
    await prisma.sessionWeight.deleteMany({})
    await prisma.sessionMediaBinding.deleteMany({})
    await prisma.weightSession.deleteMany({})
  }

  const sessionIds = getAllSessionIds()
  const sessionCount = Math.max(SEED_COUNT, 30)
  const now = Date.now()

  const sessions = []
  const sessionConfig = [
    { tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1A, barnId: SEED_IDS.BARN_1A_1, deviceId: SEED_IDS.DEVICE_WEIGH_1, stationId: SEED_IDS.STATION_1A_1 },
    { tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1A, barnId: SEED_IDS.BARN_1A_2, deviceId: SEED_IDS.DEVICE_WEIGH_2, stationId: SEED_IDS.STATION_1A_2 },
    { tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1B, barnId: SEED_IDS.BARN_1B_1, deviceId: SEED_IDS.DEVICE_WEIGH_3, stationId: SEED_IDS.STATION_1B_1 },
    { tenantId: SEED_IDS.TENANT_2, farmId: SEED_IDS.FARM_2A, barnId: SEED_IDS.BARN_2A_1, deviceId: SEED_IDS.DEVICE_WEIGH_4, stationId: SEED_IDS.STATION_2A_1 },
    { tenantId: SEED_IDS.TENANT_2, farmId: SEED_IDS.FARM_2A, barnId: SEED_IDS.BARN_2A_2, deviceId: SEED_IDS.DEVICE_WEIGH_5, stationId: SEED_IDS.STATION_2A_2 },
  ]

  // Create WeightSession records
  for (let i = 0; i < sessionCount; i++) {
    const config = sessionConfig[i % sessionConfig.length]
    const sessionId = i < sessionIds.length ? sessionIds[i] : `00000000-0000-4000-8000-0000004000${(i + 1).toString(16).padStart(3, '0')}`
    const status = i < sessionCount * 0.7 ? 'created' : i < sessionCount * 0.9 ? 'finalized' : 'cancelled'
    const hoursAgo = Math.floor(i / 5)

    sessions.push({
      sessionId,
      tenantId: config.tenantId,
      farmId: config.farmId,
      barnId: config.barnId,
      deviceId: config.deviceId,
      stationId: config.stationId,
      batchId: SEED_IDS.BATCH_1A_1,
      status,
      startAt: new Date(now - hoursAgo * 60 * 60 * 1000),
      endAt: status === 'finalized' ? new Date(now - hoursAgo * 60 * 60 * 1000 + 30 * 60 * 1000) : null,
      initialWeightKg: status !== 'created' ? new Prisma.Decimal(1.2 + (i % 10) * 0.1) : null,
      finalWeightKg: status === 'finalized' ? new Prisma.Decimal(1.5 + (i % 10) * 0.1) : null,
      imageCount: i % 5,
      inferenceResultId: status === 'finalized' ? `inference-${i}` : null,
    })
  }

  // Upsert sessions
  for (const session of sessions) {
    await prisma.weightSession.upsert({
      where: { sessionId: session.sessionId },
      update: {
        status: session.status,
        endAt: session.endAt,
        initialWeightKg: session.initialWeightKg,
        finalWeightKg: session.finalWeightKg,
        imageCount: session.imageCount,
        inferenceResultId: session.inferenceResultId,
      },
      create: session,
    })
  }
  console.log(`Upserted ${sessions.length} weight_sessions`)

  // Create SessionWeight records (at least 30)
  const weightCount = Math.max(30, SEED_COUNT)
  const weights = []

  for (let i = 0; i < weightCount; i++) {
    const session = sessions[i % sessions.length]
    weights.push({
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      weightKg: new Prisma.Decimal(1.2 + (i % 20) * 0.1),
      occurredAt: new Date(now - (i % 60) * 60 * 1000),
      eventId: `event-weight-${i.toString().padStart(6, '0')}`,
      traceId: `trace-weight-${i.toString().padStart(6, '0')}`,
    })
  }

  // Insert weights with skipDuplicates
  await prisma.sessionWeight.createMany({
    data: weights,
    skipDuplicates: true,
  })
  console.log(`Inserted ${weights.length} session_weights`)

  // Create SessionMediaBinding records (at least 30)
  const bindingCount = Math.max(30, SEED_COUNT)
  const bindings = []

  for (let i = 0; i < bindingCount; i++) {
    const session = sessions[i % sessions.length]
    bindings.push({
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      mediaObjectId: `media-${i.toString().padStart(6, '0')}`,
      occurredAt: new Date(now - (i % 60) * 60 * 1000),
      eventId: `event-media-${i.toString().padStart(6, '0')}`,
      traceId: `trace-media-${i.toString().padStart(6, '0')}`,
      isBound: i % 2 === 0,
    })
  }

  // Insert bindings with skipDuplicates
  await prisma.sessionMediaBinding.createMany({
    data: bindings,
    skipDuplicates: true,
  })
  console.log(`Inserted ${bindings.length} session_media_bindings`)

  console.log('Seed completed successfully!')
  console.log(`Summary: ${sessions.length} sessions, ${weights.length} weights, ${bindings.length} media bindings`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
