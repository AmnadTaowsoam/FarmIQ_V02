import { logger } from '../utils/logger'
import { getServiceBaseUrls } from './dashboardService'

export interface DownstreamResult<T = unknown> {
  ok: boolean
  status: number
  data?: T
}

function getTimeoutMs(): number {
  const raw = process.env.NOTIFICATION_TIMEOUT_MS || '2500'
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 2500
  return Math.min(Math.max(250, Math.floor(n)), 10_000)
}

async function callDownstreamJsonWithBody<T>(
  url: string,
  options: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: unknown }
): Promise<DownstreamResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs())

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        'content-type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''
    let data: any = undefined
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    logger.error('Downstream call error', { url, error })
    return { ok: false, status: 502 }
  } finally {
    clearTimeout(timeout)
  }
}

function buildQueryString(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export const dashboardNotificationServiceClient = {
  async getInbox(params: {
    query: { topic?: string; cursor?: string; limit?: string }
    headers: Record<string, string>
  }): Promise<DownstreamResult> {
    const { notificationBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${notificationBaseUrl}/api/v1/notifications/inbox${queryString}`
    logger.info('Calling notification-service: GET /api/v1/notifications/inbox')
    return callDownstreamJsonWithBody(url, { method: 'GET', headers: params.headers })
  },

  async getHistory(params: {
    query: Record<string, string | undefined>
    headers: Record<string, string>
  }): Promise<DownstreamResult> {
    const { notificationBaseUrl } = getServiceBaseUrls()
    const queryString = buildQueryString(params.query)
    const url = `${notificationBaseUrl}/api/v1/notifications/history${queryString}`
    logger.info('Calling notification-service: GET /api/v1/notifications/history')
    return callDownstreamJsonWithBody(url, { method: 'GET', headers: params.headers })
  },

  async send(params: {
    body: unknown
    headers: Record<string, string>
  }): Promise<DownstreamResult> {
    const { notificationBaseUrl } = getServiceBaseUrls()
    const url = `${notificationBaseUrl}/api/v1/notifications/send`
    logger.info('Calling notification-service: POST /api/v1/notifications/send')
    return callDownstreamJsonWithBody(url, { method: 'POST', headers: params.headers, body: params.body })
  },
}

