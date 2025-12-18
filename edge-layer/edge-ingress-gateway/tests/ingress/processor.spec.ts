import { processIngressMessage } from '../../src/ingress/processor'
import { InMemoryDedupeStore } from '../../src/db/dedupeStore'
import { DeviceAllowlistStore, StationAllowlistStore } from '../../src/db/allowlistStore'
import { LastSeenStore } from '../../src/db/lastSeenStore'
import { ParsedTopic } from '../../src/ingress/topic'

describe('processIngressMessage', () => {
  const allowlistedDevice: DeviceAllowlistStore = {
    getDevice: async () => ({
      tenant_id: 't-1',
      device_id: 'd-1',
      farm_id: 'f-1',
      barn_id: 'b-1',
      enabled: true,
      notes: null,
    }),
  }
  const allowlistedStation: StationAllowlistStore = {
    getStation: async () => ({
      tenant_id: 't-1',
      station_id: 'st-1',
      farm_id: 'f-1',
      barn_id: 'b-1',
      enabled: true,
      notes: null,
    }),
  }
  const noopLastSeen: LastSeenStore = { upsertLastSeen: async () => {} }

  beforeEach(() => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    })
  })

  it('drops invalid JSON envelope', async () => {
    const topic: ParsedTopic = {
      kind: 'telemetry',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      deviceId: 'd-1',
      metric: 'temperature',
    }

    const decision = await processIngressMessage({
      topic,
      rawTopic: 'iot/telemetry/t-1/f-1/b-1/d-1/temperature',
      message: Buffer.from('{not-json'),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://t', weighvisionBaseUrl: 'http://w', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('routes telemetry to edge-telemetry-timeseries', async () => {
    const topic: ParsedTopic = {
      kind: 'telemetry',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      deviceId: 'd-1',
      metric: 'temperature',
    }

    const decision = await processIngressMessage({
      topic,
      rawTopic: 'iot/telemetry/t-1/f-1/b-1/d-1/temperature',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-1',
          trace_id: 'trace-1',
          tenant_id: 't-1',
          device_id: 'd-1',
          event_type: 'telemetry.reading',
          ts: '2025-01-01T00:00:00Z',
          payload: { value: 1, unit: 'C' },
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://w', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('processed')
    if (decision.action === 'processed') {
      expect(decision.routedTo).toBe('edge-telemetry-timeseries')
    }
    expect((global as any).fetch).toHaveBeenCalled()
  })

  it('drops duplicates via dedupe store', async () => {
    const topic: ParsedTopic = {
      kind: 'telemetry',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      deviceId: 'd-1',
      metric: 'temperature',
    }

    const dedupe = new InMemoryDedupeStore()
    const msg = Buffer.from(
      JSON.stringify({
        schema_version: '1.0',
        event_id: 'e-dup',
        trace_id: 'trace-dup',
        tenant_id: 't-1',
        device_id: 'd-1',
        event_type: 'telemetry.reading',
        ts: '2025-01-01T00:00:00Z',
        payload: { value: 1 },
      })
    )

    await processIngressMessage({
      topic,
      rawTopic: 'iot/telemetry/t-1/f-1/b-1/d-1/temperature',
      message: msg,
      deps: {
        dedupe,
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://w', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    const decision2 = await processIngressMessage({
      topic,
      rawTopic: 'iot/telemetry/t-1/f-1/b-1/d-1/temperature',
      message: msg,
      deps: {
        dedupe,
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://w', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision2.action).toBe('dropped')
    if (decision2.action === 'dropped') {
      expect(decision2.reason).toContain('dedupe')
    }
  })

  it('updates last_seen on status topic', async () => {
    const upsertLastSeen = jest.fn().mockResolvedValue(undefined)
    const topic: ParsedTopic = {
      kind: 'status',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      deviceId: 'd-1',
    }

    const decision = await processIngressMessage({
      topic,
      rawTopic: 'iot/status/t-1/f-1/b-1/d-1',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-s',
          trace_id: 'trace-s',
          tenant_id: 't-1',
          device_id: 'd-1',
          event_type: 'device.status',
          ts: '2025-01-01T00:00:00Z',
          payload: { last_seen_at: '2025-01-01T00:00:00Z' },
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: { upsertLastSeen },
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://w', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('processed')
    expect(upsertLastSeen).toHaveBeenCalled()
  })

  it('drops event topic when event_type mismatches topic', async () => {
    const topic: ParsedTopic = {
      kind: 'event',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      deviceId: 'd-1',
      eventType: 'sensor.heartbeat',
    }

    const decision = await processIngressMessage({
      topic,
      rawTopic: 'iot/event/t-1/f-1/b-1/d-1/sensor.heartbeat',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-evt',
          trace_id: 'trace-evt',
          tenant_id: 't-1',
          device_id: 'd-1',
          event_type: 'sensor.wrong',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://w', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })
})
