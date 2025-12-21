import { logger } from '../utils/logger'
import { callDownstreamJson } from './dashboardService'

export interface FeedServiceClient {
  getFeedingKpi(params: {
    tenantId: string
    barnId: string
    batchId?: string
    startDate: string
    endDate: string
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createIntakeRecord(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listIntakeRecords(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createLot(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listLots(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createDelivery(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listDeliveries(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createQualityResult(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listQualityResults(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createFormula(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listFormulas(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createProgram(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listPrograms(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
}

const FEED_SERVICE_URL =
  process.env.FEED_SERVICE_URL ||
  process.env.FEED_BASE_URL ||
  'http://cloud-feed-service:5130'

function buildQueryString(query: Record<string, string>): string {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export const feedServiceClient: FeedServiceClient = {
  async getFeedingKpi(params) {
    const queryParams = new URLSearchParams({
      tenantId: params.tenantId,
      barnId: params.barnId,
      startDate: params.startDate,
      endDate: params.endDate,
    })
    if (params.batchId) {
      queryParams.append('batchId', params.batchId)
    }

    const url = `${FEED_SERVICE_URL}/api/v1/kpi/feeding?${queryParams.toString()}`
    logger.info('Calling feed-service: GET /api/v1/kpi/feeding', {
      tenantId: params.tenantId,
      barnId: params.barnId,
    })

    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createIntakeRecord(params) {
    const url = `${FEED_SERVICE_URL}/api/v1/feed/intake-records`
    logger.info('Calling feed-service: POST /api/v1/feed/intake-records')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listIntakeRecords(params) {
    const queryString = buildQueryString(params.query)
    const url = `${FEED_SERVICE_URL}/api/v1/feed/intake-records${queryString}`
    logger.info('Calling feed-service: GET /api/v1/feed/intake-records')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createLot(params) {
    const url = `${FEED_SERVICE_URL}/api/v1/feed/lots`
    logger.info('Calling feed-service: POST /api/v1/feed/lots')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listLots(params) {
    const queryString = buildQueryString(params.query)
    const url = `${FEED_SERVICE_URL}/api/v1/feed/lots${queryString}`
    logger.info('Calling feed-service: GET /api/v1/feed/lots')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createDelivery(params) {
    const url = `${FEED_SERVICE_URL}/api/v1/feed/deliveries`
    logger.info('Calling feed-service: POST /api/v1/feed/deliveries')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listDeliveries(params) {
    const queryString = buildQueryString(params.query)
    const url = `${FEED_SERVICE_URL}/api/v1/feed/deliveries${queryString}`
    logger.info('Calling feed-service: GET /api/v1/feed/deliveries')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createQualityResult(params) {
    const url = `${FEED_SERVICE_URL}/api/v1/feed/quality-results`
    logger.info('Calling feed-service: POST /api/v1/feed/quality-results')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listQualityResults(params) {
    const queryString = buildQueryString(params.query)
    const url = `${FEED_SERVICE_URL}/api/v1/feed/quality-results${queryString}`
    logger.info('Calling feed-service: GET /api/v1/feed/quality-results')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createFormula(params) {
    const url = `${FEED_SERVICE_URL}/api/v1/feed/formulas`
    logger.info('Calling feed-service: POST /api/v1/feed/formulas')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listFormulas(params) {
    const queryString = buildQueryString(params.query)
    const url = `${FEED_SERVICE_URL}/api/v1/feed/formulas${queryString}`
    logger.info('Calling feed-service: GET /api/v1/feed/formulas')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createProgram(params) {
    const url = `${FEED_SERVICE_URL}/api/v1/feed/programs`
    logger.info('Calling feed-service: POST /api/v1/feed/programs')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listPrograms(params) {
    const queryString = buildQueryString(params.query)
    const url = `${FEED_SERVICE_URL}/api/v1/feed/programs${queryString}`
    logger.info('Calling feed-service: GET /api/v1/feed/programs')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },
}

