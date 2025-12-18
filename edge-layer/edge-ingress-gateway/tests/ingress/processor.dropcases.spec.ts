import { InMemoryDedupeStore } from '../../src/db/dedupeStore'
import { DeviceAllowlistStore, StationAllowlistStore } from '../../src/db/allowlistStore'
import { LastSeenStore } from '../../src/db/lastSeenStore'
import { processIngressMessage } from '../../src/ingress/processor'
import { ParsedTopic } from '../../src/ingress/topic'

describe('processIngressMessage (drop cases)', () => {
  const okDeviceAllowlist: DeviceAllowlistStore = {
    getDevice: async () => ({
      tenant_id: 't-1',
      device_id: 'd-1',
      farm_id: 'f-1',
      barn_id: 'b-1',
      enabled: true,
      notes: null,
    }),
  }

  const okStationAllowlist: StationAllowlistStore = {
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

  it('processes telemetry even if trace_id missing (generated)', async () => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    })

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
          event_id: 'e-trace-missing',
          tenant_id: 't-1',
          device_id: 'd-1',
          event_type: 'telemetry.reading',
          ts: '2025-01-01T00:00:00Z',
          payload: { value: 1 },
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('processed')
  })

  it('drops when payload.metric mismatches topic metric', async () => {
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
          payload: { metric: 'humidity', value: 1 },
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('drops telemetry when device_id is missing', async () => {
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
          event_type: 'telemetry.reading',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('drops telemetry when event_type is not telemetry.reading', async () => {
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
          event_type: 'sensor.heartbeat',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('processes non-weighvision generic event without routing', async () => {
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
          event_id: 'e-ok',
          trace_id: 'trace-ok',
          tenant_id: 't-1',
          device_id: 'd-1',
          event_type: 'sensor.heartbeat',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('processed')
  })

  it('drops when device is not enabled in allowlist', async () => {
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
          event_id: 'e-1',
          trace_id: 'trace-1',
          tenant_id: 't-1',
          device_id: 'd-1',
          event_type: 'sensor.heartbeat',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: { getDevice: async () => null },
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('drops when station_allowlist disabled', async () => {
    const topic: ParsedTopic = {
      kind: 'weighvision',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      stationId: 'st-1',
      sessionId: 's-1',
      eventType: 'weighvision.session.created',
    }

    const decision = await processIngressMessage({
      topic,
      rawTopic: 'iot/weighvision/t-1/f-1/b-1/st-1/session/s-1/weighvision.session.created',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-1',
          trace_id: 'trace-1',
          tenant_id: 't-1',
          device_id: 'wv-1',
          event_type: 'weighvision.session.created',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: {
          getStation: async () => ({
            tenant_id: 't-1',
            station_id: 'st-1',
            farm_id: 'f-1',
            barn_id: 'b-1',
            enabled: false,
            notes: null,
          }),
        },
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('drops weighvision event with no routing rule', async () => {
    const topic: ParsedTopic = {
      kind: 'weighvision',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      stationId: 'st-1',
      sessionId: 's-1',
      eventType: 'weighvision.inference.completed',
    }

    const decision = await processIngressMessage({
      topic,
      rawTopic: 'iot/weighvision/t-1/f-1/b-1/st-1/session/s-1/weighvision.inference.completed',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-1',
          trace_id: 'trace-1',
          tenant_id: 't-1',
          device_id: 'wv-1',
          event_type: 'weighvision.inference.completed',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: okDeviceAllowlist,
        stationAllowlist: okStationAllowlist,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })
})
