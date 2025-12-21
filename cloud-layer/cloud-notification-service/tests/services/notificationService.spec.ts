import { PrismaClient } from '@prisma/client'
import { createNotification, listNotifications } from '../../src/services/notificationService'

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    notification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notificationTarget: {
      createMany: jest.fn(),
    },
    notificationDeliveryAttempt: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

describe('NotificationService', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  describe('createNotification', () => {
    const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001'

    it('should return existing notification for idempotency key', async () => {
      const existing = {
        id: 'notif-1',
        tenantId,
        channel: 'in_app',
        status: 'sent',
        createdAt: new Date(),
      }

      ;(prisma.notification.findUnique as jest.Mock).mockResolvedValueOnce(existing)

      const result = await createNotification({
        tenantId,
        severity: 'info',
        channel: 'in_app',
        title: 'Alert',
        message: 'Duplicate',
        idempotencyKey: 'idemp-1',
      })

      expect(result.notification).toEqual(existing)
      expect(result.wasDuplicate).toBe(true)
      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: {
          notifications_tenant_idempotency_key: {
            tenantId,
            idempotencyKey: 'idemp-1',
          },
        },
      })
    })
  })

  describe('listNotifications', () => {
    it('should filter by tenantId', async () => {
      const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002'
      const mockNotifications = [{ id: 'notif-1', tenantId }]

      ;(prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications)

      const result = await listNotifications(tenantId, { limit: 10 })

      expect(result.items).toEqual(mockNotifications)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        })
      )
    })
  })
})
