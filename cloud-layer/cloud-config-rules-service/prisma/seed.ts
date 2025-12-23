import { PrismaClient } from '@prisma/client'
import { SEED_IDS } from './seed-constants'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed (SEED_COUNT=30)...')

  const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

  // Guard: prevent seed in production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
    console.error('ERROR: Seed is not allowed in production!')
    console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
    process.exit(1)
  }

  // Clear existing data (idempotent)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.thresholdRule.deleteMany({})
    await prisma.targetCurve.deleteMany({})
  }

  // Use fixed IDs from shared constants
  const tenantId = SEED_IDS.TENANT_1
  const farmId = SEED_IDS.FARM_1A
  const barnId = SEED_IDS.BARN_1A_1

  // Create SEED_COUNT ThresholdRule records (minimum 30)
  const ruleCount = Math.max(SEED_COUNT, 30)
  const thresholdRules: Array<{
    tenantId: string
    farmId: string | null
    barnId: string | null
    metric: string
    op: string
    value: number
    durationSec: number | null
    severity: string
    enabled: boolean
    updatedBy: string
  }> = [
    {
      tenantId,
      farmId,
      barnId,
      metric: 'temperature',
      op: 'gt',
      value: 30.5,
      durationSec: 300,
      severity: 'warning',
      enabled: true,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      metric: 'temperature',
      op: 'lt',
      value: 18.0,
      durationSec: 300,
      severity: 'critical',
      enabled: true,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      metric: 'humidity',
      op: 'gt',
      value: 80.0,
      durationSec: 600,
      severity: 'warning',
      enabled: true,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      metric: 'humidity',
      op: 'lt',
      value: 40.0,
      durationSec: 600,
      severity: 'warning',
      enabled: true,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId: 'farm-002',
      barnId: 'barn-002',
      metric: 'temperature',
      op: 'gt',
      value: 32.0,
      durationSec: 300,
      severity: 'critical',
      enabled: true,
      updatedBy: 'admin-user',
    },
    {
      tenantId,
      farmId: 'farm-002',
      barnId: 'barn-002',
      metric: 'weight',
      op: 'lt',
      value: 0.5,
      durationSec: 3600,
      severity: 'info',
      enabled: true,
      updatedBy: 'admin-user',
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-003',
      barnId: 'barn-003',
      metric: 'temperature',
      op: 'gte',
      value: 35.0,
      durationSec: 180,
      severity: 'critical',
      enabled: true,
      updatedBy: 'admin-user',
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-003',
      barnId: 'barn-003',
      metric: 'humidity',
      op: 'lte',
      value: 30.0,
      durationSec: 900,
      severity: 'warning',
      enabled: true,
      updatedBy: 'admin-user',
    },
    {
      tenantId,
      farmId,
      barnId,
      metric: 'co2',
      op: 'gt',
      value: 3000.0,
      durationSec: 600,
      severity: 'critical',
      enabled: true,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId: null,
      metric: 'weight',
      op: 'gte',
      value: 2.5,
      durationSec: 7200,
      severity: 'info',
      enabled: false,
      updatedBy: 'system',
    },
  ]

  // Generate additional threshold rules up to SEED_COUNT
  const metrics = ['temperature', 'humidity', 'weight', 'co2', 'ammonia', 'pressure', 'light']
  const ops = ['gt', 'lt', 'gte', 'lte', 'eq']
  const severities = ['info', 'warning', 'critical']
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]

  for (let i = 10; i < ruleCount; i++) {
    const configFarmId = farmIds[i % farmIds.length]
    const configBarnId = barnIds[i % barnIds.length]
    const configTenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const metric = metrics[i % metrics.length]
    const op = ops[i % ops.length]
    const severity = severities[i % severities.length]

    thresholdRules.push({
      tenantId: configTenantId,
      farmId: configFarmId,
      barnId: i % 3 === 0 ? null : configBarnId, // Some rules are farm-level
      metric,
      op,
      value: metric === 'temperature' ? 20 + (i % 15) :
             metric === 'humidity' ? 50 + (i % 30) :
             metric === 'weight' ? 0.5 + (i % 20) * 0.1 :
             metric === 'co2' ? 500 + (i % 500) :
             metric === 'ammonia' ? 5 + (i % 10) :
             metric === 'pressure' ? 1000 + (i % 100) :
             50 + (i % 50),
      durationSec: 300 + (i % 600) * 60,
      severity,
      enabled: i % 5 !== 0, // Most enabled, some disabled
      updatedBy: i % 2 === 0 ? 'system' : 'admin-user',
    })
  }

  for (const rule of thresholdRules) {
    await prisma.thresholdRule.create({
      data: rule,
    })
  }
  console.log(`Created ${thresholdRules.length} threshold rules`)

  // Create SEED_COUNT TargetCurve records (minimum 30)
  const curveCount = Math.max(SEED_COUNT, 30)
  const targetCurves: Array<{
    tenantId: string
    farmId: string | null
    barnId: string | null
    species: string
    day: number
    targetWeight: number | null
    targetFcr: number | null
    updatedBy: string
  }> = [
    {
      tenantId,
      farmId,
      barnId,
      species: 'broiler',
      day: 1,
      targetWeight: 0.05,
      targetFcr: null,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      species: 'broiler',
      day: 7,
      targetWeight: 0.18,
      targetFcr: 1.2,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      species: 'broiler',
      day: 14,
      targetWeight: 0.45,
      targetFcr: 1.35,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      species: 'broiler',
      day: 21,
      targetWeight: 0.85,
      targetFcr: 1.45,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      species: 'broiler',
      day: 28,
      targetWeight: 1.35,
      targetFcr: 1.55,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId,
      barnId,
      species: 'broiler',
      day: 35,
      targetWeight: 1.95,
      targetFcr: 1.65,
      updatedBy: 'system',
    },
    {
      tenantId,
      farmId: 'farm-002',
      barnId: 'barn-002',
      species: 'layer',
      day: 1,
      targetWeight: 0.04,
      targetFcr: null,
      updatedBy: 'admin-user',
    },
    {
      tenantId,
      farmId: 'farm-002',
      barnId: 'barn-002',
      species: 'layer',
      day: 7,
      targetWeight: 0.15,
      targetFcr: 1.15,
      updatedBy: 'admin-user',
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-003',
      barnId: 'barn-003',
      species: 'broiler',
      day: 42,
      targetWeight: 2.65,
      targetFcr: 1.75,
      updatedBy: 'admin-user',
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-003',
      barnId: 'barn-003',
      species: 'broiler',
      day: 49,
      targetWeight: 3.45,
      targetFcr: 1.85,
      updatedBy: 'admin-user',
    },
  ]

  // Generate additional target curves up to SEED_COUNT
  const species = ['broiler', 'layer', 'swine', 'fish']
  const days = Array.from({ length: 50 }, (_, i) => i + 1)

  for (let i = 10; i < curveCount; i++) {
    const configSpecies = species[i % species.length]
    const configFarmId = farmIds[i % farmIds.length]
    const configBarnId = barnIds[i % barnIds.length]
    const configTenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const day = days[i % days.length]
    
    // Calculate target weight based on species and day
    let targetWeight = 0
    let targetFcr: number | null = null
    
    if (configSpecies === 'broiler') {
      targetWeight = 0.05 + (day * 0.08) // Broiler growth curve
      targetFcr = day > 7 ? 1.2 + (day / 50) : null
    } else if (configSpecies === 'layer') {
      targetWeight = 0.04 + (day * 0.06) // Layer growth curve
      targetFcr = day > 7 ? 1.1 + (day / 100) : null
    } else if (configSpecies === 'swine') {
      targetWeight = 0.5 + (day * 0.2) // Swine growth curve
      targetFcr = day > 7 ? 2.0 + (day / 30) : null
    } else {
      targetWeight = 0.01 + (day * 0.05) // Fish growth curve
      targetFcr = day > 7 ? 1.0 + (day / 80) : null
    }

    targetCurves.push({
      tenantId: configTenantId,
      farmId: configFarmId,
      barnId: i % 3 === 0 ? null : configBarnId, // Some curves are farm-level
      species: configSpecies,
      day,
      targetWeight,
      targetFcr,
      updatedBy: i % 2 === 0 ? 'system' : 'admin-user',
    })
  }

  for (const curve of targetCurves) {
    await prisma.targetCurve.create({
      data: curve,
    })
  }
  console.log(`Created ${targetCurves.length} target curves`)

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

