import { logger } from '../utils/logger'
import { callDownstreamJson, getServiceBaseUrls } from './dashboardService'

export interface NotificationServiceClient {
  listHistory(params: {
    query: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ ok: boolean; status: number; data?: unknown }>

  send(params: {
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

export const notificationServiceClient: NotificationServiceClient = {
  async listHistory(params) {
    const { notificationBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${notificationBaseUrl}/api/v1/notifications/history${queryString}`
    logger.info('Calling notification-service: GET /api/v1/notifications/history')
    return callDownstreamJson(url, { method: 'GET', headers: params.headers })
  },

  async send(params) {
    const { notificationBaseUrl } = getServiceBaseUrls()
    const url = `${notificationBaseUrl}/api/v1/notifications/send`
    logger.info('Calling notification-service: POST /api/v1/notifications/send')
    return callDownstreamJson(url, { method: 'POST', headers: params.headers, body: params.body })
  },
}

