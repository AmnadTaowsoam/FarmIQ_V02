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
  if (process.env.NODE_ENV !== 'production') {
    await prisma.barnGeneticProfile.deleteMany({})
    await prisma.barnHousingCondition.deleteMany({})
    await prisma.barnWelfareCheck.deleteMany({})
    await prisma.barnDailyCount.deleteMany({})
    await prisma.barnTreatmentEvent.deleteMany({})
    await prisma.barnVaccineEvent.deleteMany({})
    await prisma.barnCullEvent.deleteMany({})
    await prisma.barnMortalityEvent.deleteMany({})
    await prisma.barnMorbidityEvent.deleteMany({})
  }

  const recordCount = Math.max(SEED_COUNT, 30)
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]
  const batchIds = [SEED_IDS.BATCH_1A_1, SEED_IDS.BATCH_1A_2, SEED_IDS.BATCH_1B_1, SEED_IDS.BATCH_1B_2]
  const now = new Date()

  // Create BarnMorbidityEvents
  const diseaseCodes = ['ND', 'IB', 'IBD', 'MG', 'MS']
  const severities = ['low', 'medium', 'high']

  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]

    await prisma.barnMorbidityEvent.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        occurredAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)),
        diseaseCode: diseaseCodes[i % diseaseCodes.length],
        severity: severities[i % severities.length],
        animalCount: 5 + (i % 50),
        notes: `Morbidity event ${i + 1}: ${diseaseCodes[i % diseaseCodes.length]}`,
        createdByUserId: `user-${(i % 10) + 1}`,
        externalRef: `morbidity-ext-${i}`,
        eventId: `event-morbidity-${i.toString().padStart(6, '0')}`,
      },
    })
  }
  console.log(`Created ${recordCount} morbidity events`)

  // Create BarnMortalityEvents
  const causeCodes = ['disease', 'accident', 'heat_stress', 'unknown']

  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]

    await prisma.barnMortalityEvent.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        occurredAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)),
        causeCode: causeCodes[i % causeCodes.length],
        animalCount: 1 + (i % 10),
        disposalMethod: 'incineration',
        notes: `Mortality event ${i + 1}`,
        createdByUserId: `user-${(i % 10) + 1}`,
        externalRef: `mortality-ext-${i}`,
        eventId: `event-mortality-${i.toString().padStart(6, '0')}`,
      },
    })
  }
  console.log(`Created ${recordCount} mortality events`)

  // Create BarnCullEvents
  const reasonCodes = ['poor_performance', 'disease', 'injury', 'other']

  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]

    await prisma.barnCullEvent.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        occurredAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)),
        reasonCode: reasonCodes[i % reasonCodes.length],
        animalCount: 1 + (i % 5),
        notes: `Cull event ${i + 1}`,
        createdByUserId: `user-${(i % 10) + 1}`,
        externalRef: `cull-ext-${i}`,
        eventId: `event-cull-${i.toString().padStart(6, '0')}`,
      },
    })
  }
  console.log(`Created ${recordCount} cull events`)

  // Create BarnVaccineEvents
  const vaccineNames = ['ND', 'IB', 'IBD', 'MG', 'MS']
  const routes = ['IM', 'SC', 'oral']

  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]

    await prisma.barnVaccineEvent.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        occurredAt: new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000)),
        vaccineName: vaccineNames[i % vaccineNames.length],
        doseMl: new Prisma.Decimal(0.1 + (i % 5) * 0.1),
        route: routes[i % routes.length],
        administeredBy: `vet-${(i % 5) + 1}`,
        animalCount: 100 + (i % 500),
        notes: `Vaccination ${i + 1}`,
        externalRef: `vaccine-ext-${i}`,
        eventId: `event-vaccine-${i.toString().padStart(6, '0')}`,
      },
    })
  }
  console.log(`Created ${recordCount} vaccine events`)

  // Create BarnTreatmentEvents
  const treatmentNames = ['Antibiotic A', 'Antibiotic B', 'Antifungal', 'Antiparasitic']

  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]

    await prisma.barnTreatmentEvent.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        occurredAt: new Date(now.getTime() - (i * 3 * 24 * 60 * 60 * 1000)),
        treatmentName: treatmentNames[i % treatmentNames.length],
        doseMl: new Prisma.Decimal(1.0 + (i % 5) * 0.5),
        route: 'oral',
        durationDays: 3 + (i % 7),
        animalCount: 50 + (i % 200),
        withdrawalDays: 7 + (i % 14),
        notes: `Treatment ${i + 1}`,
        externalRef: `treatment-ext-${i}`,
        eventId: `event-treatment-${i.toString().padStart(6, '0')}`,
      },
    })
  }
  console.log(`Created ${recordCount} treatment events`)

  // Create BarnDailyCounts
  for (let i = 0; i < recordCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]
    const recordDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
    recordDate.setHours(0, 0, 0, 0)

    await prisma.barnDailyCount.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        recordDate,
        animalCount: 1000 + (i % 5000),
        averageWeightKg: new Prisma.Decimal(1.0 + (i % 20) * 0.1),
        mortalityCount: i % 10,
        cullCount: i % 5,
        externalRef: `daily-count-ext-${i}`,
      },
    })
  }
  console.log(`Created ${recordCount} daily counts`)

  // Create BarnWelfareChecks
  for (let i = 0; i < Math.min(recordCount, 20); i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = batchIds[i % batchIds.length]

    await prisma.barnWelfareCheck.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        occurredAt: new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000)),
        gaitScore: i % 6,
        lesionScore: i % 6,
        behaviorScore: i % 6,
        observer: `observer-${(i % 5) + 1}`,
        notes: `Welfare check ${i + 1}`,
        externalRef: `welfare-ext-${i}`,
      },
    })
  }
  console.log(`Created ${Math.min(recordCount, 20)} welfare checks`)

  // Create BarnHousingConditions
  for (let i = 0; i < Math.min(recordCount, 20); i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]

    await prisma.barnHousingCondition.create({
      data: {
        tenantId,
        farmId,
        barnId,
        occurredAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)),
        stockingDensity: new Prisma.Decimal(10 + (i % 10)),
        beddingType: 'straw',
        ventilationMode: 'natural',
        temperatureC: new Prisma.Decimal(25 + (i % 5)),
        humidityPct: new Prisma.Decimal(60 + (i % 20)),
        ammoniaPpm: new Prisma.Decimal(10 + (i % 10)),
        notes: `Housing condition ${i + 1}`,
        externalRef: `housing-ext-${i}`,
      },
    })
  }
  console.log(`Created ${Math.min(recordCount, 20)} housing conditions`)

  // Create BarnGeneticProfiles (unique per batch)
  const strains = ['Ross 308', 'Cobb 500', 'Hubbard']
  const breedLines = ['Line A', 'Line B', 'Line C']

	  for (let i = 0; i < Math.min(recordCount, 8); i++) {
	    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
	    const batchId = batchIds[i % batchIds.length]

	    await prisma.barnGeneticProfile.upsert({
      where: {
        BarnGeneticProfile_batch_key: {
          tenantId,
          batchId,
        },
	      },
	      update: {
	        speciesCode: 'chicken',
	        geneticLineCode: i % 3 === 0 ? null : 'COBB500',
	        strain: strains[i % strains.length],
	        breedLine: breedLines[i % breedLines.length],
	        supplier: `Supplier ${(i % 3) + 1}`,
	        hatchDate: new Date(now.getTime() - (i * 30 * 24 * 60 * 60 * 1000)),
	        externalRef: `genetic-ext-${i}`,
	      },
	      create: {
	        tenantId,
	        batchId,
	        speciesCode: 'chicken',
	        geneticLineCode: i % 3 === 0 ? null : 'COBB500',
	        strain: strains[i % strains.length],
	        breedLine: breedLines[i % breedLines.length],
	        supplier: `Supplier ${(i % 3) + 1}`,
	        hatchDate: new Date(now.getTime() - (i * 30 * 24 * 60 * 60 * 1000)),
	        externalRef: `genetic-ext-${i}`,
	      },
	    })
	  }
  console.log(`Created ${Math.min(recordCount, 8)} genetic profiles`)

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
