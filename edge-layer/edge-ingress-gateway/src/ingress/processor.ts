import { DedupeStore } from '../db/dedupeStore'
import {
  DeviceAllowlistStore,
  StationAllowlistStore,
} from '../db/allowlistStore'
import { LastSeenStore } from '../db/lastSeenStore'
import { postJson } from '../http/downstream'
import { logger } from '../utils/logger'
import { parseEnvelopeFromBuffer } from './envelope'
import { ParsedTopic } from './topic'
import { sha256Hex } from '../utils/hash'

export type IngressProcessorDeps = {
  dedupe: DedupeStore
  deviceAllowlist: DeviceAllowlistStore
  stationAllowlist: StationAllowlistStore
  lastSeen: LastSeenStore
  downstream: {
    telemetryBaseUrl: string
    weighvisionBaseUrl: string
    timeoutMs: number
  }
  dedupeTtlMs: number
}

export type IngressDecision =
  | { action: 'dropped'; reason: string; eventId?: string; traceId?: string }
  | {
      action: 'processed'
      routedTo?: string
      eventId?: string
      traceId?: string
    }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

/**
 *
 * @param params
 * @param params.topic
 * @param params.rawTopic
 * @param params.message
 * @param params.deps
 */
export async function processIngressMessage(params: {
  topic: ParsedTopic
  rawTopic: string
  message: Buffer
  deps: IngressProcessorDeps
}): Promise<IngressDecision> {
  const parsed = parseEnvelopeFromBuffer(params.message)
  if (!parsed.ok) {
    return { action: 'dropped', reason: `invalid envelope: ${parsed.error}` }
  }

  const envelope = parsed.envelope
  const payloadHash = sha256Hex(params.message)
  const ids = { eventId: envelope.event_id, traceId: envelope.trace_id }

  if (parsed.traceGenerated) {
    logger.warn('trace_id missing; generated new trace_id', {
      ...ids,
      eventType: envelope.event_type,
    })
  }
  if (parsed.tsFromAlias) {
    logger.warn('ts missing; using occurred_at as ts (legacy alias)', {
      ...ids,
      eventType: envelope.event_type,
    })
  }

  // Topic/envelope consistency
  if (params.topic.tenantId !== envelope.tenant_id) {
    return {
      action: 'dropped',
      reason: 'tenant_id mismatch (topic vs envelope)',
      ...ids,
    }
  }
  // Topic carries routing context; enforce minimal consistency where possible (tenant/device/event_type).

  if (params.topic.kind === 'telemetry') {
    if (params.topic.deviceId !== envelope.device_id) {
      return {
        action: 'dropped',
        reason: 'device_id mismatch (topic vs envelope)',
        ...ids,
      }
    }
    if (envelope.event_type !== 'telemetry.reading') {
      return {
        action: 'dropped',
        reason: 'telemetry topic must use event_type telemetry.reading',
        ...ids,
      }
    }
    const payloadRecord = asRecord(envelope.payload)
    const metricInPayload =
      payloadRecord && typeof payloadRecord['metric'] === 'string'
        ? payloadRecord['metric']
        : null
    if (metricInPayload && metricInPayload !== params.topic.metric) {
      return {
        action: 'dropped',
        reason: 'payload.metric mismatch (topic vs payload)',
        ...ids,
      }
    }
  }

  if (params.topic.kind === 'event' || params.topic.kind === 'weighvision') {
    if (params.topic.eventType !== envelope.event_type) {
      return {
        action: 'dropped',
        reason: 'event_type mismatch (topic vs envelope)',
        ...ids,
      }
    }
  }

  if (params.topic.kind === 'event') {
    if (params.topic.deviceId !== envelope.device_id) {
      return {
        action: 'dropped',
        reason: 'device_id mismatch (topic vs envelope)',
        ...ids,
      }
    }
  }

  if (params.topic.kind === 'status') {
    if (params.topic.deviceId !== envelope.device_id) {
      return {
        action: 'dropped',
        reason: 'device_id mismatch (topic vs envelope)',
        ...ids,
      }
    }
  }

  // Allowlist enforcement
  if (params.topic.kind === 'weighvision') {
    const stationRow = await params.deps.stationAllowlist.getStation({
      tenantId: params.topic.tenantId,
      stationId: params.topic.stationId,
    })
    if (!stationRow || !stationRow.enabled) {
      return {
        action: 'dropped',
        reason: 'station not enabled in station_allowlist',
        ...ids,
      }
    }
    if (stationRow.farm_id && stationRow.farm_id !== params.topic.farmId) {
      return {
        action: 'dropped',
        reason: 'farm_id mismatch (topic vs station_allowlist)',
        ...ids,
      }
    }
    if (stationRow.barn_id && stationRow.barn_id !== params.topic.barnId) {
      return {
        action: 'dropped',
        reason: 'barn_id mismatch (topic vs station_allowlist)',
        ...ids,
      }
    }
  } else {
    const deviceRow = await params.deps.deviceAllowlist.getDevice({
      tenantId: params.topic.tenantId,
      deviceId: params.topic.deviceId,
    })
    if (!deviceRow || !deviceRow.enabled) {
      return {
        action: 'dropped',
        reason: 'device not enabled in device_allowlist',
        ...ids,
      }
    }
    if (deviceRow.farm_id && deviceRow.farm_id !== params.topic.farmId) {
      return {
        action: 'dropped',
        reason: 'farm_id mismatch (topic vs device_allowlist)',
        ...ids,
      }
    }
    if (deviceRow.barn_id && deviceRow.barn_id !== params.topic.barnId) {
      return {
        action: 'dropped',
        reason: 'barn_id mismatch (topic vs device_allowlist)',
        ...ids,
      }
    }
  }

  // Dedupe
  const isNew = await params.deps.dedupe.tryMarkSeen({
    tenantId: envelope.tenant_id,
    eventId: envelope.event_id,
    topic: params.rawTopic,
    payloadHash,
    ttlMs: params.deps.dedupeTtlMs,
  })
  if (!isNew) {
    return {
      action: 'dropped',
      reason: 'duplicate event_id (dedupe hit)',
      ...ids,
    }
  }

  const requestId = envelope.event_id
  const traceId = envelope.trace_id

  if (params.topic.kind === 'telemetry') {
    const url = `${params.deps.downstream.telemetryBaseUrl}/api/v1/telemetry/readings`
    const payloadRecord = asRecord(envelope.payload)
    const value = payloadRecord ? payloadRecord['value'] : null
    const unit = payloadRecord ? payloadRecord['unit'] : null
    if (typeof value !== 'number') {
      return {
        action: 'dropped',
        reason: 'payload.value must be a number for telemetry.reading',
        ...ids,
      }
    }
    const body = {
      events: [
        {
          schema_version: envelope.schema_version,
          event_id: envelope.event_id,
          trace_id: envelope.trace_id,
          tenant_id: envelope.tenant_id,
          device_id: envelope.device_id,
          event_type: envelope.event_type,
          ts: envelope.ts,
          farm_id: params.topic.farmId,
          barn_id: params.topic.barnId,
          payload: {
            metric: params.topic.metric,
            value,
            unit: typeof unit === 'string' ? unit : undefined,
          },
        },
      ],
    }
    const result = await postJson({
      url,
      body,
      requestId,
      traceId,
      timeoutMs: params.deps.downstream.timeoutMs,
    })
    if (!result.ok) {
      logger.warn('telemetry routing failed', {
        requestId,
        traceId,
        eventType: envelope.event_type,
        topicKind: params.topic.kind,
        downstreamUrl: url,
        status: result.status,
      })
      return {
        action: 'processed',
        routedTo: 'edge-telemetry-timeseries (failed)',
        ...ids,
      }
    }
    return {
      action: 'processed',
      routedTo: 'edge-telemetry-timeseries',
      ...ids,
    }
  }

  if (params.topic.kind === 'status') {
    await params.deps.lastSeen.upsertLastSeen({
      tenantId: envelope.tenant_id,
      deviceId: envelope.device_id,
      lastSeenAtIso: envelope.ts,
      topic: params.rawTopic,
      payloadHash,
    })
    return { action: 'processed', routedTo: 'device_last_seen', ...ids }
  }

  if (params.topic.kind === 'weighvision') {
    const topic = params.topic
    const base = params.deps.downstream.weighvisionBaseUrl
    const sessionId = topic.sessionId
    const payloadRecord = asRecord(envelope.payload)

    const urlForEventType = (
      eventType: string
    ): { url: string; body: unknown } | null => {
      if (!sessionId || typeof sessionId !== 'string') return null
      if (eventType === 'weighvision.session.created') {
        const batchId =
          payloadRecord && typeof payloadRecord['batchId'] === 'string'
            ? payloadRecord['batchId']
            : payloadRecord && typeof payloadRecord['batch_id'] === 'string'
              ? payloadRecord['batch_id']
              : undefined
        return {
          url: `${base}/api/v1/weighvision/sessions`,
          body: {
            sessionId,
            eventId: envelope.event_id,
            tenantId: envelope.tenant_id,
            farmId: topic.farmId,
            barnId: topic.barnId,
            deviceId: envelope.device_id,
            stationId: topic.stationId,
            batchId: typeof batchId === 'string' ? batchId : undefined,
            startAt: envelope.ts,
          },
        }
      }
      if (eventType === 'weighvision.weight.recorded') {
        const weightCandidate = payloadRecord
          ? (payloadRecord['weightKg'] ??
            payloadRecord['weight_kg'] ??
            payloadRecord['weight'] ??
            payloadRecord['value'])
          : null
        const weightKg =
          typeof weightCandidate === 'number' ? weightCandidate : null
        if (typeof weightKg !== 'number') return null
        return {
          url: `${base}/api/v1/weighvision/sessions/${encodeURIComponent(sessionId)}/bind-weight`,
          body: {
            tenantId: envelope.tenant_id,
            weightKg,
            occurredAt: envelope.ts,
            eventId: envelope.event_id,
          },
        }
      }
      if (
        eventType === 'weighvision.image.captured' ||
        eventType === 'media.bound' ||
        eventType === 'media.stored'
      ) {
        const mediaCandidate = payloadRecord
          ? (payloadRecord['mediaObjectId'] ??
            payloadRecord['media_object_id'] ??
            payloadRecord['mediaId'] ??
            payloadRecord['media_id'])
          : null
        const mediaObjectId =
          typeof mediaCandidate === 'string' ? mediaCandidate : null
        if (typeof mediaObjectId !== 'string' || !mediaObjectId) return null
        return {
          url: `${base}/api/v1/weighvision/sessions/${encodeURIComponent(sessionId)}/bind-media`,
          body: {
            tenantId: envelope.tenant_id,
            mediaObjectId,
            occurredAt: envelope.ts,
            eventId: envelope.event_id,
          },
        }
      }
      if (eventType === 'weighvision.session.finalized') {
        return {
          url: `${base}/api/v1/weighvision/sessions/${encodeURIComponent(sessionId)}/finalize`,
          body: {
            tenantId: envelope.tenant_id,
            eventId: envelope.event_id,
            occurredAt: envelope.ts,
          },
        }
      }
      return null
    }

    const route = urlForEventType(envelope.event_type)
    if (!route) {
      return {
        action: 'dropped',
        reason: `no routing rule for event_type ${envelope.event_type}`,
        ...ids,
      }
    }

    const result = await postJson({
      url: route.url,
      body: route.body,
      requestId,
      traceId,
      timeoutMs: params.deps.downstream.timeoutMs,
    })
    if (!result.ok) {
      return {
        action: 'processed',
        routedTo: 'edge-weighvision-session (failed)',
        ...ids,
      }
    }
    return { action: 'processed', routedTo: 'edge-weighvision-session', ...ids }
  }

  // Other event types are accepted/validated/deduped but not routed in MVP.
  return { action: 'processed', ...ids }
}
