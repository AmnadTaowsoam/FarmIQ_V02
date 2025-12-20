export type JanitorConfig = {
  appPort: number
  mediaBasePath: string
  retentionDays: number
  minFreeDiskGb: number
  intervalSeconds: number
  dryRun: boolean
}

export function loadConfigFromEnv(): JanitorConfig {
  return {
    appPort: Number(process.env.APP_PORT || 3000),
    mediaBasePath: process.env.MEDIA_BASE_PATH || '/data/media',
    retentionDays: Number(process.env.MEDIA_RETENTION_DAYS || 7),
    minFreeDiskGb: Number(process.env.MIN_FREE_DISK_GB || 5),
    intervalSeconds: Number(process.env.JANITOR_INTERVAL_SECONDS || 21600),
    dryRun: String(process.env.JANITOR_DRY_RUN || '').toLowerCase() === 'true',
  }
}
