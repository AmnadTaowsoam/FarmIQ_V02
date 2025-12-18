import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

export const mqttEnvelopeSchema = z
  .object({
    schema_version: z.string().min(1),
    event_id: z.string().min(1),
    trace_id: z.string().min(1).optional(),
    tenant_id: z.string().min(1),
    device_id: z.string().min(1),
    event_type: z.string().min(1),
    ts: z.string().min(1).optional(),
    // Legacy alias (some docs/services used occurred_at; MQTT contract is `ts`)
    occurred_at: z.string().min(1).optional(),
    payload: z.unknown(),
    content_hash: z.string().optional(),
    retry_count: z.number().int().nonnegative().optional(),
    produced_at: z.string().optional(),
  })
  .passthrough()

export type MqttEnvelope = {
  schema_version: string
  event_id: string
  trace_id: string
  tenant_id: string
  device_id: string
  event_type: string
  ts: string
  payload: unknown
  content_hash?: string
  retry_count?: number
  produced_at?: string
}

export type ParsedEnvelopeResult =
  | {
      ok: true
      envelope: MqttEnvelope
      traceGenerated: boolean
      tsFromAlias: boolean
    }
  | { ok: false; error: string }

/**
 *
 * @param message
 */
export function parseEnvelopeFromBuffer(message: Buffer): ParsedEnvelopeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(message.toString('utf8'))
  } catch {
    return { ok: false, error: 'payload is not valid JSON' }
  }

  const result = mqttEnvelopeSchema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.map((i) => i.message).join('; '),
    }
  }

  const envelope = result.data
  if (envelope.schema_version !== '1.0') {
    return {
      ok: false,
      error: `unsupported schema_version: ${envelope.schema_version}`,
    }
  }

  const traceGenerated = !envelope.trace_id
  const trace_id = envelope.trace_id ?? uuidv4()

  const ts = envelope.ts ?? envelope.occurred_at
  if (!ts) {
    return { ok: false, error: 'missing ts' }
  }

  return {
    ok: true,
    envelope: {
      schema_version: envelope.schema_version,
      event_id: envelope.event_id,
      trace_id,
      tenant_id: envelope.tenant_id,
      device_id: envelope.device_id,
      event_type: envelope.event_type,
      ts,
      payload: envelope.payload,
      content_hash: envelope.content_hash,
      retry_count: envelope.retry_count,
      produced_at: envelope.produced_at,
    },
    traceGenerated,
    tsFromAlias: !envelope.ts && !!envelope.occurred_at,
  }
}
