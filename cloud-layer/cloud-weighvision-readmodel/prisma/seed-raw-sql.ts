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

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

async function main() {
  console.log(`Starting seed with raw SQL (SEED_COUNT=${SEED_COUNT})...`)

  const sessionCount = Math.max(SEED_COUNT, 30)
  const sessionIds = getAllSessionIds()
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]
  const batchIds = [SEED_IDS.BATCH_1A_1, SEED_IDS.BATCH_1A_2, SEED_IDS.BATCH_1B_1, SEED_IDS.BATCH_1B_2]
  const stationIds = [SEED_IDS.STATION_1A_1, SEED_IDS.STATION_1A_2, SEED_IDS.STATION_1B_1, SEED_IDS.STATION_1B_2]
  const statuses = ['RUNNING', 'FINALIZED', 'CANCELLED']
  const now = new Date()

  // Clear existing data using raw SQL (use unsafe to bypass Prisma schema check)
  // Use public schema explicitly
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.weighvision_event_dedupe, public.weighvision_inference, public.weighvision_media, public.weighvision_measurement, public.weighvision_session RESTART IDENTITY CASCADE`)

  // Create sessions using raw SQL
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
    const sessionDbId = `session-db-${i}`

    // Insert session
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.weighvision_session (id, "tenantId", "farmId", "barnId", "batchId", "stationId", "sessionId", "startedAt", "endedAt", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING
    `, sessionDbId, tenantId, farmId, barnId, batchId, stationId, sessionId, startedAt, endedAt, status, now, now)

    // Insert measurements
    const measurementCount = 5 + (i % 10)
    for (let j = 0; j < measurementCount; j++) {
      const weight = 1.0 + (i % 20) * 0.1 + (j * 0.01)
      const ts = new Date(startedAt.getTime() + j * 60 * 1000)
      const source = j % 2 === 0 ? 'scale' : 'sensor'
      const metaJson = JSON.stringify({ index: j, sessionIndex: i })

      await prisma.$executeRawUnsafe(`
        INSERT INTO public.weighvision_measurement (id, "tenantId", "sessionId", "sessionDbId", ts, "weightKg", source, "metaJson", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, `measurement-${i}-${j}`, tenantId, sessionId, sessionDbId, ts, weight, source, metaJson, now)
    }

    // Insert media
    const mediaCount = 2 + (i % 3)
    for (let j = 0; j < mediaCount; j++) {
      const objectId = `object-${i}-${j}`
      const path = `s3://bucket/sessions/${sessionId}/media-${j}.jpg`
      const ts = new Date(startedAt.getTime() + j * 5 * 60 * 1000)

      await prisma.$executeRawUnsafe(`
        INSERT INTO public.weighvision_media (id, "tenantId", "sessionId", "sessionDbId", "objectId", path, ts, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, `media-${i}-${j}`, tenantId, sessionId, sessionDbId, objectId, path, ts, now)
    }

    // Insert inferences
    const inferenceCount = 1 + (i % 2)
    for (let j = 0; j < inferenceCount; j++) {
      const modelVersion = 'v1.0.0'
      const resultJson = JSON.stringify({
        predictedWeight: 1.0 + (i % 20) * 0.1,
        confidence: 0.85 + (i % 15) * 0.01,
        index: j,
      })
      const ts = new Date(startedAt.getTime() + j * 10 * 60 * 1000)

      await prisma.$executeRawUnsafe(`
        INSERT INTO public.weighvision_inference (id, "tenantId", "sessionId", "sessionDbId", "modelVersion", "resultJson", ts, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, `inference-${i}-${j}`, tenantId, sessionId, sessionDbId, modelVersion, resultJson, ts, now)
    }

    // Insert event dedupe
    const eventId = `event-session-${i.toString().padStart(6, '0')}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.weighvision_event_dedupe (id, "tenantId", "eventId", "eventType", "createdAt")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, eventId, tenantId, eventId, 'weighvision.session.created', now)

    if (i % 10 === 0) {
      console.log(`Created ${i + 1} sessions...`)
    }
  }

  console.log(`Created ${sessionCount} weighvision sessions with related data`)
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

