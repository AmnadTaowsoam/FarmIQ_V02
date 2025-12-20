import { getServiceBaseUrls, callDownstreamJson } from './dashboardService'

export async function createAuditEvent(params: {
  body: any
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()

  const result = await callDownstreamJson<any>(
    `${bases.auditLogBaseUrl}/api/v1/audit/events`,
    {
      method: 'POST',
      headers: params.headers,
      body: params.body,
    }
  )

  return result.ok ? result.data : null
}

export async function queryAuditEvents(params: {
  tenantId: string
  actor?: string
  action?: string
  resourceType?: string
  from?: string
  to?: string
  page?: number
  limit?: number
  headers: Record<string, string>
}) {
  const bases = getServiceBaseUrls()
  const queryParams = new URLSearchParams({
    tenant_id: params.tenantId,
    ...(params.actor ? { actor: params.actor } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.resourceType ? { resource_type: params.resourceType } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.page ? { page: params.page.toString() } : {}),
    ...(params.limit ? { limit: params.limit.toString() } : {}),
  })

  const result = await callDownstreamJson<any>(
    `${bases.auditLogBaseUrl}/api/v1/audit/events?${queryParams.toString()}`,
    { headers: params.headers }
  )

  return result.ok ? result.data : { data: [], meta: { page: 1, limit: 25, total: 0, hasNext: false } }
}

