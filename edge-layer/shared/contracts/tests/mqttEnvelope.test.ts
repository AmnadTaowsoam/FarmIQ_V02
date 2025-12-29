import { describe, expect, test } from '@jest/globals'
import { MqttEnvelopeSchemaIngest, MqttEnvelopeSchemaStrict } from '../src'

describe('MqttEnvelope schemas', () => {
  test('Ingest schema accepts missing trace_id (ingress will generate)', () => {
    const parsed = MqttEnvelopeSchemaIngest.safeParse({
      schema_version: '1.0',
      event_id: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
      tenant_id: 't-001',
      device_id: 'd-001',
      event_type: 'telemetry.reading',
      ts: '2025-12-17T01:00:00Z',
      payload: { value: 26.4, unit: 'C' },
    })
    expect(parsed.success).toBe(true)
  })

  test('Strict schema rejects missing trace_id', () => {
    const parsed = MqttEnvelopeSchemaStrict.safeParse({
      schema_version: '1.0',
      event_id: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
      tenant_id: 't-001',
      device_id: 'd-001',
      event_type: 'telemetry.reading',
      ts: '2025-12-17T01:00:00Z',
      payload: { value: 26.4, unit: 'C' },
    })
    expect(parsed.success).toBe(false)
  })

  test('Ingest schema accepts legacy occurred_at alias', () => {
    const parsed = MqttEnvelopeSchemaIngest.safeParse({
      schema_version: '1.0',
      event_id: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
      tenant_id: 't-001',
      device_id: 'd-001',
      event_type: 'telemetry.reading',
      occurred_at: '2025-12-17T01:00:00Z',
      payload: { value: 26.4, unit: 'C' },
    })
    expect(parsed.success).toBe(true)
  })
})

