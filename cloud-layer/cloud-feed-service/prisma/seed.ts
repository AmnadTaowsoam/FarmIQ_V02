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
  DEVICE_SENSOR_1: '00000000-0000-4000-8000-000000100001',
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
  // Wrap in try-catch to handle cases where tables might not exist yet
  if (process.env.NODE_ENV !== 'production') {
    try {
      await prisma.kpiDaily.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedInventorySnapshot.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedProgram.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedIntakeRecord.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedQualityResult.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedDelivery.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedLot.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
    try {
      await prisma.feedFormula.deleteMany({})
    } catch (e) {
      // Table might not exist, that's OK
    }
  }

  const recordCount = Math.max(SEED_COUNT, 30)
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]
  const batchIds = [SEED_IDS.BATCH_1A_1, SEED_IDS.BATCH_1A_2, SEED_IDS.BATCH_1B_1, SEED_IDS.BATCH_1B_2]
  const species = ['broiler', 'layer', 'swine', 'fish']
  const phases = ['starter', 'grower', 'finisher', 'layer']
  const now = new Date()

  // Create FeedFormulas
  const formulas = []
  for (let i = 0; i < Math.min(recordCount, 15); i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const speciesType = species[i % species.length]
    const phase = phases[i % phases.length]

    const formula = await prisma.feedFormula.create({
      data: {
        tenantId,
        name: `${speciesType} ${phase} formula ${i + 1}`,
        species: speciesType,
        phase,
        energyKcalPerKg: new Prisma.Decimal(3000 + (i % 500)),
        proteinPct: new Prisma.Decimal(18 + (i % 5)),
        fiberPct: new Prisma.Decimal(3 + (i % 2)),
        fatPct: new Prisma.Decimal(4 + (i % 2)),
        status: 'active',
        externalRef: `formula-ext-${i}`,
      },
    })
    formulas.push(formula)
  }
  console.log(`Created ${formulas.length} feed formulas`)

  // Create FeedLots
  const lots = []
  for (let i = 0; i < Math.min(recordCount, 20); i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const formula = formulas[i % formulas.length]

    const lot = await prisma.feedLot.create({
      data: {
        tenantId,
        farmId,
        supplierName: `Supplier ${(i % 5) + 1}`,
        lotCode: `LOT-${tenantId.substring(0, 8)}-${i.toString().padStart(4, '0')}`,
        feedFormulaId: formula.id,
        manufactureDate: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)),
        receivedDate: new Date(now.getTime() - ((i - 2) * 24 * 60 * 60 * 1000)),
        quantityKg: new Prisma.Decimal(1000 + (i % 5000) * 10),
        remainingKg: new Prisma.Decimal(500 + (i % 2000) * 10),
        status: 'active',
        externalRef: `lot-ext-${i}`,
      },
    })
    lots.push(lot)
  }
  console.log(`Created ${lots.length} feed lots`)

  // Create FeedDeliveries
  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const lot = lots[i % lots.length]

    await prisma.feedDelivery.create({
      data: {
        tenantId,
        farmId,
        barnId,
        feedLotId: lot.id,
        deliveryRef: `DEL-${i.toString().padStart(6, '0')}`,
        deliveredAt: new Date(now.getTime() - (i * 12 * 60 * 60 * 1000)),
        quantityKg: new Prisma.Decimal(100 + (i % 500)),
        unitCost: new Prisma.Decimal(15 + (i % 10)),
        currency: 'THB',
        externalRef: `delivery-ext-${i}`,
      },
    })
  }
  console.log(`Created ${recordCount} feed deliveries`)

  // Create FeedIntakeRecords
  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]
    const formula = formulas[i % formulas.length]
    const lot = lots[i % lots.length]
    const sources = ['MANUAL', 'API_IMPORT', 'SILO_AUTO']

    await prisma.feedIntakeRecord.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        deviceId: i % 3 === 0 ? SEED_IDS.DEVICE_SENSOR_1 : null,
        source: sources[i % sources.length],
        feedFormulaId: formula.id,
        feedLotId: lot.id,
        quantityKg: new Prisma.Decimal(50 + (i % 200)),
        occurredAt: new Date(now.getTime() - (i * 6 * 60 * 60 * 1000)),
        ingestedAt: new Date(now.getTime() - (i * 6 * 60 * 60 * 1000) + 60000),
        eventId: `event-feed-${i.toString().padStart(6, '0')}`,
        externalRef: `intake-ext-${i}`,
        idempotencyKey: `idemp-feed-${i}`,
        sequence: i + 1,
        notes: `Feed intake record ${i + 1}`,
        createdByUserId: `user-${(i % 10) + 1}`,
      },
    })
  }
  console.log(`Created ${recordCount} feed intake records`)

  // Create FeedQualityResults
  for (let i = 0; i < Math.min(recordCount, 20); i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const lot = lots[i % lots.length]
    const metrics = ['moisture', 'protein', 'fat', 'fiber', 'ash']
    const metric = metrics[i % metrics.length]

    await prisma.feedQualityResult.create({
      data: {
        tenantId,
        feedLotId: lot.id,
        sampledAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)),
        metric,
        value: new Prisma.Decimal(10 + (i % 20)),
        unit: metric === 'moisture' ? '%' : metric === 'protein' ? '%' : 'g/kg',
        method: 'lab_analysis',
        status: 'valid',
        externalRef: `quality-ext-${i}`,
      },
    })
  }
  console.log(`Created ${Math.min(recordCount, 20)} feed quality results`)

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
