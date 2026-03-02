import { PrismaClient } from '@prisma/client'
import { getAllTenants, createTenant } from '../../services/tenantService'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $transaction: jest.fn(),
    tenant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tenantQuota: {
      create: jest.fn(),
    },
  }
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

jest.mock('../../utils/uuid', () => ({
  newUuidV7: jest.fn(() => 't-new-001'),
}))

describe('TenantService', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  describe('getAllTenants', () => {
    it('should return all tenants', async () => {
      const mockTenants = [
        { id: '1', name: 'Tenant 1', status: 'active' },
        { id: '2', name: 'Tenant 2', status: 'active' },
      ]
      ;(prisma.tenant.findMany as jest.Mock).mockResolvedValue(mockTenants)

      const result = await getAllTenants()

      expect(result).toEqual(mockTenants)
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('createTenant', () => {
    it('should create a tenant', async () => {
      const mockTenant = { id: 't-new-001', name: 'New Tenant', status: 'active' }
      const input = { name: 'New Tenant' }
      ;(prisma.tenant.create as jest.Mock).mockResolvedValue(mockTenant)
      ;(prisma.tenantQuota.create as jest.Mock).mockResolvedValue({
        tenantId: 't-new-001',
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(prisma)
      )

      const result = await createTenant(input)

      expect(result).toEqual(mockTenant)
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          id: 't-new-001',
          name: 'New Tenant',
          status: 'active',
          type: 'standard',
          region: 'TH',
        },
      })
      expect(prisma.tenantQuota.create).toHaveBeenCalledWith({
        data: {
          tenantId: 't-new-001',
          maxDevices: 100,
          maxFarms: 10,
          maxBarns: 50,
          maxUsers: 20,
          maxStorageGb: 100,
          maxApiCallsPerDay: 10000,
        },
      })
    })
  })
})

