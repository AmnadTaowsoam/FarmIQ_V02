import { PrismaClient } from '@prisma/client'
import { SEED_IDS } from './seed-constants'

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
    await prisma.cloudDedupe.deleteMany({})
  }

  // Create CloudDedupe records: at least SEED_COUNT
  const dedupeCount = Math.max(SEED_COUNT, 30)
  const now = Date.now()

  const dedupeRecords = []

  for (let i = 0; i < dedupeCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const hoursAgo = Math.floor(i / 5)
    const minutesOffset = (i % 5) * 12

    dedupeRecords.push({
      tenantId,
      eventId: `event-${tenantId}-${i.toString().padStart(6, '0')}`,
      firstSeenAt: new Date(now - (hoursAgo * 60 + minutesOffset) * 60 * 1000),
    })
  }

  // Upsert dedupe records (idempotent by unique constraint tenantId + eventId)
  for (const record of dedupeRecords) {
    await prisma.cloudDedupe.upsert({
      where: {
        tenantId_eventId: {
          tenantId: record.tenantId,
          eventId: record.eventId,
        },
      },
      update: {
        firstSeenAt: record.firstSeenAt,
      },
      create: record,
    })
  }

  console.log(`Upserted ${dedupeRecords.length} cloud_dedupe records`)
  console.log('Seed completed successfully!')
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
