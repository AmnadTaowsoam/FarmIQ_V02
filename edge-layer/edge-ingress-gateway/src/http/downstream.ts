import { logger } from '../utils/logger'

export type DownstreamConfig = {
  telemetryBaseUrl: string
  weighvisionBaseUrl: string
  mediaBaseUrl: string
  timeoutMs: number
}

/**
 *
 */
export function buildDownstreamConfig(): DownstreamConfig {
  return {
    telemetryBaseUrl:
      process.env.EDGE_TELEMETRY_TIMESERIES_URL ??
      'http://edge-telemetry-timeseries:3000',
    weighvisionBaseUrl:
      process.env.EDGE_WEIGHVISION_SESSION_URL ??
      'http://edge-weighvision-session:3000',
    mediaBaseUrl:
      process.env.EDGE_MEDIA_STORE_URL ?? 'http://edge-media-store:3000',
    timeoutMs: Number(process.env.DOWNSTREAM_TIMEOUT_MS ?? 5000),
  }
}

/**
 *
 * @param params
 * @param params.url
 * @param params.body
 * @param params.requestId
 * @param params.traceId
 * @param params.timeoutMs
 */
export async function postJson(params: {
  url: string
  body: unknown
  headers?: Record<string, string>
  requestId: string
  traceId: string
  timeoutMs: number
}): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs)

  try {
    const response = await fetch(params.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': params.requestId,
        'x-trace-id': params.traceId,
        ...params.headers,
      },
      body: JSON.stringify(params.body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn('Downstream non-2xx response', {
        url: params.url,
        status: response.status,
        requestId: params.requestId,
        traceId: params.traceId,
        bodySnippet: text.slice(0, 500),
      })
      return { ok: false, status: response.status, error: text }
    }

    return { ok: true, status: response.status }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    logger.error('Downstream request failed', {
      url: params.url,
      requestId: params.requestId,
      traceId: params.traceId,
      error: message,
    })
    return { ok: false, error: message }
  } finally {
    clearTimeout(timeout)
  }
}

export async function postJsonForJson<T>(params: {
  url: string
  body: unknown
  headers?: Record<string, string>
  requestId: string
  traceId: string
  timeoutMs: number
}): Promise<{ ok: boolean; status?: number; data?: T; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs)

  try {
    const response = await fetch(params.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': params.requestId,
        'x-trace-id': params.traceId,
        ...params.headers,
      },
      body: JSON.stringify(params.body),
      signal: controller.signal,
    })

    const text = await response.text().catch(() => '')
    if (!response.ok) {
      logger.warn('Downstream non-2xx response', {
        url: params.url,
        status: response.status,
        requestId: params.requestId,
        traceId: params.traceId,
        bodySnippet: text.slice(0, 500),
      })
      return { ok: false, status: response.status, error: text }
    }

    const payload = text ? (JSON.parse(text) as T) : ({} as T)
    return { ok: true, status: response.status, data: payload }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    logger.error('Downstream request failed', {
      url: params.url,
      requestId: params.requestId,
      traceId: params.traceId,
      error: message,
    })
    return { ok: false, error: message }
  } finally {
    clearTimeout(timeout)
  }
}
