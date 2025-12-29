export const MQTT_EVENT_TYPES = [
  'telemetry.reading',
  'sensor.heartbeat',
  'device.status',
  'weighvision.session.created',
  'weighvision.weight.recorded',
  'weighvision.image.captured',
  'weighvision.inference.completed',
  'weighvision.session.finalized',
] as const

export type MqttEventType = (typeof MQTT_EVENT_TYPES)[number]

export const OUTBOX_EVENT_TYPES = [
  'telemetry.ingested',
  'telemetry.aggregated',
  'media.stored',
  'inference.completed',
  'weighvision.session.created',
  'weighvision.session.finalized',
  'feed.intake.recorded',
  'sync.batch.sent',
  'sync.batch.acked',
] as const

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number]

export type EdgeEventType = MqttEventType | OutboxEventType

