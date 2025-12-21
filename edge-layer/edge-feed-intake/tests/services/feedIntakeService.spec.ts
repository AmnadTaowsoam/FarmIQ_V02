import { PrismaClient } from '@prisma/client'
import { FeedIntakeService } from '../../src/services/feedIntakeService'
import { Decimal } from '@prisma/client/runtime/library'

// Mock Prisma Client
const mockPrisma = {
  $transaction: jest.fn(),
  feedIntakeLocal: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  feedIntakeDedupe: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
} as unknown as PrismaClient

describe('FeedIntakeService', () => {
  let service: FeedIntakeService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new FeedIntakeService(mockPrisma)
  })

  describe('createFeedIntakeRecord - Deduplication by event_id', () => {
    it('should return existing record when event_id already exists', async () => {
      const existingRecord = {
        id: 'existing-id',
        tenantId: 'tenant-1',
        eventId: 'event-1',
        quantityKg: new Decimal(100),
        occurredAt: new Date('2025-01-01'),
      }

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          feedIntakeLocal: {
            findFirst: jest.fn().mockResolvedValue(existingRecord),
          },
          feedIntakeDedupe: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        }
        return callback(tx)
      })

      const input = {
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        source: 'MQTT_DISPENSED' as const,
        quantityKg: 100,
        occurredAt: new Date('2025-01-01'),
        eventId: 'event-1',
      }

      const result = await service.createFeedIntakeRecord(input)

      expect(result).toEqual(existingRecord)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should return existing record when dedupe table has entry', async () => {
      const existingRecord = {
        id: 'existing-id',
        tenantId: 'tenant-1',
        eventId: 'event-1',
        quantityKg: new Decimal(100),
        occurredAt: new Date('2025-01-01'),
      }

      const dedupeEntry = {
        id: 'dedupe-id',
        tenantId: 'tenant-1',
        eventId: 'event-1',
      }

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          feedIntakeLocal: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce(null) // First check
              .mockResolvedValueOnce(existingRecord), // Second check after dedupe
          },
          feedIntakeDedupe: {
            findUnique: jest.fn().mockResolvedValue(dedupeEntry),
          },
        }
        return callback(tx)
      })

      const input = {
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        source: 'MQTT_DISPENSED' as const,
        quantityKg: 100,
        occurredAt: new Date('2025-01-01'),
        eventId: 'event-1',
      }

      const result = await service.createFeedIntakeRecord(input)

      expect(result).toEqual(existingRecord)
    })

    it('should create new record when event_id is unique', async () => {
      const newRecord = {
        id: 'new-id',
        tenantId: 'tenant-1',
        eventId: 'event-2',
        quantityKg: new Decimal(150),
        occurredAt: new Date('2025-01-02'),
        barnId: 'barn-1',
        source: 'SILO_AUTO',
      }

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          feedIntakeLocal: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(newRecord),
          },
          feedIntakeDedupe: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
        }
        return callback(tx)
      })

      const input = {
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        source: 'SILO_AUTO' as const,
        quantityKg: 150,
        occurredAt: new Date('2025-01-02'),
        eventId: 'event-2',
      }

      const result = await service.createFeedIntakeRecord(input)

      expect(result).toEqual(newRecord)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('createFeedIntakeRecord - Deduplication by external_ref', () => {
    it('should return existing record when external_ref already exists', async () => {
      const existingRecord = {
        id: 'existing-id',
        tenantId: 'tenant-1',
        externalRef: 'ref-123',
        quantityKg: new Decimal(200),
        occurredAt: new Date('2025-01-01'),
      }

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          feedIntakeLocal: {
            findFirst: jest.fn().mockResolvedValue(existingRecord),
          },
          feedIntakeDedupe: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        }
        return callback(tx)
      })

      const input = {
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        source: 'API_IMPORT' as const,
        quantityKg: 200,
        occurredAt: new Date('2025-01-01'),
        externalRef: 'ref-123',
      }

      const result = await service.createFeedIntakeRecord(input)

      expect(result).toEqual(existingRecord)
    })

    it('should create new record when external_ref is unique', async () => {
      const newRecord = {
        id: 'new-id',
        tenantId: 'tenant-1',
        externalRef: 'ref-456',
        quantityKg: new Decimal(250),
        occurredAt: new Date('2025-01-02'),
        barnId: 'barn-1',
        source: 'MANUAL',
      }

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          feedIntakeLocal: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(newRecord),
          },
          feedIntakeDedupe: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        }
        return callback(tx)
      })

      const input = {
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        source: 'MANUAL' as const,
        quantityKg: 250,
        occurredAt: new Date('2025-01-02'),
        externalRef: 'ref-456',
      }

      const result = await service.createFeedIntakeRecord(input)

      expect(result).toEqual(newRecord)
    })
  })

  describe('listFeedIntakeRecords', () => {
    it('should list records with filters', async () => {
      const mockItems = [
        {
          id: 'id-1',
          tenantId: 'tenant-1',
          barnId: 'barn-1',
          quantityKg: new Decimal(100),
          occurredAt: new Date('2025-01-01'),
        },
      ]

      mockPrisma.feedIntakeLocal.findMany = jest.fn().mockResolvedValue(mockItems)
      mockPrisma.feedIntakeLocal.count = jest.fn().mockResolvedValue(1)

      const result = await service.listFeedIntakeRecords({
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 10,
        offset: 0,
      })

      expect(result.items).toEqual(mockItems)
      expect(result.total).toBe(1)
      expect(mockPrisma.feedIntakeLocal.findMany).toHaveBeenCalled()
      expect(mockPrisma.feedIntakeLocal.count).toHaveBeenCalled()
    })
  })
})

