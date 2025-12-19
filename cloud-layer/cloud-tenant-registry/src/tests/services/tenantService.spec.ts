import { PrismaClient } from '@prisma/client'
import { getAllTenants, createTenant } from '../../services/tenantService'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    tenant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

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
      const mockTenant = { id: '1', name: 'New Tenant', status: 'active' }
      const input = { name: 'New Tenant' }
      ;(prisma.tenant.create as jest.Mock).mockResolvedValue(mockTenant)

      const result = await createTenant(input)

      expect(result).toEqual(mockTenant)
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          name: 'New Tenant',
          status: 'active',
        },
      })
    })
  })
})

