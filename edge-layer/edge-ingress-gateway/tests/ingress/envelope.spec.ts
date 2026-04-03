import { parseEnvelopeFromBuffer } from '../../src/ingress/envelope'

describe('parseEnvelopeFromBuffer', () => {
  it('rejects non-JSON payloads', () => {
    const result = parseEnvelopeFromBuffer(Buffer.from('not-json'))
    expect(result.ok).toBe(false)
  })

  it('accepts required fields and generates trace_id when missing', () => {
    const msg = Buffer.from(
      JSON.stringify({
        schema_version: '1.0',
        event_id: 'e-1',
        tenant_id: 'tenant-1',
        device_id: 'device-1',
        event_type: 'telemetry.reading',
        ts: '2025-01-01T00:00:00Z',
        payload: { value: 1 },
      })
    )

    const result = parseEnvelopeFromBuffer(msg)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.envelope.event_id).toBe('e-1')
      expect(result.envelope.trace_id).toBeTruthy()
      expect(result.envelope.ts).toBe('2025-01-01T00:00:00Z')
      expect(result.tsFromAlias).toBe(false)
      expect(result.tsNormalizedFromProducedAt).toBe(false)
      expect(result.tsNormalizedFromServerTime).toBe(false)
    }
  })

  it('accepts occurred_at as a legacy alias for ts', () => {
    const msg = Buffer.from(
      JSON.stringify({
        schema_version: '1.0',
        event_id: 'e-1',
        tenant_id: 'tenant-1',
        device_id: 'device-1',
        event_type: 'telemetry.reading',
        occurred_at: '2025-01-01T00:00:00Z',
        payload: { value: 1 },
      })
    )

    const result = parseEnvelopeFromBuffer(msg)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.envelope.ts).toBe('2025-01-01T00:00:00Z')
      expect(result.tsFromAlias).toBe(true)
      expect(result.tsNormalizedFromProducedAt).toBe(false)
      expect(result.tsNormalizedFromServerTime).toBe(false)
    }
  })

  it('uses produced_at when ts is too old', () => {
    const msg = Buffer.from(
      JSON.stringify({
        schema_version: '1.0',
        event_id: 'e-2',
        tenant_id: 'tenant-1',
        device_id: 'device-1',
        event_type: 'telemetry.reading',
        ts: '1970-01-01T00:00:00Z',
        produced_at: '2026-04-02T09:31:43Z',
        payload: { value: 1 },
      })
    )

    const result = parseEnvelopeFromBuffer(msg)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.envelope.ts).toBe('2026-04-02T09:31:43Z')
      expect(result.tsNormalizedFromProducedAt).toBe(true)
      expect(result.tsNormalizedFromServerTime).toBe(false)
    }
  })

  it('uses server receive time when ts is too old and produced_at is absent', () => {
    const msg = Buffer.from(
      JSON.stringify({
        schema_version: '1.0',
        event_id: 'e-3',
        tenant_id: 'tenant-1',
        device_id: 'device-1',
        event_type: 'telemetry.reading',
        ts: '1970-01-01T00:00:00Z',
        payload: { value: 1 },
      })
    )

    const result = parseEnvelopeFromBuffer(msg)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.envelope.ts).not.toBe('1970-01-01T00:00:00Z')
      expect(result.tsNormalizedFromProducedAt).toBe(false)
      expect(result.tsNormalizedFromServerTime).toBe(true)
    }
  })

  it('rejects unsupported schema_version', () => {
    const msg = Buffer.from(
      JSON.stringify({
        schema_version: '2.0',
        event_id: 'e-1',
        tenant_id: 'tenant-1',
        device_id: 'device-1',
        event_type: 'telemetry.reading',
        ts: '2025-01-01T00:00:00Z',
        payload: { value: 1 },
      })
    )

    const result = parseEnvelopeFromBuffer(msg)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('schema_version')
    }
  })
})
