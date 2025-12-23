import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.auditEvent.deleteMany({})

  // Guard: prevent seed in production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
    console.error('ERROR: Seed is not allowed in production!')
    console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
    process.exit(1)
  }

  const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

  // Create SEED_COUNT AuditEvent records (minimum 30)
  const auditCount = Math.max(SEED_COUNT, 30)
  const auditEvents: Array<{
    tenantId: string
    actorId: string
    actorRole: string
    action: string
    resourceType: string
    resourceId: string | null
    summary: string
    metadataJson?: Prisma.InputJsonValue
    requestId?: string | null
  }> = [
    {
      tenantId: 'tenant-001',
      actorId: 'user-001',
      actorRole: 'tenant_admin',
      action: 'create',
      resourceType: 'farm',
      resourceId: 'farm-001',
      summary: 'Created new farm: Farm Alpha',
      metadataJson: {
        farm_name: 'Farm Alpha',
        location: 'Bangkok, Thailand',
        capacity: 10000,
      },
      requestId: 'req-001',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'user-001',
      actorRole: 'tenant_admin',
      action: 'update',
      resourceType: 'threshold',
      resourceId: 'threshold-001',
      summary: 'Updated temperature threshold to 30.5°C',
      metadataJson: {
        old_value: 28.0,
        new_value: 30.5,
        metric: 'temperature',
      },
      requestId: 'req-002',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'user-002',
      actorRole: 'farm_manager',
      action: 'create',
      resourceType: 'barn',
      resourceId: 'barn-001',
      summary: 'Created new barn: Barn A',
      metadataJson: {
        barn_name: 'Barn A',
        farm_id: 'farm-001',
        capacity: 5000,
      },
      requestId: 'req-003',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'user-003',
      actorRole: 'operator',
      action: 'view',
      resourceType: 'telemetry',
      resourceId: null,
      summary: 'Viewed telemetry data for barn-001',
      metadataJson: {
        barn_id: 'barn-001',
        date_range: '2025-01-01 to 2025-01-20',
      },
      requestId: 'req-004',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'user-001',
      actorRole: 'tenant_admin',
      action: 'delete',
      resourceType: 'threshold',
      resourceId: 'threshold-002',
      summary: 'Deleted threshold rule for humidity',
      metadataJson: {
        metric: 'humidity',
        reason: 'No longer needed',
      },
      requestId: 'req-005',
    },
    {
      tenantId: 'tenant-002',
      actorId: 'user-004',
      actorRole: 'tenant_admin',
      action: 'create',
      resourceType: 'farm',
      resourceId: 'farm-002',
      summary: 'Created new farm: Farm Beta',
      metadataJson: {
        farm_name: 'Farm Beta',
        location: 'Chiang Mai, Thailand',
        capacity: 15000,
      },
      requestId: 'req-006',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'system',
      actorRole: 'system',
      action: 'create',
      resourceType: 'alert',
      resourceId: 'alert-001',
      summary: 'Alert triggered: Temperature exceeds threshold',
      metadataJson: {
        metric: 'temperature',
        value: 32.5,
        threshold: 30.5,
        severity: 'warning',
      },
      requestId: 'req-007',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'user-002',
      actorRole: 'farm_manager',
      action: 'acknowledge',
      resourceType: 'alert',
      resourceId: 'alert-001',
      summary: 'Acknowledged alert: Temperature exceeds threshold',
      metadataJson: {
        alert_id: 'alert-001',
        acknowledged_at: new Date().toISOString(),
      },
      requestId: 'req-008',
    },
    {
      tenantId: 'tenant-001',
      actorId: 'user-001',
      actorRole: 'tenant_admin',
      action: 'update',
      resourceType: 'target_curve',
      resourceId: 'curve-001',
      summary: 'Updated target curve for broiler day 7',
      metadataJson: {
        species: 'broiler',
        day: 7,
        old_target_weight: 0.15,
        new_target_weight: 0.18,
      },
      requestId: 'req-009',
    },
    {
      tenantId: 'tenant-002',
      actorId: 'user-005',
      actorRole: 'operator',
      action: 'view',
      resourceType: 'audit',
      resourceId: null,
      summary: 'Viewed audit log for tenant-002',
      metadataJson: {
        filters: {
          from: '2025-01-01',
          to: '2025-01-20',
        },
      },
      requestId: 'req-010',
    },
  ]

  // Generate additional events up to SEED_COUNT
  const actions = ['create', 'update', 'delete', 'view', 'acknowledge']
  const resourceTypes = ['farm', 'barn', 'batch', 'threshold', 'target_curve', 'telemetry', 'alert', 'audit']
  const tenantIds = ['tenant-001', 'tenant-002']
  const actorRoles = ['tenant_admin', 'farm_manager', 'operator', 'viewer', 'system']

  for (let i = 10; i < auditCount; i++) {
    const tenantId = tenantIds[i % tenantIds.length]
    const action = actions[i % actions.length]
    const resourceType = resourceTypes[i % resourceTypes.length]
    const actorRole = actorRoles[i % actorRoles.length]
    
    auditEvents.push({
      tenantId,
      actorId: `user-${(i % 10) + 1}`,
      actorRole,
      action,
      resourceType,
      resourceId: `${resourceType}-${(i % 20) + 1}`,
      summary: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resourceType}: ${resourceType}-${(i % 20) + 1}`,
      metadataJson: {
        index: i,
        timestamp: new Date().toISOString(),
        resource_type: resourceType,
      },
      requestId: `req-${(i + 1).toString().padStart(3, '0')}`,
    })
  }

  for (const event of auditEvents) {
    await prisma.auditEvent.create({
      data: event,
    })
  }
  console.log(`Created ${auditEvents.length} audit events`)

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

