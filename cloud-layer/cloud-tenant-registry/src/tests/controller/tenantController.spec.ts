import { Request, Response } from 'express'
import {
  getTenants,
  getTenant,
  createTenantHandler,
} from '../../controllers/tenantController'
import * as tenantService from '../../services/tenantService'

// Mock the service
jest.mock('../../services/tenantService')

describe('TenantController', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: jest.Mock

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      query: {},
      headers: {},
    }
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      locals: { traceId: 'test-trace-id' },
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  describe('getTenants', () => {
    it('should return all tenants', async () => {
      const mockTenants = [
        { id: '1', name: 'Tenant 1', status: 'active' },
        { id: '2', name: 'Tenant 2', status: 'active' },
      ]
      ;(tenantService.getAllTenants as jest.Mock).mockResolvedValue(mockTenants)

      await getTenants(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith(mockTenants)
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      ;(tenantService.getAllTenants as jest.Mock).mockRejectedValue(error)

      await getTenants(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tenants',
          traceId: 'test-trace-id',
        },
      })
    })
  })

  describe('createTenantHandler', () => {
    it('should create a tenant', async () => {
      const mockTenant = { id: '1', name: 'New Tenant', status: 'active' }
      mockRequest.body = { name: 'New Tenant' }
      ;(tenantService.createTenant as jest.Mock).mockResolvedValue(mockTenant)

      await createTenantHandler(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith(mockTenant)
    })

    it('should handle duplicate name conflict', async () => {
      const error: any = new Error('Unique constraint violation')
      error.code = 'P2002'
      mockRequest.body = { name: 'Existing Tenant' }
      ;(tenantService.createTenant as jest.Mock).mockRejectedValue(error)

      await createTenantHandler(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(409)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CONFLICT',
          message: 'Tenant with this name already exists',
          traceId: 'test-trace-id',
        },
      })
    })
  })
})

