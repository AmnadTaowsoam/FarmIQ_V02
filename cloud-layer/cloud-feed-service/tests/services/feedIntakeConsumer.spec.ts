import { PrismaClient } from '@prisma/client'
import { handleFeedIntakeRecorded } from '../../src/services/feedIntakeConsumer'
import * as feedService from '../../src/services/feedService'
import * as amqp from 'amqplib'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    feedIntakeRecord: {
      findFirst: jest.fn(),
    },
  }
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

// Mock feedService
jest.mock('../../src/services/feedService', () => ({
  createFeedIntakeRecord: jest.fn(),
}))

describe('FeedIntakeConsumer', () => {
  let prisma: PrismaClient
  let mockMessage: amqp.ConsumeMessage

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()

    // Create mock message
    mockMessage = {
      content: Buffer.from(''),
      fields: {
        deliveryTag: 1,
        redelivered: false,
        exchange: 'farmiq.sync.exchange',
        routingKey: 'feed.intake.recorded',
      },
      properties: {
        headers: {},
      },
    } as any
  })

  describe('handleFeedIntakeRecorded', () => {
    it('should process valid feed.intake.recorded event', async () => {
      const validEnvelope = {
        event_id: 'event-001',
        event_type: 'feed.intake.recorded',
        tenant_id: 'tenant-001',
        farm_id: 'farm-001',
        barn_id: 'barn-001',
        occurred_at: '2025-01-02T10:00:00Z',
        trace_id: 'trace-001',
        payload: {
          source: 'SILO_AUTO',
          quantity_kg: 100.5,
          feed_lot_id: 'lot-001',
        },
      }

      mockMessage.content = Buffer.from(JSON.stringify(validEnvelope))
      ;(prisma.feedIntakeRecord.findFirst as jest.Mock).mockResolvedValue(null)
      ;(feedService.createFeedIntakeRecord as jest.Mock).mockResolvedValue({
        id: 'record-001',
        quantityKg: { toString: () => '100.5' },
      })

      await handleFeedIntakeRecorded(mockMessage)

      expect(prisma.feedIntakeRecord.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-001',
          eventId: 'event-001',
        },
      })
      expect(feedService.createFeedIntakeRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-001',
          farmId: 'farm-001',
          barnId: 'barn-001',
          quantityKg: 100.5,
          eventId: 'event-001',
        }),
        'tenant-001'
      )
    })

    it('should skip duplicate event_id', async () => {
      const envelope = {
        event_id: 'event-001',
        event_type: 'feed.intake.recorded',
        tenant_id: 'tenant-001',
        farm_id: 'farm-001',
        barn_id: 'barn-001',
        occurred_at: '2025-01-02T10:00:00Z',
        payload: {
          quantity_kg: 100.5,
        },
      }

      mockMessage.content = Buffer.from(JSON.stringify(envelope))
      ;(prisma.feedIntakeRecord.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-record',
      })

      await handleFeedIntakeRecorded(mockMessage)

      expect(prisma.feedIntakeRecord.findFirst).toHaveBeenCalled()
      expect(feedService.createFeedIntakeRecord).not.toHaveBeenCalled()
    })

    it('should reject invalid envelope', async () => {
      const invalidEnvelope = {
        event_type: 'feed.intake.recorded',
        // Missing event_id, tenant_id, occurred_at, payload.quantity_kg
      }

      mockMessage.content = Buffer.from(JSON.stringify(invalidEnvelope))

      await expect(handleFeedIntakeRecorded(mockMessage)).rejects.toThrow(
        'Invalid event envelope'
      )

      expect(feedService.createFeedIntakeRecord).not.toHaveBeenCalled()
    })

    it('should reject missing farmId and barnId', async () => {
      const envelope = {
        event_id: 'event-001',
        event_type: 'feed.intake.recorded',
        tenant_id: 'tenant-001',
        // Missing farm_id and barn_id
        occurred_at: '2025-01-02T10:00:00Z',
        payload: {
          quantity_kg: 100.5,
        },
      }

      mockMessage.content = Buffer.from(JSON.stringify(envelope))
      ;(prisma.feedIntakeRecord.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(handleFeedIntakeRecorded(mockMessage)).rejects.toThrow(
        'Missing required fields'
      )
    })
  })
})

