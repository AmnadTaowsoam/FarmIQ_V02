import { PrismaClient, Prisma } from '@prisma/client'
import { createMorbidityEvent, createDailyCount, listDailyCounts } from '../../src/services/barnRecordsService'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    barnMorbidityEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    barnDailyCount: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
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

describe('BarnRecordsService', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  describe('createMorbidityEvent', () => {
    const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001'
    const baseInput = {
      tenantId,
      farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
      barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
      occurredAt: new Date('2025-01-02T06:00:00Z'),
      diseaseCode: 'coccidiosis',
      severity: 'medium' as const,
      animalCount: 20,
    }

    it('should create a morbidity event', async () => {
      const mockEvent = {
        id: 'event-1',
        ...baseInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.barnMorbidityEvent.create as jest.Mock).mockResolvedValue(mockEvent)

      const result = await createMorbidityEvent(baseInput, tenantId)

      expect(result).toBeDefined()
      expect(prisma.barnMorbidityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          animalCount: 20,
        }),
      })
    })

    it('should enforce idempotency via external_ref', async () => {
      const externalRef = 'ext-morb-001'
      const input = { ...baseInput, externalRef }

      const mockEvent = {
        id: 'event-1',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // First call succeeds
      ;(prisma.barnMorbidityEvent.create as jest.Mock).mockResolvedValueOnce(mockEvent)

      await createMorbidityEvent(input, tenantId)

      // Second call with same external_ref should check for existing record
      ;(prisma.barnMorbidityEvent.findUnique as jest.Mock).mockResolvedValueOnce(mockEvent)

      const result = await createMorbidityEvent(input, tenantId)

      // Should return existing event (idempotent)
      expect(prisma.barnMorbidityEvent.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_externalRef: {
            tenantId,
            externalRef,
          },
        },
      })
    })
  })

  describe('listDailyCounts', () => {
    const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001'

    it('should filter by tenant_id', async () => {
      const mockCounts = [
        { id: 'count-1', tenantId, animalCount: 1000, recordDate: new Date('2025-01-02') },
        { id: 'count-2', tenantId, animalCount: 995, recordDate: new Date('2025-01-03') },
      ]

      ;(prisma.barnDailyCount.findMany as jest.Mock).mockResolvedValue(mockCounts)
      ;(prisma.barnDailyCount.count as jest.Mock).mockResolvedValue(2)

      const result = await listDailyCounts(tenantId, {
        limit: 10,
      })

      expect(result.items).toHaveLength(2)
      expect(prisma.barnDailyCount.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
        }),
        take: 10,
        skip: 0,
      })
    })

    it('should not return records from other tenants', async () => {
      const otherTenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e9999'
      const mockCounts: any[] = [] // Empty because tenant scoping works

      ;(prisma.barnDailyCount.findMany as jest.Mock).mockResolvedValue(mockCounts)
      ;(prisma.barnDailyCount.count as jest.Mock).mockResolvedValue(0)

      await listDailyCounts(otherTenantId, {
        limit: 10,
      })

      expect(prisma.barnDailyCount.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: otherTenantId,
        }),
      })
    })
  })
})

