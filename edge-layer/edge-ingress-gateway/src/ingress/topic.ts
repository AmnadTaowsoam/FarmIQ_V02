export type TelemetryTopic = {
  kind: 'telemetry'
  tenantId: string
  farmId: string
  barnId: string
  deviceId: string
  metric: string
}

export type GenericEventTopic = {
  kind: 'event'
  tenantId: string
  farmId: string
  barnId: string
  deviceId: string
  eventType: string
}

export type WeighVisionTopic = {
  kind: 'weighvision'
  tenantId: string
  farmId: string
  barnId: string
  stationId: string
  sessionId: string
  eventType: string
}

export type StatusTopic = {
  kind: 'status'
  tenantId: string
  farmId: string
  barnId: string
  deviceId: string
}

export type ParsedTopic =
  | TelemetryTopic
  | GenericEventTopic
  | WeighVisionTopic
  | StatusTopic

/**
 *
 * @param topic
 */
export function parseTopic(topic: string): ParsedTopic | null {
  const segments = topic.split('/').filter(Boolean)

  if (
    segments.length >= 2 &&
    segments[0] === 'iot' &&
    segments[1] === 'telemetry'
  ) {
    if (segments.length !== 7) return null
    const [, , tenantId, farmId, barnId, deviceId, metric] = segments
    if (!tenantId || !farmId || !barnId || !deviceId || !metric) return null
    return { kind: 'telemetry', tenantId, farmId, barnId, deviceId, metric }
  }

  if (
    segments.length >= 2 &&
    segments[0] === 'iot' &&
    segments[1] === 'event'
  ) {
    if (segments.length !== 7) return null
    const [, , tenantId, farmId, barnId, deviceId, eventType] = segments
    if (!tenantId || !farmId || !barnId || !deviceId || !eventType) return null
    return { kind: 'event', tenantId, farmId, barnId, deviceId, eventType }
  }

  if (
    segments.length >= 2 &&
    segments[0] === 'iot' &&
    segments[1] === 'weighvision'
  ) {
    if (segments.length !== 9) return null
    const [
      ,
      ,
      tenantId,
      farmId,
      barnId,
      stationId,
      sessionLiteral,
      sessionId,
      eventType,
    ] = segments
    if (sessionLiteral !== 'session') return null
    if (
      !tenantId ||
      !farmId ||
      !barnId ||
      !stationId ||
      !sessionId ||
      !eventType
    )
      return null
    return {
      kind: 'weighvision',
      tenantId,
      farmId,
      barnId,
      stationId,
      sessionId,
      eventType,
    }
  }

  if (
    segments.length >= 2 &&
    segments[0] === 'iot' &&
    segments[1] === 'status'
  ) {
    if (segments.length !== 6) return null
    const [, , tenantId, farmId, barnId, deviceId] = segments
    if (!tenantId || !farmId || !barnId || !deviceId) return null
    return { kind: 'status', tenantId, farmId, barnId, deviceId }
  }

  return null
}
