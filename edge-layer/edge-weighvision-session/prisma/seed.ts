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

  const sessionCount = Math.max(SEED_COUNT, 30)
  const now = Date.now()
  const tenants = ['t-001', 't-002']

  const sessions = []
  const sessionConfig = [
    { tenantId: tenants[0], farmId: 'f-001', barnId: 'b-001', deviceId: 'wv-001', stationId: 's-001' },
    { tenantId: tenants[0], farmId: 'f-001', barnId: 'b-002', deviceId: 'wv-002', stationId: 's-002' },
    { tenantId: tenants[0], farmId: 'f-002', barnId: 'b-003', deviceId: 'wv-003', stationId: 's-003' },
    { tenantId: tenants[1], farmId: 'f-101', barnId: 'b-101', deviceId: 'wv-101', stationId: 's-101' },
    { tenantId: tenants[1], farmId: 'f-101', barnId: 'b-102', deviceId: 'wv-102', stationId: 's-102' },
  ]

  // Create WeightSession records
  for (let i = 0; i < sessionCount; i++) {
    const config = sessionConfig[i % sessionConfig.length]
    const sessionId = seededUuid(4_000 + i)
    const status = i < sessionCount * 0.7 ? 'created' : i < sessionCount * 0.9 ? 'finalized' : 'cancelled'
    const hoursAgo = Math.floor(i / 5)

    sessions.push({
      sessionId,
      tenantId: config.tenantId,
      farmId: config.farmId,
      barnId: config.barnId,
      deviceId: config.deviceId,
      stationId: config.stationId,
      batchId: null,
      status,
      startAt: new Date(now - hoursAgo * 60 * 60 * 1000),
      endAt: status === 'finalized' ? new Date(now - hoursAgo * 60 * 60 * 1000 + 30 * 60 * 1000) : null,
      initialWeightKg: status !== 'created' ? new Prisma.Decimal(1.2 + (i % 10) * 0.1) : null,
      finalWeightKg: status === 'finalized' ? new Prisma.Decimal(1.5 + (i % 10) * 0.1) : null,
      imageCount: i % 5,
      inferenceResultId: status === 'finalized' ? seededUuid(9_000 + i) : null,
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
