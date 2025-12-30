import { logger } from '../utils/logger'
import { callDownstreamJson, getServiceBaseUrls } from './dashboardService'

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

export const identityServiceClient = {
  async login(params: { body: { email: string; password: string }; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/auth/login`
    logger.info('Calling identity-access: POST /api/v1/auth/login')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async refresh(params: { body: { refresh_token: string }; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/auth/refresh`
    logger.info('Calling identity-access: POST /api/v1/auth/refresh')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async me(params: { headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/auth/me`
    logger.info('Calling identity-access: GET /api/v1/auth/me')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getAdminUsers(params: { query: Record<string, string>; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${identityBaseUrl}/api/v1/admin/users${queryString}`
    logger.info('Calling identity-access: GET /api/v1/admin/users')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async getAdminUserById(params: { id: string; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/admin/users/${params.id}`
    logger.info('Calling identity-access: GET /api/v1/admin/users/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },

  async createAdminUser(params: { body: unknown; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/admin/users`
    logger.info('Calling identity-access: POST /api/v1/admin/users')
    return callDownstreamJson(url, {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    })
  },

  async updateAdminUser(params: { id: string; body: unknown; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/admin/users/${params.id}`
    logger.info('Calling identity-access: PATCH /api/v1/admin/users/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'PATCH',
      headers: params.headers,
      body: params.body,
    })
  },

  async deleteAdminUser(params: { id: string; headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/admin/users/${params.id}`
    logger.info('Calling identity-access: DELETE /api/v1/admin/users/:id', { id: params.id })
    return callDownstreamJson(url, {
      method: 'DELETE',
      headers: params.headers,
    })
  },

  async getAdminRoles(params: { headers: Record<string, string> }) {
    const { identityBaseUrl } = getServiceBaseUrls()
    const url = `${identityBaseUrl}/api/v1/admin/roles`
    logger.info('Calling identity-access: GET /api/v1/admin/roles')
    return callDownstreamJson(url, {
      method: 'GET',
      headers: params.headers,
    })
  },
}
