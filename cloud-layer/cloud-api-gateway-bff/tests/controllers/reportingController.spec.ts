import { Request, Response } from 'express'
import {
  createReportJobHandler,
  listReportJobsHandler,
  getReportJobByIdHandler,
} from '../../src/controllers/reportingController'
import { createReportingExportServiceClient } from '../../src/services/reportingExportService'

// Mock the service client
jest.mock('../../src/services/reportingExportService', () => ({
  createReportingExportServiceClient: jest.fn(),
}))

describe('ReportingController', () => {
  let mockService: any
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockService = {
      createReportJob: jest.fn(),
      listReportJobs: jest.fn(),
      getReportJobById: jest.fn(),
    }
    ;(createReportingExportServiceClient as jest.Mock).mockReturnValue(mockService)

    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {
        tenantId: 'tenant-123',
        requestId: 'req-456',
        traceId: 'trace-789',
      },
    }
  })

  describe('createReportJobHandler', () => {
    it('should return 400 if tenantId is missing', async () => {
      mockRes.locals!.tenantId = undefined
      mockReq.body = {}

      await createReportJobHandler(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: 'trace-789',
        },
      })
    })

    it('should call service and return 201 on success', async () => {
      mockReq.body = {
        job_type: 'FEED_INTAKE_EXPORT',
        format: 'CSV',
        tenantId: 'tenant-123',
      }

      mockService.createReportJob.mockResolvedValue({
        ok: true,
        status: 201,
        data: { id: 'job-789' },
      })

      await createReportJobHandler(mockReq as Request, mockRes as Response)

      expect(mockService.createReportJob).toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should map downstream 400 error correctly', async () => {
      mockReq.body = {
        job_type: 'INVALID_TYPE',
        format: 'CSV',
        tenantId: 'tenant-123',
      }

      mockService.createReportJob.mockResolvedValue({
        ok: false,
        status: 400,
      })

      await createReportJobHandler(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Downstream service error',
          traceId: 'trace-789',
        },
      })
    })
  })

  describe('listReportJobsHandler', () => {
    it('should return 400 if tenantId is missing', async () => {
      mockRes.locals!.tenantId = undefined
      mockReq.query = {}

      await listReportJobsHandler(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should call service with query params', async () => {
      mockReq.query = {
        tenantId: 'tenant-123',
        farmId: 'farm-456',
        status: 'succeeded',
      }

      mockService.listReportJobs.mockResolvedValue({
        ok: true,
        status: 200,
        data: { items: [] },
      })

      await listReportJobsHandler(mockReq as Request, mockRes as Response)

      expect(mockService.listReportJobs).toHaveBeenCalledWith({
        query: expect.objectContaining({
          tenantId: 'tenant-123',
          farmId: 'farm-456',
          status: 'succeeded',
        }),
        headers: expect.any(Object),
      })
    })
  })

  describe('getReportJobByIdHandler', () => {
    it('should return 404 when job not found', async () => {
      mockReq.params = { jobId: 'job-999' }
      mockReq.query = { tenantId: 'tenant-123' }

      mockService.getReportJobById.mockResolvedValue({
        ok: false,
        status: 404,
      })

      await getReportJobByIdHandler(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Downstream service error',
          traceId: 'trace-789',
        },
      })
    })
  })
})

