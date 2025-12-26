import { logger } from '../utils/logger'

export interface ServiceBaseUrls {
  identityBaseUrl: string
  registryBaseUrl: string
  telemetryBaseUrl: string
  analyticsBaseUrl: string
  weighvisionReadModelBaseUrl: string
  standardsBaseUrl: string
  configRulesBaseUrl: string
  auditLogBaseUrl: string
  notificationBaseUrl: string
  reportingExportBaseUrl: string
  feedServiceUrl: string
  barnRecordsServiceUrl: string
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

  const standardsBaseUrl =
    process.env.STANDARDS_SERVICE_URL ||
    process.env.CLOUD_STANDARDS_SERVICE_URL ||
    process.env.STANDARDS_BASE_URL ||
    'http://cloud-standards-service:3000'

  const configRulesBaseUrl =
    process.env.CONFIG_RULES_BASE_URL ||
    'http://cloud-config-rules-service:3000'

  const auditLogBaseUrl =
    process.env.AUDIT_LOG_BASE_URL ||
    'http://cloud-audit-log-service:3000'

  const notificationBaseUrl =
    process.env.NOTIFICATION_BASE_URL ||
    'http://cloud-notification-service:3000'

  const reportingExportBaseUrl =
    process.env.REPORTING_EXPORT_BASE_URL ||
    'http://cloud-reporting-export-service:3000'

  const feedServiceUrl =
    process.env.FEED_SERVICE_URL ||
    process.env.FEED_BASE_URL ||
    'http://cloud-feed-service:5130'

  const barnRecordsServiceUrl =
    process.env.BARN_RECORDS_SERVICE_URL ||
    process.env.BARN_RECORDS_BASE_URL ||
    'http://cloud-barn-records-service:5131'

  return {
    identityBaseUrl,
    registryBaseUrl,
    telemetryBaseUrl,
    analyticsBaseUrl,
    weighvisionReadModelBaseUrl,
    standardsBaseUrl,
    configRulesBaseUrl,
    auditLogBaseUrl,
    notificationBaseUrl,
    reportingExportBaseUrl,
    feedServiceUrl,
    barnRecordsServiceUrl,
  }
}

export interface DownstreamOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers: Record<string, string>
  body?: unknown
}

export async function callDownstreamJson<T>(
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
  from: string
  to: string
  bucket: '5m' | '1h' | '1d'
}) {
  const bases = getServiceBaseUrls()

  const topologyPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/topology?tenantId=${encodeURIComponent(params.tenantId)}`,
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
    )}&from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}&bucket=${
      params.bucket
    }`,
    { headers: params.headers }
  )

  // Note: cloud-analytics-service does not provide /api/v1/analytics/alerts.
  // Keep this optional and return empty alerts if unavailable.
  const analyticsPromise = callDownstreamJson<any>(
    `${bases.analyticsBaseUrl}/api/v1/anomalies?tenantId=${encodeURIComponent(
      params.tenantId
    )}&limit=25`,
    { headers: params.headers }
  )

  const [topologyResult, metricsResult, aggregatesResult, analyticsResult] = await Promise.all([
    topologyPromise,
    metricsPromise,
    aggregatesPromise,
    analyticsPromise,
  ])

  const topologyData = topologyResult.ok ? (topologyResult.data as any) : null

  // Build minimal KPI payload expected by the frontend contract
  const farms = topologyData?.farms || []
  const totalFarms = Array.isArray(farms) ? farms.length : 0
  const totalBarns = Array.isArray(farms)
    ? farms.reduce((sum: number, farm: any) => sum + (farm?.barns?.length || 0), 0)
    : 0

  const deviceIds = new Set<string>()
  if (Array.isArray(farms)) {
    for (const farm of farms) {
      for (const device of farm?.devices || []) device?.id && deviceIds.add(device.id)
      for (const barn of farm?.barns || []) {
        for (const device of barn?.devices || []) device?.id && deviceIds.add(device.id)
        for (const batch of barn?.batches || []) {
          for (const device of batch?.devices || []) device?.id && deviceIds.add(device.id)
        }
      }
      for (const batch of farm?.batches || []) {
        for (const device of batch?.devices || []) device?.id && deviceIds.add(device.id)
      }
    }
  }

  return {
    data: {
      kpis: {
        total_farms: totalFarms,
        total_barns: totalBarns,
        active_devices: deviceIds.size,
        critical_alerts: 0,
      },
      recent_alerts: [],
      recent_activity: [],
      weight_trend: [],
      sensor_status: {},
    },
    meta: {
      topology_ok: topologyResult.ok,
      telemetry_metrics_ok: metricsResult.ok,
      telemetry_aggregates_ok: aggregatesResult.ok,
      analytics_ok: analyticsResult.ok,
    },
  }
}

export async function fetchFarmDashboard(params: {
  tenantId: string
  farmId: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()
  const to = new Date().toISOString()
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const farmPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/farms/${encodeURIComponent(
      params.farmId
    )}?tenantId=${encodeURIComponent(params.tenantId)}`,
    { headers: params.headers }
  )

  const barnsPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/barns?tenantId=${encodeURIComponent(
      params.tenantId
    )}&farmId=${encodeURIComponent(params.farmId)}`,
    { headers: params.headers }
  )

  const aggregatesPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/aggregates?tenantId=${encodeURIComponent(
      params.tenantId
    )}&farmId=${encodeURIComponent(params.farmId)}&from=${encodeURIComponent(
      from
    )}&to=${encodeURIComponent(to)}&bucket=5m`,
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
  const to = new Date().toISOString()
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const barnPromise = callDownstreamJson<any>(
    `${bases.registryBaseUrl}/api/v1/barns/${encodeURIComponent(
      params.barnId
    )}?tenantId=${encodeURIComponent(params.tenantId)}`,
    { headers: params.headers }
  )

  const aggregatesPromise = callDownstreamJson<any>(
    `${bases.telemetryBaseUrl}/api/v1/telemetry/aggregates?tenantId=${encodeURIComponent(
      params.tenantId
    )}&barnId=${encodeURIComponent(params.barnId)}&from=${encodeURIComponent(
      from
    )}&to=${encodeURIComponent(to)}&bucket=5m`,
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
    `${bases.analyticsBaseUrl}/api/v1/anomalies?tenantId=${encodeURIComponent(
      params.tenantId
    )}&limit=100`,
    { headers: params.headers }
  )

  return {
    alerts: analytics.ok ? analytics.data : [],
    analyticsAvailable: analytics.ok,
  }
}


