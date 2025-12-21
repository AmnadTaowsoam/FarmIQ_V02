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

  // Create 10 ThresholdRule records
  const thresholdRules = [
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

  for (const rule of thresholdRules) {
    await prisma.thresholdRule.create({
      data: rule,
    })
  }
  console.log(`Created ${thresholdRules.length} threshold rules`)

  // Create 10 TargetCurve records
  const targetCurves = [
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

