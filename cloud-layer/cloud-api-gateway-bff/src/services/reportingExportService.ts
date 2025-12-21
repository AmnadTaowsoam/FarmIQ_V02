import { logger } from '../utils/logger'
import { getServiceBaseUrls, callDownstreamJson, DownstreamOptions } from './dashboardService'

export interface ReportingExportServiceClient {
  createReportJob(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  listReportJobs(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getReportJobById(params: {
    jobId: string
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getReportJobDownload(params: {
    jobId: string
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown; url?: string }>

  streamReportFile(params: {
    jobId: string
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
}

function buildQueryString(query: Record<string, string>): string {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  return params.toString()
}

export function createReportingExportServiceClient(): ReportingExportServiceClient {
  const { reportingExportBaseUrl } = getServiceBaseUrls()

  return {
    async createReportJob(params) {
      const url = `${reportingExportBaseUrl}/api/v1/reports/jobs`
      const options: DownstreamOptions = {
        method: 'POST',
        headers: params.headers,
        body: params.body,
      }
      return callDownstreamJson(url, options)
    },

    async listReportJobs(params) {
      const queryString = buildQueryString(params.query)
      const url = `${reportingExportBaseUrl}/api/v1/reports/jobs${queryString ? `?${queryString}` : ''}`
      const options: DownstreamOptions = {
        method: 'GET',
        headers: params.headers,
      }
      return callDownstreamJson(url, options)
    },

    async getReportJobById(params) {
      const queryString = buildQueryString(params.query)
      const url = `${reportingExportBaseUrl}/api/v1/reports/jobs/${params.jobId}${queryString ? `?${queryString}` : ''}`
      const options: DownstreamOptions = {
        method: 'GET',
        headers: params.headers,
      }
      return callDownstreamJson(url, options)
    },

    async getReportJobDownload(params) {
      const queryString = buildQueryString(params.query)
      const url = `${reportingExportBaseUrl}/api/v1/reports/jobs/${params.jobId}/download${queryString ? `?${queryString}` : ''}`
      const options: DownstreamOptions = {
        method: 'GET',
        headers: params.headers,
      }
      // Download endpoint may return a redirect or URL
      const result = await callDownstreamJson(url, options)
      // If response contains a URL, extract it
      if (result.ok && result.data && typeof result.data === 'object' && 'download_url' in result.data) {
        return {
          ...result,
          url: (result.data as any).download_url,
        }
      }
      return result
    },

    async streamReportFile(params) {
      const queryString = buildQueryString(params.query)
      const url = `${reportingExportBaseUrl}/api/v1/reports/jobs/${params.jobId}/file${queryString ? `?${queryString}` : ''}`
      const options: DownstreamOptions = {
        method: 'GET',
        headers: params.headers,
      }
      return callDownstreamJson(url, options)
    },
  }
}

