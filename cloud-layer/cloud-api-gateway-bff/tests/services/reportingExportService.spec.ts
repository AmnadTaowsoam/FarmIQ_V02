import { createReportingExportServiceClient } from '../../src/services/reportingExportService'
import { getServiceBaseUrls } from '../../src/services/dashboardService'

// Mock the dashboardService
jest.mock('../../src/services/dashboardService', () => ({
  getServiceBaseUrls: jest.fn(),
  callDownstreamJson: jest.fn(),
}))

describe('ReportingExportServiceClient', () => {
  const mockCallDownstreamJson = require('../../src/services/dashboardService').callDownstreamJson

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServiceBaseUrls as jest.Mock).mockReturnValue({
      reportingExportBaseUrl: 'http://cloud-reporting-export-service:3000',
    })
  })

  describe('createReportJob', () => {
    it('should build correct URL and propagate headers', async () => {
      const client = createReportingExportServiceClient()
      const headers = {
        authorization: 'Bearer token123',
        'x-tenant-id': 'tenant-123',
        'x-request-id': 'req-456',
      }
      const body = {
        job_type: 'FEED_INTAKE_EXPORT',
        format: 'CSV',
        tenantId: 'tenant-123',
      }

      mockCallDownstreamJson.mockResolvedValue({
        ok: true,
        status: 201,
        data: { id: 'job-789' },
      })

      await client.createReportJob({ body, headers })

      expect(mockCallDownstreamJson).toHaveBeenCalledWith(
        'http://cloud-reporting-export-service:3000/api/v1/reports/jobs',
        {
          method: 'POST',
          headers,
          body,
        }
      )
    })
  })

  describe('listReportJobs', () => {
    it('should build query string correctly', async () => {
      const client = createReportingExportServiceClient()
      const headers = { authorization: 'Bearer token123' }
      const query = {
        tenantId: 'tenant-123',
        farmId: 'farm-456',
        status: 'succeeded',
      }

      mockCallDownstreamJson.mockResolvedValue({
        ok: true,
        status: 200,
        data: { items: [] },
      })

      await client.listReportJobs({ query, headers })

      expect(mockCallDownstreamJson).toHaveBeenCalledWith(
        'http://cloud-reporting-export-service:3000/api/v1/reports/jobs?tenantId=tenant-123&farmId=farm-456&status=succeeded',
        {
          method: 'GET',
          headers,
        }
      )
    })
  })

  describe('getReportJobById', () => {
    it('should include jobId in URL path', async () => {
      const client = createReportingExportServiceClient()
      const headers = { authorization: 'Bearer token123' }
      const query = { tenantId: 'tenant-123' }

      mockCallDownstreamJson.mockResolvedValue({
        ok: true,
        status: 200,
        data: { id: 'job-789' },
      })

      await client.getReportJobById({ jobId: 'job-789', query, headers })

      expect(mockCallDownstreamJson).toHaveBeenCalledWith(
        'http://cloud-reporting-export-service:3000/api/v1/reports/jobs/job-789?tenantId=tenant-123',
        {
          method: 'GET',
          headers,
        }
      )
    })
  })

  describe('getReportJobDownload', () => {
    it('should extract download_url from response', async () => {
      const client = createReportingExportServiceClient()
      const headers = { authorization: 'Bearer token123' }
      const query = { tenantId: 'tenant-123' }

      mockCallDownstreamJson.mockResolvedValue({
        ok: true,
        status: 200,
        data: { download_url: 'https://storage.example.com/report.csv' },
      })

      const result = await client.getReportJobDownload({
        jobId: 'job-789',
        query,
        headers,
      })

      expect(result.url).toBe('https://storage.example.com/report.csv')
    })
  })
})

