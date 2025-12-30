import { createHash } from 'node:crypto'
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
    process.env.NOTIFICATION_SERVICE_URL ||
    process.env.CLOUD_NOTIFICATION_SERVICE_URL ||
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as T
      return { ok: true, status: response.status, data }
    }

    // Some endpoints (e.g. /api/health) return plain text.
    const text = await response.text()
    try {
      return { ok: true, status: response.status, data: JSON.parse(text) as T }
    } catch {
      return { ok: true, status: response.status, data: text as T }
    }
  } catch (error) {
    logger.error('Downstream call error', { url, error })
    return { ok: false, status: 502 }
  }
}

export async function fetchOverview(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  batchId?: string
  headers: Record<string, string>
  from: string
  to: string
  bucket: '5m' | '1h' | '1d'
}) {
  const bases = getServiceBaseUrls()

  const safeNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  const stableUuidFromString = (input: string): string => {
    // Deterministic UUID-like value derived from input (not cryptographically significant).
    // This keeps frontend list keys stable and satisfies uuid-shaped expectations.
    const hex: string = createHash('sha256').update(input).digest('hex')
    const bytes = Buffer.from(hex.slice(0, 32), 'hex')
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const b = bytes.toString('hex')
    return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20, 32)}`
  }

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
  const analyticsTenantPromise = callDownstreamJson<any>(
    `${bases.analyticsBaseUrl}/api/v1/anomalies?tenantId=${encodeURIComponent(
      params.tenantId
    )}&limit=25`,
    { headers: params.headers }
  )

  const analyticsScopedPromise =
    params.farmId || params.barnId
      ? callDownstreamJson<any>(
          `${bases.analyticsBaseUrl}/api/v1/anomalies?tenantId=${encodeURIComponent(
            params.tenantId
          )}&limit=25${
            params.farmId ? `&farmId=${encodeURIComponent(params.farmId)}` : ''
          }${params.barnId ? `&barnId=${encodeURIComponent(params.barnId)}` : ''}`,
          { headers: params.headers }
        )
      : Promise.resolve(null as any)

  const buildWeightAggUrl = (filters?: { farmId?: string; barnId?: string; batchId?: string }) => {
    const qp: Record<string, string> = {
      tenant_id: params.tenantId,
      start: params.from,
      end: params.to,
    }
    if (filters?.farmId) qp.farm_id = filters.farmId
    if (filters?.barnId) qp.barn_id = filters.barnId
    if (filters?.batchId) qp.batch_id = filters.batchId
    return `${bases.weighvisionReadModelBaseUrl}/api/v1/weighvision/weight-aggregates?${new URLSearchParams(qp).toString()}`
  }

  const weightAggPrimaryPromise = callDownstreamJson<{ items: any[] }>(
    buildWeightAggUrl({ farmId: params.farmId, barnId: params.barnId, batchId: params.batchId }),
    { headers: params.headers }
  )

  const [
    topologyResult,
    metricsResult,
    aggregatesResult,
    analyticsTenantResult,
    analyticsScopedResult,
    weightAggPrimaryResult,
  ] = await Promise.all([
    topologyPromise,
    metricsPromise,
    aggregatesPromise,
    analyticsTenantPromise,
    analyticsScopedPromise,
    weightAggPrimaryPromise,
  ])

  const pickAnalyticsResult = () => {
    const scopedItems: any[] =
      analyticsScopedResult && analyticsScopedResult.ok && Array.isArray(analyticsScopedResult.data)
        ? analyticsScopedResult.data
        : []
    if (scopedItems.length > 0) return analyticsScopedResult
    return analyticsTenantResult
  }

  const analyticsResult = pickAnalyticsResult()

  let weightAggResult = weightAggPrimaryResult
  if (weightAggPrimaryResult.ok && (weightAggPrimaryResult.data?.items || []).length === 0) {
    // Dev-friendly fallback: if a specific farm/barn has no WeighVision rollups,
    // try tenant-level rollups so the Overview chart still demonstrates functionality.
    const fallback = await callDownstreamJson<{ items: any[] }>(buildWeightAggUrl(), {
      headers: params.headers,
    })
    if (fallback.ok) weightAggResult = fallback
  }

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

  const weightItems = (weightAggResult.ok ? weightAggResult.data?.items : []) || []
  const weightTrendByDate = new Map<string, { sumKg: number; count: number }>()

  for (const row of weightItems) {
    const recordDate = row.recordDate || row.record_date
    if (!recordDate) continue
    const dateKey = typeof recordDate === 'string' ? recordDate.slice(0, 10) : new Date(recordDate).toISOString().slice(0, 10)
    const avgKg = safeNumber(row.avgWeightKg ?? row.avg_weight_kg ?? row.avg_weight)
    if (avgKg === null) continue
    const existing = weightTrendByDate.get(dateKey) || { sumKg: 0, count: 0 }
    existing.sumKg += avgKg
    existing.count += 1
    weightTrendByDate.set(dateKey, existing)
  }

  const weight_trend = Array.from(weightTrendByDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, agg]) => ({
      date,
      avg_weight_kg: agg.count > 0 ? Number((agg.sumKg / agg.count).toFixed(3)) : 0,
    }))

  const avg_weight_today_kg = weight_trend.length ? weight_trend[weight_trend.length - 1].avg_weight_kg : undefined

  const analyticsItems: any[] = analyticsResult.ok && Array.isArray(analyticsResult.data) ? analyticsResult.data : []
  const recent_alerts = analyticsItems.slice(0, 10).map((item) => {
    const metric = String(item.metric || 'unknown')
    const value = item.value
    const unit = item.unit ? String(item.unit) : ''
    const severity = item.type === 'anomaly' ? 'warning' : 'info'
    const message =
      (item.payload && typeof item.payload === 'object' && (item.payload.message as string | undefined)) ||
      `Anomaly: ${metric}${value !== null && value !== undefined ? `=${value}${unit ? ` ${unit}` : ''}` : ''}`
    return {
      alert_id: stableUuidFromString(String(item.id || `${metric}:${item.occurred_at || ''}`)),
      severity,
      type: metric,
      message,
      occurred_at: item.occurred_at || new Date().toISOString(),
    }
  })

  return {
    data: {
      kpis: {
        total_farms: totalFarms,
        total_barns: totalBarns,
        active_devices: deviceIds.size,
        critical_alerts: 0,
        ...(avg_weight_today_kg !== undefined ? { avg_weight_today_kg } : {}),
      },
      recent_alerts,
      recent_activity: [],
      weight_trend,
      sensor_status: {},
    },
    meta: {
      topology_ok: topologyResult.ok,
      telemetry_metrics_ok: metricsResult.ok,
      telemetry_aggregates_ok: aggregatesResult.ok,
      analytics_ok: analyticsResult.ok,
      weighvision_aggregates_ok: weightAggResult.ok,
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

