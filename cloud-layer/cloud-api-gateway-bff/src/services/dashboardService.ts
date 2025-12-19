import { logger } from '../utils/logger'

export interface ServiceBaseUrls {
  identityBaseUrl: string
  registryBaseUrl: string
  telemetryBaseUrl: string
  analyticsBaseUrl: string
  weighvisionReadModelBaseUrl: string
}

export function getServiceBaseUrls(): ServiceBaseUrls {
  const identityBaseUrl =
    process.env.IDENTITY_BASE_URL ||
    process.env.IDENTITY_SERVICE_URL ||
    'http://cloud-identity-access:3000'

  const registryBaseUrl =
    process.env.REGISTRY_BASE_URL ||
    process.env.TENANT_REGISTRY_URL ||
    'http://cloud-tenant-registry:3000'

  const telemetryBaseUrl =
    process.env.TELEMETRY_BASE_URL ||
    process.env.TELEMETRY_SERVICE_URL ||
    'http://cloud-telemetry-service:3000'

  const analyticsBaseUrl =
    process.env.ANALYTICS_BASE_URL ||
    process.env.ANALYTICS_SERVICE_URL ||
    'http://cloud-analytics-service:8000'

  const weighvisionReadModelBaseUrl =
    process.env.WEIGHVISION_READMODEL_BASE_URL ||
    'http://cloud-weighvision-readmodel:3000'

  return {
    identityBaseUrl,
    registryBaseUrl,
    telemetryBaseUrl,
    analyticsBaseUrl,
    weighvisionReadModelBaseUrl,
  }
}

interface DownstreamOptions {
  method?: 'GET' | 'POST'
  headers: Record<string, string>
  body?: unknown
}

async function callDownstreamJson<T>(
  url: string,
  options: DownstreamOptions
): Promise<{ ok: boolean; status: number; data?: T }> {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      logger.warn('Downstream call failed', { url, status: response.status })
      return { ok: false, status: response.status }
    }

    const data = (await response.json()) as T
    return { ok: true, status: response.status, data }
  } catch (error) {
    logger.error('Downstream call error', { url, error })
    return { ok: false, status: 502 }
  }
}

export async function fetchOverview(params: {
  tenantId: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const topologyPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/topology`,
    {
      headers: params.headers,
    }
  )

  const metricsPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/metrics?tenantId=${encodeURIComponent(
      params.tenantId
    )}`,
    { headers: params.headers }
  )

  const aggregatesPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/aggregates?tenantId=${encodeURIComponent(
      params.tenantId
    )}`,
    { headers: params.headers }
  )

  const analyticsPromise = callDownstreamJson<any>(
    `${bases.analyticsBaseUrl}/api/v1/analytics/alerts?tenantId=${encodeURIComponent(
      params.tenantId
    )}`,
    { headers: params.headers }
  )

  const [topology, metrics, aggregates, analytics] = await Promise.all([
    topologyPromise,
    metricsPromise,
    aggregatesPromise,
    analyticsPromise,
  ])

  return {
    topology: topology.ok ? topology.data : null,
    telemetry: {
      metrics: metrics.ok ? metrics.data : { metrics: [] },
      aggregates: aggregates.ok ? aggregates.data : [],
    },
    alerts: analytics.ok ? analytics.data : [],
    analyticsAvailable: analytics.ok,
  }
}

export async function fetchFarmDashboard(params: {
  tenantId: string
  farmId: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const farmPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/farms/${encodeURIComponent(
      params.farmId
    )}`,
    { headers: params.headers }
  )

  const barnsPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/barns?farmId=${encodeURIComponent(
      params.farmId
    )}`,
    { headers: params.headers }
  )

  const aggregatesPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/aggregates?tenantId=${encodeURIComponent(
      params.tenantId
    )}&farmId=${encodeURIComponent(params.farmId)}`,
    { headers: params.headers }
  )

  const [farm, barns, aggregates] = await Promise.all([
    farmPromise,
    barnsPromise,
    aggregatesPromise,
  ])

  return {
    farm: farm.ok ? farm.data : null,
    barns: barns.ok ? barns.data : [],
    telemetryAggregates: aggregates.ok ? aggregates.data : [],
  }
}

export async function fetchBarnDashboard(params: {
  tenantId: string
  barnId: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const barnPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/barns/${encodeURIComponent(
      params.barnId
    )}`,
    { headers: params.headers }
  )

  const aggregatesPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/aggregates?tenantId=${encodeURIComponent(
      params.tenantId
    )}&barnId=${encodeURIComponent(params.barnId)}`,
    { headers: params.headers }
  )

  const readingsPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/readings?tenantId=${encodeURIComponent(
      params.tenantId
    )}&barnId=${encodeURIComponent(params.barnId)}`,
    { headers: params.headers }
  )

  const [barn, aggregates, readings] = await Promise.all([
    barnPromise,
    aggregatesPromise,
    readingsPromise,
  ])

  return {
    barn: barn.ok ? barn.data : null,
    telemetryAggregates: aggregates.ok ? aggregates.data : [],
    telemetryReadings: readings.ok ? readings.data : [],
  }
}

export async function fetchAlerts(params: {
  tenantId: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const analytics = await callDownstreamJson<any>(
    `${bases.analyticsBaseUrl}/api/v1/analytics/alerts?tenantId=${encodeURIComponent(
      params.tenantId
    )}`,
    { headers: params.headers }
  )

  return {
    alerts: analytics.ok ? analytics.data : [],
    analyticsAvailable: analytics.ok,
  }
}


