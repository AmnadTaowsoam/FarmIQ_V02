import { PrismaClient, Prisma } from '@prisma/client'

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
  STATION_1A_1: '00000000-0000-4000-8000-000000300101',
  STATION_1A_2: '00000000-0000-4000-8000-000000300102',
  STATION_1B_1: '00000000-0000-4000-8000-000000300201',
  STATION_1B_2: '00000000-0000-4000-8000-000000300202',
}

function getAllSessionIds(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const num = (i + 1).toString(16).padStart(2, '0')
    return `00000000-0000-4000-8000-0000004000${num}`
  })
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
  // Skip clearing if tables don't exist (they will be created by migration)
  if (process.env.NODE_ENV !== 'production') {
    try {
      await prisma.weighVisionEventDedupe.deleteMany({})
      await prisma.weighVisionWeightAggregate.deleteMany({})
      await prisma.weighVisionInference.deleteMany({})
      await prisma.weighVisionMedia.deleteMany({})
      await prisma.weighVisionMeasurement.deleteMany({})
      await prisma.weighVisionSession.deleteMany({})
    } catch (error: any) {
      // If tables don't exist, that's okay - they'll be created
      if (error.code !== 'P2021') {
        throw error
      }
      console.log('Tables may not exist yet, skipping clear step')
    }
  }

  const sessionCount = Math.max(SEED_COUNT, 30)
  const sessionIds = getAllSessionIds()
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]
  const batchIds = [SEED_IDS.BATCH_1A_1, SEED_IDS.BATCH_1A_2, SEED_IDS.BATCH_1B_1, SEED_IDS.BATCH_1B_2]
  const stationIds = [SEED_IDS.STATION_1A_1, SEED_IDS.STATION_1A_2, SEED_IDS.STATION_1B_1, SEED_IDS.STATION_1B_2]
  const statuses = ['RUNNING', 'FINALIZED', 'CANCELLED']
  const now = new Date()

  // Create WeighVisionSessions with related data
  for (let i = 0; i < sessionCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]
    const stationId = stationIds[i % stationIds.length]
    const sessionId = sessionIds[i % sessionIds.length]
    const status = statuses[i % statuses.length]
    const startedAt = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000))
    const endedAt = status === 'FINALIZED' ? new Date(startedAt.getTime() + (30 + (i % 30)) * 60 * 1000) : null

    const session = await prisma.weighVisionSession.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        stationId,
        sessionId,
        startedAt,
        endedAt,
        status,
        measurements: {
          create: Array.from({ length: 5 + (i % 10) }, (_, j) => ({
            tenantId,
            sessionId,
            ts: new Date(startedAt.getTime() + j * 60 * 1000),
            weightKg: new Prisma.Decimal(1.0 + (i % 20) * 0.1 + (j * 0.01)),
            source: j % 2 === 0 ? 'scale' : 'sensor',
            metaJson: JSON.stringify({ index: j, sessionIndex: i }),
          })),
        },
        media: {
          create: Array.from({ length: 2 + (i % 3) }, (_, j) => ({
            tenantId,
            sessionId,
            objectId: `object-${i}-${j}`,
            path: `s3://bucket/sessions/${sessionId}/media-${j}.jpg`,
            ts: new Date(startedAt.getTime() + j * 5 * 60 * 1000),
          })),
        },
        inferences: {
          create: Array.from({ length: 1 + (i % 2) }, (_, j) => ({
            tenantId,
            sessionId,
            modelVersion: 'v1.0.0',
            resultJson: JSON.stringify({
              predictedWeight: 1.0 + (i % 20) * 0.1,
              confidence: 0.85 + (i % 15) * 0.01,
              index: j,
            }),
            ts: new Date(startedAt.getTime() + j * 10 * 60 * 1000),
          })),
        },
      },
    })

    // Create event dedupe records
    await prisma.weighVisionEventDedupe.create({
      data: {
        tenantId,
        eventId: `event-session-${i.toString().padStart(6, '0')}`,
        eventType: 'weighvision.session.created',
      },
    })

    if (i % 10 === 0) {
      console.log(`Created ${i + 1} sessions...`)
    }
  }

  console.log(`Created ${sessionCount} weighvision sessions with related data`)

  for (let i = 0; i < sessionCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]
    const recordDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
    recordDate.setHours(0, 0, 0, 0)

    await prisma.weighVisionWeightAggregate.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        recordDate,
        avgWeightKg: new Prisma.Decimal(1.0 + (i % 20) * 0.1),
        p10WeightKg: new Prisma.Decimal(0.9 + (i % 20) * 0.1),
        p50WeightKg: new Prisma.Decimal(1.0 + (i % 20) * 0.1),
        p90WeightKg: new Prisma.Decimal(1.1 + (i % 20) * 0.1),
        sampleCount: 50 + (i % 100),
        qualityPassRate: new Prisma.Decimal(75 + (i % 20)),
      },
    })
  }

  console.log(`Created ${sessionCount} weighvision weight aggregates`)
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
