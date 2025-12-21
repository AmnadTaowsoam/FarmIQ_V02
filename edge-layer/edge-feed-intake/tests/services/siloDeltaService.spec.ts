import { SiloDeltaService } from '../../src/services/siloDeltaService'
import { FeedIntakeService } from '../../src/services/feedIntakeService'
import { PrismaClient, Decimal } from '@prisma/client'

// Mock dependencies
const mockFeedIntakeService = {
  createFeedIntakeRecord: jest.fn(),
} as unknown as FeedIntakeService

const mockPrisma = {
  siloWeightSnapshot: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
} as unknown as PrismaClient

describe('SiloDeltaService', () => {
  let service: SiloDeltaService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SiloDeltaService(mockFeedIntakeService, mockPrisma)
  })

  describe('processSiloWeightTelemetry', () => {
    it('should create intake record when weight decreases above threshold', async () => {
      const previousSnapshot = {
        id: 'snapshot-id',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        weightKg: new Decimal(1000),
        recordedAt: new Date('2025-01-01T10:00:00Z'),
      }

      mockPrisma.siloWeightSnapshot.findUnique = jest.fn().mockResolvedValue(previousSnapshot)
      mockPrisma.siloWeightSnapshot.upsert = jest.fn().mockResolvedValue({})
      mockFeedIntakeService.createFeedIntakeRecord = jest.fn().mockResolvedValue({
        id: 'intake-id',
      })

      await service.processSiloWeightTelemetry({
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        deviceId: 'device-1',
        currentWeightKg: 900, // 100kg decrease
        occurredAt: new Date('2025-01-01T11:00:00Z'),
      })

      expect(mockFeedIntakeService.createFeedIntakeRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          barnId: 'barn-1',
          deviceId: 'device-1',
          source: 'SILO_AUTO',
          quantityKg: 100, // 1000 - 900
          occurredAt: expect.any(Date),
          eventId: expect.any(String),
        })
      )
    })

    it('should not create intake record when weight increases', async () => {
      const previousSnapshot = {
        id: 'snapshot-id',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        weightKg: new Decimal(1000),
        recordedAt: new Date('2025-01-01T10:00:00Z'),
      }

      mockPrisma.siloWeightSnapshot.findUnique = jest.fn().mockResolvedValue(previousSnapshot)
      mockPrisma.siloWeightSnapshot.upsert = jest.fn().mockResolvedValue({})

      await service.processSiloWeightTelemetry({
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        deviceId: 'device-1',
        currentWeightKg: 1100, // Weight increased
        occurredAt: new Date('2025-01-01T11:00:00Z'),
      })

      expect(mockFeedIntakeService.createFeedIntakeRecord).not.toHaveBeenCalled()
    })

    it('should not create intake record when delta is below threshold', async () => {
      const previousSnapshot = {
        id: 'snapshot-id',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        weightKg: new Decimal(1000),
        recordedAt: new Date('2025-01-01T10:00:00Z'),
      }

      mockPrisma.siloWeightSnapshot.findUnique = jest.fn().mockResolvedValue(previousSnapshot)
      mockPrisma.siloWeightSnapshot.upsert = jest.fn().mockResolvedValue({})

      await service.processSiloWeightTelemetry({
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        deviceId: 'device-1',
        currentWeightKg: 999.95, // Only 0.05kg decrease (below 0.1kg threshold)
        occurredAt: new Date('2025-01-01T11:00:00Z'),
      })

      expect(mockFeedIntakeService.createFeedIntakeRecord).not.toHaveBeenCalled()
    })

    it('should update snapshot when no previous snapshot exists', async () => {
      mockPrisma.siloWeightSnapshot.findUnique = jest.fn().mockResolvedValue(null)
      mockPrisma.siloWeightSnapshot.upsert = jest.fn().mockResolvedValue({})

      await service.processSiloWeightTelemetry({
        tenantId: 'tenant-1',
        barnId: 'barn-1',
        deviceId: 'device-1',
        currentWeightKg: 1000,
        occurredAt: new Date('2025-01-01T11:00:00Z'),
      })

      expect(mockFeedIntakeService.createFeedIntakeRecord).not.toHaveBeenCalled()
      expect(mockPrisma.siloWeightSnapshot.upsert).toHaveBeenCalled()
    })
  })
})

