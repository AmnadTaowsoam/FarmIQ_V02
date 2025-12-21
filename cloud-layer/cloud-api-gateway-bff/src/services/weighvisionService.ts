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

      return callDownstreamJson(url, options)
    },

    async getSessionById(tenantId, sessionId) {
      const url = `${weighvisionReadModelBaseUrl}/api/v1/weighvision/sessions/${sessionId}?tenantId=${tenantId}`

      const options: DownstreamOptions = {
        method: 'GET',
        headers: {},
      }

      return callDownstreamJson(url, options)
    },
  }
}

