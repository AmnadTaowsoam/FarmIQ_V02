export type EdgeContext = {
  tenantId: string
  farmId: string
  barnId: string
}

export type PolicySyncConfig = {
  appPort: number
  databaseUrl: string
  bffBaseUrl: string
  cloudToken?: string
  syncIntervalSeconds: number
  backoffCapSeconds: number
  requestTimeoutSeconds: number
  contexts: EdgeContext[]
}

function parseContextsFromEnv(): EdgeContext[] {
  if (process.env.EDGE_CONTEXTS) {
    try {
      const parsed = JSON.parse(process.env.EDGE_CONTEXTS) as EdgeContext[]
      return parsed.filter(
        (ctx) => ctx?.tenantId && ctx?.farmId && ctx?.barnId
      )
    } catch {
      return []
    }
  }

  const tenantId = process.env.EDGE_TENANT_ID
  const farmId = process.env.EDGE_FARM_ID
  const barnId = process.env.EDGE_BARN_ID

  if (tenantId && farmId && barnId) {
    return [{ tenantId, farmId, barnId }]
  }

  return []
}

export function loadConfigFromEnv(): PolicySyncConfig {
  const appPort = Number(process.env.APP_PORT || 3000)
  const databaseUrl = process.env.DATABASE_URL || ''
  const bffBaseUrl = process.env.BFF_BASE_URL || ''
  const cloudToken = process.env.EDGE_CLOUD_TOKEN
  const syncIntervalSeconds = Number(process.env.POLICY_SYNC_INTERVAL_SECONDS || 60)
  const backoffCapSeconds = Number(process.env.POLICY_SYNC_BACKOFF_CAP_SECONDS || 600)
  const requestTimeoutSeconds = Number(process.env.POLICY_SYNC_TIMEOUT_SECONDS || 10)
  const contexts = parseContextsFromEnv()

  return {
    appPort,
    databaseUrl,
    bffBaseUrl,
    cloudToken,
    syncIntervalSeconds,
    backoffCapSeconds,
    requestTimeoutSeconds,
    contexts,
  }
}
