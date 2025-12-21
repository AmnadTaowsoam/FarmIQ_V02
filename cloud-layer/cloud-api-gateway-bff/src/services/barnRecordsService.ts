import { logger } from '../utils/logger'
import { callDownstreamJson } from './dashboardService'

export interface BarnRecordsServiceClient {
  createMortality(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createMorbidity(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createVaccine(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createTreatment(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createWelfareCheck(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createHousingCondition(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createGeneticProfile(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  createDailyCount(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
  
  listDailyCounts(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>
}

const BARN_RECORDS_SERVICE_URL =
  process.env.BARN_RECORDS_SERVICE_URL ||
  process.env.BARN_RECORDS_BASE_URL ||
  'http://cloud-barn-records-service:5131'

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

export const barnRecordsServiceClient: BarnRecordsServiceClient = {
  async createMortality(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/mortality`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/mortality')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createMorbidity(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/morbidity`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/morbidity')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createVaccine(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/vaccines`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/vaccines')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createTreatment(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/treatments`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/treatments')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createWelfareCheck(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/welfare-checks`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/welfare-checks')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createHousingCondition(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/housing-conditions`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/housing-conditions')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createGeneticProfile(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/genetics`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/genetics')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async createDailyCount(params) {
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/daily-counts`
    logger.info('Calling barn-records-service: POST /api/v1/barn-records/daily-counts')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async listDailyCounts(params) {
    const queryString = buildQueryString(params.query)
    const url = `${BARN_RECORDS_SERVICE_URL}/api/v1/barn-records/daily-counts${queryString}`
    logger.info('Calling barn-records-service: GET /api/v1/barn-records/daily-counts')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },
}

