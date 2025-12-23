import { PrismaClient, NotificationTargetType } from '@prisma/client'

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
    try {
      await prisma.notificationDeliveryAttempt.deleteMany({})
      await prisma.notificationTarget.deleteMany({})
      await prisma.notification.deleteMany({})
    } catch (error: any) {
      // Table might not exist yet, ignore error
      if (error.code !== 'P2021') {
        throw error
      }
    }
  }

  const notificationCount = Math.max(SEED_COUNT, 30)
  const severities = ['info', 'warning', 'critical'] as const
  const channels = ['in_app', 'webhook', 'email', 'sms'] as const
  const statuses = ['created', 'queued', 'sent', 'failed', 'canceled'] as const
  const farmIds = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barnIds = [SEED_IDS.BARN_1A_1, SEED_IDS.BARN_1A_2, SEED_IDS.BARN_1B_1, SEED_IDS.BARN_1B_2, SEED_IDS.BARN_2A_1, SEED_IDS.BARN_2A_2]
  const batchIds = [SEED_IDS.BATCH_1A_1, SEED_IDS.BATCH_1A_2, SEED_IDS.BATCH_1B_1, SEED_IDS.BATCH_1B_2]

  const now = new Date()

  // Create notifications
  for (let i = 0; i < notificationCount; i++) {
    const tenantId = i % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farmIds[i % farmIds.length]
    const barnId = barnIds[i % barnIds.length]
    const batchId = i % 3 === 0 ? null : batchIds[i % batchIds.length]
    const severity = severities[i % severities.length]
    const channel = channels[i % channels.length]
    const status = statuses[i % statuses.length]

    const notification = await prisma.notification.create({
      data: {
        tenantId,
        farmId,
        barnId,
        batchId,
        severity,
        channel,
        title: `Notification ${i + 1}: ${severity} alert`,
        message: `This is a ${severity} notification for farm ${farmId.substring(0, 8)}...`,
        payloadJson: {
          index: i,
          severity,
          channel,
          timestamp: now.toISOString(),
        },
        status,
        dedupeKey: `dedupe-${tenantId}-${i}`,
        idempotencyKey: `idemp-${tenantId}-${i}`,
        externalRef: `ext-ref-${i}`,
        createdBy: `user-${(i % 10) + 1}`,
        createdAt: new Date(now.getTime() - (i * 60 * 60 * 1000)), // Spread over time
        targets: {
          create: [
            {
              tenantId,
              targetType: 'user' as NotificationTargetType,
              targetValue: `user-${(i % 5) + 1}`,
            },
            ...(i % 2 === 0 ? [{
              tenantId,
              targetType: 'role' as NotificationTargetType,
              targetValue: 'farm_manager',
            }] : []),
          ],
        },
        deliveryAttempts: {
          create: status === 'sent' || status === 'failed' ? [
            {
              tenantId,
              attemptNo: 1,
              provider: channel,
              destination: channel === 'email' ? `user${i}@example.com` :
                         channel === 'sms' ? `+1234567890${i}` :
                         channel === 'webhook' ? `https://webhook.example.com/${i}` :
                         null,
              status: status === 'sent' ? 'success' : 'fail',
              errorMessage: status === 'failed' ? 'Delivery failed' : null,
              responseCode: status === 'sent' ? 200 : 500,
            },
          ] : [],
        },
      },
    })

    if (i % 10 === 0) {
      console.log(`Created ${i + 1} notifications...`)
    }
  }

  console.log(`Created ${notificationCount} notifications`)
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
