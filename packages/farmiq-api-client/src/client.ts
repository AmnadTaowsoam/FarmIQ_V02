import { v4 as uuidv4 } from 'uuid'

export type ApiError = {
  status: number
  code: string
  message: string
  requestId?: string
  traceId?: string
  details?: Record<string, unknown>
}

export type RefreshHandler = () => Promise<string | null>

export type ApiClientConfig = {
  baseUrl: string
  getAccessToken?: () => string | null
  onRefresh?: RefreshHandler
  getTenantId?: () => string | null
}

type RequestOptions = {
  method: 'GET' | 'POST'
  path: string
  query?: Record<string, unknown>
  body?: unknown
  retryOnUnauthorized?: boolean
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly getAccessToken?: () => string | null
  private readonly onRefresh?: RefreshHandler
  private readonly getTenantId?: () => string | null

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl
    this.getAccessToken = config.getAccessToken
    this.onRefresh = config.onRefresh
    this.getTenantId = config.getTenantId
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = new URL(options.path, this.baseUrl)
    const query: Record<string, unknown> = options.query ? { ...options.query } : {}
    const tenantId = this.getTenantId?.()
    if (tenantId && query.tenantId === undefined && query.tenant_id === undefined) {
      query.tenantId = tenantId
    }

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-request-id': uuidv4(),
    }

    const token = this.getAccessToken?.()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (response.status === 401 && options.retryOnUnauthorized !== false && this.onRefresh) {
      const refreshed = await this.onRefresh()
      if (refreshed) {
        return this.request({ ...options, retryOnUnauthorized: false })
      }
    }

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw this.mapError(response.status, errorPayload)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  private mapError(status: number, payload: any): ApiError {
    return {
      status,
      code: payload?.code || payload?.error?.code || 'UNKNOWN_ERROR',
      message: payload?.message || payload?.error?.message || 'Unexpected error',
      requestId: payload?.requestId || payload?.error?.requestId,
      traceId: payload?.traceId || payload?.error?.traceId,
      details: payload?.details || payload?.error?.details,
    }
  }
}
