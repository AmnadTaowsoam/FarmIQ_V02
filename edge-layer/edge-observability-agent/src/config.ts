export type ServiceTarget = {
  name: string
  baseUrl: string
}

export type ObservabilityConfig = {
  appPort: number
  pollIntervalSeconds: number
  diskPath: string
  targets: ServiceTarget[]
  syncUrl?: string
}

function buildTargetsFromEnv(): ServiceTarget[] {
  const targets: Array<{ env: string; name: string }> = [
    { env: 'EDGE_INGRESS_URL', name: 'edge-ingress-gateway' },
    { env: 'EDGE_TELEMETRY_URL', name: 'edge-telemetry-timeseries' },
    { env: 'EDGE_WEIGHVISION_URL', name: 'edge-weighvision-session' },
    { env: 'EDGE_VISION_URL', name: 'edge-vision-inference' },
    { env: 'EDGE_MEDIA_URL', name: 'edge-media-store' },
    { env: 'EDGE_SYNC_URL', name: 'edge-sync-forwarder' },
  ]

  return targets
    .map((target) => ({
      name: target.name,
      baseUrl: process.env[target.env] || '',
    }))
    .filter((target) => Boolean(target.baseUrl))
}

export function loadConfigFromEnv(): ObservabilityConfig {
  return {
    appPort: Number(process.env.APP_PORT || 3000),
    pollIntervalSeconds: Number(process.env.OBS_POLL_INTERVAL_SECONDS || 30),
    diskPath: process.env.DISK_PATH || '/',
    targets: buildTargetsFromEnv(),
    syncUrl: process.env.EDGE_SYNC_URL,
  }
}
