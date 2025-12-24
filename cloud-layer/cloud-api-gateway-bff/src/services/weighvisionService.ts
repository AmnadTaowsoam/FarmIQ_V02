import { logger } from '../utils/logger'
import { getServiceBaseUrls } from './dashboardService'
import { callDownstreamJson, DownstreamOptions } from './dashboardService'

export interface WeighVisionServiceClient {
  getSessions(params: {
    tenantId: string
    farmId?: string
    barnId?: string
    batchId?: string
    stationId?: string
    status?: string
    from?: string
    to?: string
    limit?: number
    cursor?: string
  }): Promise<any>

  getSessionById(tenantId: string, sessionId: string): Promise<any>

  getAnalytics(params: {
    tenantId: string
    farmId?: string
    barnId?: string
    batchId?: string
    startDate: string
    endDate: string
    aggregation?: 'daily' | 'weekly' | 'monthly'
  }): Promise<any>

  getWeightAggregates(params: {
    tenantId: string
    farmId?: string
    barnId?: string
    batchId?: string
    start: string
    end: string
  }): Promise<any>
}

export function createWeighVisionServiceClient(): WeighVisionServiceClient {
  const { weighvisionReadModelBaseUrl } = getServiceBaseUrls()

  return {
    async getSessions(params) {
      const query: Record<string, string> = {
        tenantId: params.tenantId,
      }

      if (params.farmId) query.farmId = params.farmId
      if (params.barnId) query.barnId = params.barnId
      if (params.batchId) query.batchId = params.batchId
      if (params.stationId) query.stationId = params.stationId
      if (params.status) query.status = params.status
      if (params.from) query.from = params.from
      if (params.to) query.to = params.to
      if (params.limit) query.limit = String(params.limit)
      if (params.cursor) query.cursor = params.cursor

      const queryString = new URLSearchParams(query).toString()
      const url = `${weighvisionReadModelBaseUrl}/api/v1/weighvision/sessions?${queryString}`

      const options: DownstreamOptions = {
        method: 'GET',
        headers: {},
      }

      const result = await callDownstreamJson(url, options)
      if (!result.ok || !result.data) {
        throw new Error(`Failed to fetch sessions: ${result.status}`)
      }
      return result.data
    },

    async getSessionById(tenantId, sessionId) {
      const url = `${weighvisionReadModelBaseUrl}/api/v1/weighvision/sessions/${sessionId}?tenantId=${tenantId}`

      const options: DownstreamOptions = {
        method: 'GET',
        headers: {},
      }

      const result = await callDownstreamJson(url, options)
      if (!result.ok || !result.data) {
        throw new Error(`Failed to fetch session: ${result.status}`)
      }
      return result.data
    },

    async getAnalytics(params) {
      const query: Record<string, string> = {
        tenantId: params.tenantId,
        start_date: params.startDate,
        end_date: params.endDate,
      }

      if (params.farmId) query.farm_id = params.farmId
      if (params.barnId) query.barn_id = params.barnId
      if (params.batchId) query.batch_id = params.batchId
      if (params.aggregation) query.aggregation = params.aggregation

      const queryString = new URLSearchParams(query).toString()
      const url = `${weighvisionReadModelBaseUrl}/api/v1/weighvision/analytics?${queryString}`

      const options: DownstreamOptions = {
        method: 'GET',
        headers: {},
      }

      const result = await callDownstreamJson(url, options)
      if (!result.ok || !result.data) {
        throw new Error(`Failed to fetch analytics: ${result.status}`)
      }
      return result.data
    },

    async getWeightAggregates(params) {
      const query: Record<string, string> = {
        tenant_id: params.tenantId,
        start: params.start,
        end: params.end,
      }

      if (params.farmId) query.farm_id = params.farmId
      if (params.barnId) query.barn_id = params.barnId
      if (params.batchId) query.batch_id = params.batchId

      const queryString = new URLSearchParams(query).toString()
      const url = `${weighvisionReadModelBaseUrl}/api/v1/weighvision/weight-aggregates?${queryString}`

      const options: DownstreamOptions = {
        method: 'GET',
        headers: {},
      }

      const result = await callDownstreamJson(url, options)
      if (!result.ok || !result.data) {
        throw new Error(`Failed to fetch weight aggregates: ${result.status}`)
      }
      return result.data
    },
  }
}

