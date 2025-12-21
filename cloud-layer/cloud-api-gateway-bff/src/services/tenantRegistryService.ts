import { logger } from '../utils/logger'
import { callDownstreamJson, getServiceBaseUrls } from './dashboardService'

export interface TenantRegistryServiceClient {
  getTenants(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getFarms(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getBarns(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getBatches(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getDevices(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  getStations(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  // Farms
  createFarm(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  updateFarm(params: {
    id: string
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  // Barns
  createBarn(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  updateBarn(params: {
    id: string
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  // Batches
  createBatch(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  updateBatch(params: {
    id: string
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  // Devices
  createDevice(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  updateDevice(params: {
    id: string
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

export const tenantRegistryServiceClient: TenantRegistryServiceClient = {
  async getTenants(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/tenants${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/tenants')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getFarms(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/farms${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/farms')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getBarns(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/barns${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/barns')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getBatches(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/batches${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/batches')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getDevices(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/devices${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/devices')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getStations(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${registryBaseUrl}/api/v1/stations${queryString}`
    logger.info('Calling tenant-registry: GET /api/v1/stations')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  // Farms
  async createFarm(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/farms`
    logger.info('Calling tenant-registry: POST /api/v1/farms')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async updateFarm(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/farms/${params.id}`
    logger.info('Calling tenant-registry: PATCH /api/v1/farms/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'PATCH',
      headers: params.headers,
      body: params.body,
    })
  },

  // Barns
  async createBarn(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/barns`
    logger.info('Calling tenant-registry: POST /api/v1/barns')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async updateBarn(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/barns/${params.id}`
    logger.info('Calling tenant-registry: PATCH /api/v1/barns/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'PATCH',
      headers: params.headers,
      body: params.body,
    })
  },

  // Batches
  async createBatch(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/batches`
    logger.info('Calling tenant-registry: POST /api/v1/batches')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async updateBatch(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/batches/${params.id}`
    logger.info('Calling tenant-registry: PATCH /api/v1/batches/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'PATCH',
      headers: params.headers,
      body: params.body,
    })
  },

  // Devices
  async createDevice(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/devices`
    logger.info('Calling tenant-registry: POST /api/v1/devices')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async updateDevice(params) {
    const { registryBaseUrl } = getServiceBaseUrls()
    const url = `${registryBaseUrl}/api/v1/devices/${params.id}`
    logger.info('Calling tenant-registry: PATCH /api/v1/devices/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'PATCH',
      headers: params.headers,
      body: params.body,
    })
  },
}

