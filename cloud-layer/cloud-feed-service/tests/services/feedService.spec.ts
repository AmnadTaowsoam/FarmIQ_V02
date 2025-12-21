import { PrismaClient, Prisma } from '@prisma/client'
import { createFeedIntakeRecord, listFeedIntakeRecords } from '../../src/services/feedService'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    feedIntakeRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  }
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      JsonNull: null,
      DbNull: null,
    },
  }
})

describe('FeedService', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  describe('createFeedIntakeRecord', () => {
    const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001'
    const baseInput = {
      tenantId,
      farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
      barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
      source: 'MANUAL' as const,
      quantityKg: 100.5,
      occurredAt: new Date('2025-01-02T06:00:00Z'),
    }

    it('should create an intake record', async () => {
      const mockRecord = {
        id: 'record-1',
        ...baseInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.feedIntakeRecord.create as jest.Mock).mockResolvedValue(mockRecord)

      const result = await createFeedIntakeRecord(baseInput, tenantId)

      expect(result).toBeDefined()
      expect(prisma.feedIntakeRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          quantityKg: 100.5,
        }),
      })
    })

    it('should enforce idempotency via external_ref', async () => {
      const externalRef = 'ext-ref-001'
      const input = { ...baseInput, externalRef }

      const mockRecord = {
        id: 'record-1',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // First call succeeds
      ;(prisma.feedIntakeRecord.create as jest.Mock).mockResolvedValueOnce(mockRecord)

      await createFeedIntakeRecord(input, tenantId)

      // Second call with same external_ref should check for existing record
      ;(prisma.feedIntakeRecord.findUnique as jest.Mock).mockResolvedValueOnce(mockRecord)

      const result = await createFeedIntakeRecord(input, tenantId)

      // Should return existing record (idempotent)
      expect(prisma.feedIntakeRecord.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_externalRef: {
            tenantId,
            externalRef,
          },
        },
      })
    })
  })

  describe('listFeedIntakeRecords', () => {
    const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001'

    it('should filter by tenant_id', async () => {
      const mockRecords = [
        { id: 'record-1', tenantId, quantityKg: 100 },
        { id: 'record-2', tenantId, quantityKg: 200 },
      ]

      ;(prisma.feedIntakeRecord.findMany as jest.Mock).mockResolvedValue(mockRecords)
      ;(prisma.feedIntakeRecord.count as jest.Mock).mockResolvedValue(2)

      const result = await listFeedIntakeRecords(tenantId, {
        limit: 10,
      })

      expect(result.items).toHaveLength(2)
      expect(prisma.feedIntakeRecord.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
        }),
        take: 10,
        skip: 0,
      })
    })

    it('should not return records from other tenants', async () => {
      const otherTenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e9999'
      const mockRecords: any[] = [] // Empty because tenant scoping works

      ;(prisma.feedIntakeRecord.findMany as jest.Mock).mockResolvedValue(mockRecords)
      ;(prisma.feedIntakeRecord.count as jest.Mock).mockResolvedValue(0)

      await listFeedIntakeRecords(otherTenantId, {
        limit: 10,
      })

      expect(prisma.feedIntakeRecord.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: otherTenantId,
        }),
      })
    })
  })
})

