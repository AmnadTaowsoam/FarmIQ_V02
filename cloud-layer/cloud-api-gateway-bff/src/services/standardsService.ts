import { getServiceBaseUrls } from './dashboardService'
import { callDownstreamJson, DownstreamOptions } from './dashboardService'
import { logger } from '../utils/logger'

export async function proxyJson(
  pathAndQuery: string,
  options: DownstreamOptions
): Promise<{ ok: boolean; status: number; data?: any }> {
  const { standardsBaseUrl } = getServiceBaseUrls()
  const url = `${standardsBaseUrl}${pathAndQuery}`
  return callDownstreamJson(url, options)
}

export async function proxyRaw(
  pathAndQuery: string,
  options: {
    method: 'POST' | 'PUT' | 'PATCH'
    headers: Record<string, string>
    body: Buffer
  }
): Promise<{ ok: boolean; status: number; data?: any; text?: string }> {
  const { standardsBaseUrl } = getServiceBaseUrls()
  const url = `${standardsBaseUrl}${pathAndQuery}`

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    })

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const json = await response.json()
      return { ok: response.ok, status: response.status, data: json }
    }
    const text = await response.text()
    return { ok: response.ok, status: response.status, text }
  } catch (error) {
    logger.error('Downstream raw proxy error', { url, error })
    return { ok: false, status: 502 }
  }
}

