import { ApiClient } from './client'
import type { paths } from './types'

type JsonResponse<T> = T extends { content: { 'application/json': infer R } } ? R : never

type Response200<T> = T extends { responses: { 200: infer R } } ? JsonResponse<R> : never

type QueryParams<T> = T extends { parameters: { query?: infer Q } } ? Q : undefined

type PathParams<T> = T extends { parameters: { path: infer P } } ? P : undefined

type RequestBody<T> = T extends { requestBody: { content: { 'application/json': infer R } } }
  ? R
  : undefined

export function createEndpoints(client: ApiClient) {
  return {
    tenantsList: () =>
      client.request<Response200<paths['/api/v1/tenants']['get']>>({
        method: 'GET',
        path: '/api/v1/tenants',
      }),

    farmsList: (query?: QueryParams<paths['/api/v1/farms']['get']>) =>
      client.request<Response200<paths['/api/v1/farms']['get']>>({
        method: 'GET',
        path: '/api/v1/farms',
        query: query ?? {},
      }),

    farmsGet: (
      path: PathParams<paths['/api/v1/farms/{farmId}']['get']>,
      query?: QueryParams<paths['/api/v1/farms/{farmId}']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/farms/{farmId}']['get']>>({
        method: 'GET',
        path: `/api/v1/farms/${path?.farmId}`,
        query: query ?? {},
      }),

    barnsList: (query?: QueryParams<paths['/api/v1/barns']['get']>) =>
      client.request<Response200<paths['/api/v1/barns']['get']>>({
        method: 'GET',
        path: '/api/v1/barns',
        query: query ?? {},
      }),

    barnsGet: (
      path: PathParams<paths['/api/v1/barns/{barnId}']['get']>,
      query?: QueryParams<paths['/api/v1/barns/{barnId}']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/barns/{barnId}']['get']>>({
        method: 'GET',
        path: `/api/v1/barns/${path?.barnId}`,
        query: query ?? {},
      }),

    devicesList: (query?: QueryParams<paths['/api/v1/devices']['get']>) =>
      client.request<Response200<paths['/api/v1/devices']['get']>>({
        method: 'GET',
        path: '/api/v1/devices',
        query: query ?? {},
      }),

    devicesGet: (
      path: PathParams<paths['/api/v1/devices/{deviceId}']['get']>,
      query?: QueryParams<paths['/api/v1/devices/{deviceId}']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/devices/{deviceId}']['get']>>({
        method: 'GET',
        path: `/api/v1/devices/${path?.deviceId}`,
        query: query ?? {},
      }),

    dashboardOverview: (query?: QueryParams<paths['/api/v1/dashboard/overview']['get']>) =>
      client.request<Response200<paths['/api/v1/dashboard/overview']['get']>>({
        method: 'GET',
        path: '/api/v1/dashboard/overview',
        query: query ?? {},
      }),

    telemetryReadingsList: (query?: QueryParams<paths['/api/v1/telemetry/readings']['get']>) =>
      client.request<Response200<paths['/api/v1/telemetry/readings']['get']>>({
        method: 'GET',
        path: '/api/v1/telemetry/readings',
        query: query ?? {},
      }),

    telemetryAggregatesList: (query?: QueryParams<paths['/api/v1/telemetry/aggregates']['get']>) =>
      client.request<Response200<paths['/api/v1/telemetry/aggregates']['get']>>({
        method: 'GET',
        path: '/api/v1/telemetry/aggregates',
        query: query ?? {},
      }),

    telemetryLatest: (query?: QueryParams<paths['/api/v1/telemetry/latest']['get']>) =>
      client.request<Response200<paths['/api/v1/telemetry/latest']['get']>>({
        method: 'GET',
        path: '/api/v1/telemetry/latest',
        query: query ?? {},
      }),

    weighvisionSessionsList: (query?: QueryParams<paths['/api/v1/weighvision/sessions']['get']>) =>
      client.request<Response200<paths['/api/v1/weighvision/sessions']['get']>>({
        method: 'GET',
        path: '/api/v1/weighvision/sessions',
        query: query ?? {},
      }),

    weighvisionSessionsGet: (
      path: PathParams<paths['/api/v1/weighvision/sessions/{sessionId}']['get']>,
      query?: QueryParams<paths['/api/v1/weighvision/sessions/{sessionId}']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/weighvision/sessions/{sessionId}']['get']>>({
        method: 'GET',
        path: `/api/v1/weighvision/sessions/${path?.sessionId}`,
        query: query ?? {},
      }),

    weighvisionAnalytics: (query?: QueryParams<paths['/api/v1/weighvision/analytics']['get']>) =>
      client.request<Response200<paths['/api/v1/weighvision/analytics']['get']>>({
        method: 'GET',
        path: '/api/v1/weighvision/analytics',
        query: query ?? {},
      }),

    feedingDaily: (query?: QueryParams<paths['/api/v1/feeding/daily']['get']>) =>
      client.request<Response200<paths['/api/v1/feeding/daily']['get']>>({
        method: 'GET',
        path: '/api/v1/feeding/daily',
        query: query ?? {},
      }),

    feedingFcr: (query?: QueryParams<paths['/api/v1/feeding/fcr']['get']>) =>
      client.request<Response200<paths['/api/v1/feeding/fcr']['get']>>({
        method: 'GET',
        path: '/api/v1/feeding/fcr',
        query: query ?? {},
      }),

    analyticsAnomaliesList: (query?: QueryParams<paths['/api/v1/analytics/anomalies']['get']>) =>
      client.request<Response200<paths['/api/v1/analytics/anomalies']['get']>>({
        method: 'GET',
        path: '/api/v1/analytics/anomalies',
        query: query ?? {},
      }),

    analyticsAnomaliesAcknowledge: (
      path: PathParams<paths['/api/v1/analytics/anomalies/{anomalyId}/acknowledge']['post']>,
      body: RequestBody<paths['/api/v1/analytics/anomalies/{anomalyId}/acknowledge']['post']>,
      query?: QueryParams<paths['/api/v1/analytics/anomalies/{anomalyId}/acknowledge']['post']>
    ) =>
      client.request<Response200<paths['/api/v1/analytics/anomalies/{anomalyId}/acknowledge']['post']>>({
        method: 'POST',
        path: `/api/v1/analytics/anomalies/${path?.anomalyId}/acknowledge`,
        query: query ?? {},
        body,
      }),

    analyticsRecommendationsList: (
      query?: QueryParams<paths['/api/v1/analytics/recommendations']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/analytics/recommendations']['get']>>({
        method: 'GET',
        path: '/api/v1/analytics/recommendations',
        query: query ?? {},
      }),

    analyticsScenario: (
      body: RequestBody<paths['/api/v1/analytics/scenario']['post']>,
      query?: QueryParams<paths['/api/v1/analytics/scenario']['post']>
    ) =>
      client.request<Response200<paths['/api/v1/analytics/scenario']['post']>>({
        method: 'POST',
        path: '/api/v1/analytics/scenario',
        query: query ?? {},
        body,
      }),

    alertsList: (query?: QueryParams<paths['/api/v1/alerts']['get']>) =>
      client.request<Response200<paths['/api/v1/alerts']['get']>>({
        method: 'GET',
        path: '/api/v1/alerts',
        query: query ?? {},
      }),

    alertsAcknowledge: (
      path: PathParams<paths['/api/v1/alerts/{alertId}/acknowledge']['post']>,
      body: RequestBody<paths['/api/v1/alerts/{alertId}/acknowledge']['post']>,
      query?: QueryParams<paths['/api/v1/alerts/{alertId}/acknowledge']['post']>
    ) =>
      client.request<Response200<paths['/api/v1/alerts/{alertId}/acknowledge']['post']>>({
        method: 'POST',
        path: `/api/v1/alerts/${path?.alertId}/acknowledge`,
        query: query ?? {},
        body,
      }),

    opsDataQuality: (query?: QueryParams<paths['/api/v1/ops/data-quality']['get']>) =>
      client.request<Response200<paths['/api/v1/ops/data-quality']['get']>>({
        method: 'GET',
        path: '/api/v1/ops/data-quality',
        query: query ?? {},
      }),

    opsSyncStatus: (query?: QueryParams<paths['/api/v1/ops/sync-status']['get']>) =>
      client.request<Response200<paths['/api/v1/ops/sync-status']['get']>>({
        method: 'GET',
        path: '/api/v1/ops/sync-status',
        query,
      }),

    reportsGenerate: (
      body: RequestBody<paths['/api/v1/reports/generate']['post']>,
      query?: QueryParams<paths['/api/v1/reports/generate']['post']>
    ) =>
      client.request<Response200<paths['/api/v1/reports/generate']['post']>>({
        method: 'POST',
        path: '/api/v1/reports/generate',
        query: query ?? {},
        body,
      }),

    reportsGet: (
      path: PathParams<paths['/api/v1/reports/{reportId}']['get']>,
      query?: QueryParams<paths['/api/v1/reports/{reportId}']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/reports/{reportId}']['get']>>({
        method: 'GET',
        path: `/api/v1/reports/${path?.reportId}`,
        query: query ?? {},
      }),

    exportCreate: (
      body: RequestBody<paths['/api/v1/export/create']['post']>,
      query?: QueryParams<paths['/api/v1/export/create']['post']>
    ) =>
      client.request<Response200<paths['/api/v1/export/create']['post']>>({
        method: 'POST',
        path: '/api/v1/export/create',
        query: query ?? {},
        body,
      }),

    exportGet: (
      path: PathParams<paths['/api/v1/export/{exportId}']['get']>,
      query?: QueryParams<paths['/api/v1/export/{exportId}']['get']>
    ) =>
      client.request<Response200<paths['/api/v1/export/{exportId}']['get']>>({
        method: 'GET',
        path: `/api/v1/export/${path?.exportId}`,
        query: query ?? {},
      }),

    adminUsersList: (query?: QueryParams<paths['/api/v1/admin/users']['get']>) =>
      client.request<Response200<paths['/api/v1/admin/users']['get']>>({
        method: 'GET',
        path: '/api/v1/admin/users',
        query: query ?? {},
      }),

    adminAuditList: (query?: QueryParams<paths['/api/v1/admin/audit']['get']>) =>
      client.request<Response200<paths['/api/v1/admin/audit']['get']>>({
        method: 'GET',
        path: '/api/v1/admin/audit',
        query: query ?? {},
      }),
  }
}
