import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  createSensor,
  getSensorBySensorId,
  createSensorBinding,
  getSensorsByTenant,
} from '../../services/sensorService'

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    sensor: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    sensorBinding: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    sensorCalibration: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    barn: {
      findFirst: vi.fn(),
    },
    device: {
      findFirst: vi.fn(),
    },
  }
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  }
})

describe('SensorService', () => {
  const tenantId = 'tenant-123'
  const sensorId = 'sensor-001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createSensor', () => {
    it('should create a new sensor successfully', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      prisma.sensor.findUnique.mockResolvedValue(null)
      prisma.barn.findFirst.mockResolvedValue({ id: 'barn-123', tenantId })
      prisma.sensor.create.mockResolvedValue({
        id: 'uuid-123',
        tenantId,
        sensorId,
        type: 'temperature',
        unit: 'C',
        enabled: true,
      })

      const result = await createSensor(tenantId, {
        sensorId,
        type: 'temperature',
        unit: 'C',
      })

      expect(result).toBeDefined()
      expect(prisma.sensor.create).toHaveBeenCalled()
    })

    it('should return existing sensor if sensorId already exists (idempotency)', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      const existing = {
        id: 'uuid-123',
        tenantId,
        sensorId,
        type: 'temperature',
        unit: 'C',
      }
      prisma.sensor.findUnique.mockResolvedValue(existing)

      const result = await createSensor(tenantId, {
        sensorId,
        type: 'temperature',
        unit: 'C',
      })

      expect(result).toEqual(existing)
      expect(prisma.sensor.create).not.toHaveBeenCalled()
    })

    it('should throw error if barnId does not exist', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      prisma.sensor.findUnique.mockResolvedValue(null)
      prisma.barn.findFirst.mockResolvedValue(null)

      await expect(
        createSensor(tenantId, {
          sensorId,
          type: 'temperature',
          unit: 'C',
          barnId: 'invalid-barn',
        })
      ).rejects.toThrow('not found')
    })
  })

  describe('getSensorBySensorId', () => {
    it('should return sensor if found', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      const sensor = {
        id: 'uuid-123',
        tenantId,
        sensorId,
        type: 'temperature',
        unit: 'C',
      }
      prisma.sensor.findFirst.mockResolvedValue(sensor)

      const result = await getSensorBySensorId(tenantId, sensorId)

      expect(result).toEqual(sensor)
      expect(prisma.sensor.findFirst).toHaveBeenCalledWith({
        where: { tenantId, sensorId },
        include: expect.any(Object),
      })
    })

    it('should return null if sensor not found', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      prisma.sensor.findFirst.mockResolvedValue(null)

      const result = await getSensorBySensorId(tenantId, sensorId)

      expect(result).toBeNull()
    })
  })

  describe('createSensorBinding', () => {
    it('should create binding if no overlap exists', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      const sensor = { id: 'sensor-uuid', tenantId, sensorId }
      prisma.sensor.findFirst.mockResolvedValue(sensor)
      prisma.device.findFirst.mockResolvedValue({ id: 'device-123', tenantId })
      prisma.sensorBinding.findFirst.mockResolvedValue(null) // No overlap
      prisma.sensorBinding.create.mockResolvedValue({
        id: 'binding-uuid',
        sensorId: sensor.id,
        deviceId: 'device-123',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
      })

      const result = await createSensorBinding(
        tenantId,
        sensorId,
        {
          deviceId: 'device-123',
          protocol: 'mqtt',
          effectiveFrom: new Date('2025-01-01'),
        }
      )

      expect(result).toBeDefined()
      expect(prisma.sensorBinding.create).toHaveBeenCalled()
    })

    it('should throw error if binding overlaps with existing', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      const sensor = { id: 'sensor-uuid', tenantId, sensorId }
      prisma.sensor.findFirst.mockResolvedValue(sensor)
      prisma.device.findFirst.mockResolvedValue({ id: 'device-123', tenantId })
      prisma.sensorBinding.findFirst.mockResolvedValue({
        id: 'existing-binding',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
      }) // Overlap exists

      await expect(
        createSensorBinding(tenantId, sensorId, {
          deviceId: 'device-123',
          protocol: 'mqtt',
          effectiveFrom: new Date('2025-01-15'),
        })
      ).rejects.toThrow('overlaps')
    })
  })

  describe('getSensorsByTenant', () => {
    it('should filter by barnId', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      prisma.sensor.findMany.mockResolvedValue([])

      await getSensorsByTenant(tenantId, { barnId: 'barn-123' })

      expect(prisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            barnId: 'barn-123',
          }),
        })
      )
    })

    it('should filter by deviceId through bindings', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any

      prisma.sensor.findMany.mockResolvedValue([])

      await getSensorsByTenant(tenantId, { deviceId: 'device-123' })

      expect(prisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            bindings: expect.objectContaining({
              some: expect.objectContaining({
                deviceId: 'device-123',
                effectiveTo: null,
              }),
            }),
          }),
        })
      )
    })
  })
})

