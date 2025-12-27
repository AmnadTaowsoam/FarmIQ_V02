import { getServiceBaseUrls, callDownstreamJson, DownstreamOptions } from './dashboardService'

export interface TelemetryServiceClient {
  getReadings(params: Record<string, string>): Promise<any>
  getAggregates(params: Record<string, string>): Promise<any>
  getMetrics(params: Record<string, string>): Promise<any>
}

export function createTelemetryServiceClient(): TelemetryServiceClient {
  const { telemetryBaseUrl } = getServiceBaseUrls()

  async function get(path: string): Promise<any> {
    const url = `${telemetryBaseUrl}${path}`
    const options: DownstreamOptions = { method: 'GET', headers: {} }
    const result = await callDownstreamJson(url, options)
    if (!result.ok || result.data === undefined) {
      throw new Error(`Failed to fetch telemetry: ${result.status}`)
    }
    return result.data
  }

  return {
    async getReadings(params) {
      const q = new URLSearchParams(params).toString()
      return get(`/api/v1/telemetry/readings?${q}`)
    },
    async getAggregates(params) {
      const q = new URLSearchParams(params).toString()
      return get(`/api/v1/telemetry/aggregates?${q}`)
    },
    async getMetrics(params) {
      const q = new URLSearchParams(params).toString()
      return get(`/api/v1/telemetry/metrics?${q}`)
    },
  }
}

