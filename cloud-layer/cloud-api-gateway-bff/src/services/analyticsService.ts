import { callDownstreamJson, getServiceBaseUrls, DownstreamOptions } from './dashboardService'

export interface FeedingKpiQuery {
  tenantId: string
  farmId?: string
  barnId?: string
  batchId?: string
  start: string
  end: string
}

export async function getFeedingKpiSeries(params: FeedingKpiQuery) {
  const { analyticsBaseUrl } = getServiceBaseUrls()
  const query: Record<string, string> = {
    tenant_id: params.tenantId,
    start: params.start,
    end: params.end,
  }

  if (params.farmId) query.farm_id = params.farmId
  if (params.barnId) query.barn_id = params.barnId
  if (params.batchId) query.batch_id = params.batchId

  const queryString = new URLSearchParams(query).toString()
  const url = `${analyticsBaseUrl}/api/v1/kpi/feeding?${queryString}`

  const options: DownstreamOptions = {
    method: 'GET',
    headers: {},
  }

  const result = await callDownstreamJson<any>(url, options)
  return result
}
