import { logger } from '../utils/logger'
import { callDownstreamJson, getServiceBaseUrls } from './dashboardService'

export interface SensorsServiceClient {
  getSensors(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getSensor(params: {
    sensorId: string
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  createSensor(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  updateSensor(params: {
    sensorId: string
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getBindings(params: {
    sensorId: string
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  createBinding(params: {
    sensorId: string
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getCalibrations(params: {
    sensorId: string
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  createCalibration(params: {
    sensorId: string
    body: unknown
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
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export const sensorsServiceClient: SensorsServiceClient = {
  async getSensors(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/sensors${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/sensors')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getSensor(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/sensors/${params.sensorId}${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/sensors/:sensorId', {
      sensorId: params.sensorId,
    })
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createSensor(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/sensors`
    logger.info('Calling tenant-registry: POST /api/v1/sensors')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async updateSensor(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/sensors/${params.sensorId}`
    logger.info('Calling tenant-registry: PATCH /api/v1/sensors/:sensorId', {
      sensorId: params.sensorId,
    })
    return callDownstreamJson(url, {
      method: 'PATCH',
      headers: params.headers,
      body: params.body,
    })
  },

  async getBindings(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/sensors/${params.sensorId}/bindings${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/sensors/:sensorId/bindings', {
      sensorId: params.sensorId,
    })
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createBinding(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/sensors/${params.sensorId}/bindings`
    logger.info('Calling tenant-registry: POST /api/v1/sensors/:sensorId/bindings', {
      sensorId: params.sensorId,
    })
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async getCalibrations(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/sensors/${params.sensorId}/calibrations${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/sensors/:sensorId/calibrations', {
      sensorId: params.sensorId,
    })
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createCalibration(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/sensors/${params.sensorId}/calibrations`
    logger.info('Calling tenant-registry: POST /api/v1/sensors/:sensorId/calibrations', {
      sensorId: params.sensorId,
    })
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },
}

