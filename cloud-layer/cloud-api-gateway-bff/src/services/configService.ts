import { logger } from '../utils/logger'
import { getServiceBaseUrls, callDownstreamJson } from './dashboardService'

export async function getConfigContext(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()
  const queryParams = new URLSearchParams({
    tenant_id: params.tenantId,
    ...(params.farmId ? { farm_id: params.farmId } : {}),
    ...(params.barnId ? { barn_id: params.barnId } : {}),
  })

  const result = await callDownstreamJson<any>(
    `${bases.configRulesBaseUrl}/api/v1/config/context?${queryParams.toString()}`,
    { headers: params.headers }
  )

  return result.ok ? result.data : null
}

export async function getThresholds(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()
  const queryParams = new URLSearchParams({
    tenant_id: params.tenantId,
    ...(params.farmId ? { farm_id: params.farmId } : {}),
    ...(params.barnId ? { barn_id: params.barnId } : {}),
  })

  const result = await callDownstreamJson<any>(
    `${bases.configRulesBaseUrl}/api/v1/config/thresholds?${queryParams.toString()}`,
    { headers: params.headers }
  )

  return result.ok ? result.data : { data: [] }
}

export async function upsertThreshold(params: {
  body: any
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const result = await callDownstreamJson<any>(
    `${bases.configRulesBaseUrl}/api/v1/config/thresholds`,
    {
      method: 'PUT',
      headers: params.headers,
      body: params.body,
    }
  )

  return result.ok ? result.data : null
}

export async function getTargets(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  species?: string
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()
  const queryParams = new URLSearchParams({
    tenant_id: params.tenantId,
    ...(params.farmId ? { farm_id: params.farmId } : {}),
    ...(params.barnId ? { barn_id: params.barnId } : {}),
    ...(params.species ? { species: params.species } : {}),
  })

  const result = await callDownstreamJson<any>(
    `${bases.configRulesBaseUrl}/api/v1/config/targets?${queryParams.toString()}`,
    { headers: params.headers }
  )

  return result.ok ? result.data : { data: [] }
}

export async function upsertTarget(params: {
  body: any
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const result = await callDownstreamJson<any>(
    `${bases.configRulesBaseUrl}/api/v1/config/targets`,
    {
      method: 'PUT',
      headers: params.headers,
      body: params.body,
    }
  )

  return result.ok ? result.data : null
}

