export type DeviceHealthStatus = 'online' | 'offline'

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

function parseTimestamp(input: unknown): number | null {
  if (typeof input !== 'string' || input.trim().length === 0) return null
  const ms = Date.parse(input)
  return Number.isNaN(ms) ? null : ms
}

export function resolveDeviceHealthStatus(device: Record<string, unknown>): DeviceHealthStatus {
  const lifecycleStatus = typeof device.status === 'string' ? device.status.toLowerCase() : ''
  if (lifecycleStatus && lifecycleStatus !== 'active' && lifecycleStatus !== 'online') {
    return 'offline'
  }

  const lastSeenMs =
    parseTimestamp(device.lastHello) ??
    parseTimestamp(device.lastSeen) ??
    parseTimestamp(device.last_seen)

  if (lastSeenMs === null) return 'offline'
  return Date.now() - lastSeenMs <= ONLINE_THRESHOLD_MS ? 'online' : 'offline'
}

export function resolveDeviceLastSeen(device: Record<string, unknown>): string | null {
  const candidates = [
    device.lastHello,
    device.lastSeen,
    device.last_seen,
    device.updatedAt,
    device.updated_at,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return null
}
