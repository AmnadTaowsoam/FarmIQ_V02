import { z } from 'zod'
import { MQTT_EVENT_TYPES } from './eventTypes'

export const MqttEventTypeSchema = z.enum(MQTT_EVENT_TYPES)

// SSOT: docs/iot-layer/03-mqtt-topic-map.md
export const MqttEnvelopeSchemaStrict = z
  .object({
    schema_version: z.literal('1.0'),
    event_id: z.string().min(1),
    trace_id: z.string().min(1),
    tenant_id: z.string().min(1),
    device_id: z.string().min(1),
    event_type: MqttEventTypeSchema,
    ts: z.string().min(1),
    payload: z.unknown(),
    content_hash: z.string().optional(),
    retry_count: z.number().int().nonnegative().optional(),
    produced_at: z.string().optional(),
  })
  .passthrough()

// Ingress-facing schema: allows missing trace_id and legacy alias `occurred_at`.
export const MqttEnvelopeSchemaIngest = z
  .object({
    schema_version: z.literal('1.0'),
    event_id: z.string().min(1),
    trace_id: z.string().min(1).optional(),
    tenant_id: z.string().min(1),
    device_id: z.string().min(1),
    event_type: z.string().min(1),
    ts: z.string().min(1).optional(),
    occurred_at: z.string().min(1).optional(),
    payload: z.unknown(),
    content_hash: z.string().optional(),
    retry_count: z.number().int().nonnegative().optional(),
    produced_at: z.string().optional(),
  })
  .passthrough()

export type MqttEnvelopeStrict = z.infer<typeof MqttEnvelopeSchemaStrict>
export type MqttEnvelopeIngest = z.infer<typeof MqttEnvelopeSchemaIngest>

