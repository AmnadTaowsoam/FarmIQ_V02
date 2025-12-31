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
  const farms = ['f-001', 'f-101']
  const barns = ['b-001', 'b-002', 'b-101', 'b-102']
  const devices = ['silo-001', 'silo-002', 'silo-101', 'silo-102']

  const now = Date.now()
  const localCount = Math.max(30, SEED_COUNT)

  for (let i = 0; i < localCount; i++) {
    const tenantId = tenants[i % tenants.length]
    const farmId = farms[i % farms.length]
    const barnId = barns[i % barns.length]
    const deviceId = devices[i % devices.length]
    const source = i % 3 === 0 ? 'MANUAL' : i % 3 === 1 ? 'API_IMPORT' : 'SILO_AUTO'
    const occurredAt = new Date(now - i * 60_000)
    const eventId = source === 'SILO_AUTO' ? `feed-event-${tenantId}-${i.toString().padStart(6, '0')}` : null
    const externalRef = source === 'API_IMPORT' ? `import-${tenantId}-${i.toString().padStart(6, '0')}` : null

    const id = seededUuid(7_000 + i)

    await prisma.feedIntakeLocal.upsert({
      where: { id },
      update: {
        tenantId,
        farmId,
        barnId,
        deviceId: source === 'SILO_AUTO' ? deviceId : null,
        source,
        feedFormulaId: `ff-${(i % 8) + 1}`,
        feedLotId: `fl-${(i % 8) + 1}`,
        quantityKg: new Prisma.Decimal((5 + (i % 20) * 0.5).toFixed(3)),
        occurredAt,
        eventId,
        externalRef,
        sequence: i,
        notes: 'seed',
      },
      create: {
        id,
        tenantId,
        farmId,
        barnId,
        deviceId: source === 'SILO_AUTO' ? deviceId : null,
        source,
        feedFormulaId: `ff-${(i % 8) + 1}`,
        feedLotId: `fl-${(i % 8) + 1}`,
        quantityKg: new Prisma.Decimal((5 + (i % 20) * 0.5).toFixed(3)),
        occurredAt,
        eventId,
        externalRef,
        sequence: i,
        notes: 'seed',
      },
    })

    if (eventId) {
      const dedupeId = seededUuid(8_000 + i)
      await prisma.feedIntakeDedupe.upsert({
        where: { id: dedupeId },
        update: {
          tenantId,
          eventId,
          externalRef,
          deviceId,
          expiresAt: new Date(now + 24 * 60 * 60_000),
        },
        create: {
          id: dedupeId,
          tenantId,
          eventId,
          externalRef,
          deviceId,
          processedAt: new Date(now - i * 10_000),
          expiresAt: new Date(now + 24 * 60 * 60_000),
        },
      })
    }
  }

  // Silo weight snapshots (multi-tenant, deterministic)
  let snapshotIndex = 0
  for (const tenantId of tenants) {
    for (const deviceId of devices) {
      const snapshotId = seededUuid(9_500 + snapshotIndex)
      await prisma.siloWeightSnapshot.upsert({
        where: { id: snapshotId },
        update: {
          tenantId,
          deviceId,
          weightKg: new Prisma.Decimal((900 + (snapshotIndex % 20) * 5).toFixed(3)),
          recordedAt: new Date(now - snapshotIndex * 300_000),
        },
        create: {
          id: snapshotId,
          tenantId,
          deviceId,
          weightKg: new Prisma.Decimal((900 + (snapshotIndex % 20) * 5).toFixed(3)),
          recordedAt: new Date(now - snapshotIndex * 300_000),
        },
      })
      snapshotIndex++
    }
  }

  console.log(`Seed completed successfully (feed_intake_local upserts=${localCount})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
