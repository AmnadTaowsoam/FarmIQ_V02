import { InMemoryDedupeStore } from '../../src/db/dedupeStore'
import { DeviceAllowlistStore, StationAllowlistStore } from '../../src/db/allowlistStore'
import { LastSeenStore } from '../../src/db/lastSeenStore'
import { processIngressMessage } from '../../src/ingress/processor'
import { ParsedTopic } from '../../src/ingress/topic'

describe('processIngressMessage (weighvision)', () => {
  const allowlistedDevice: DeviceAllowlistStore = {
    getDevice: async () => ({
      tenant_id: 't-1',
      device_id: 'wv-1',
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

  it('routes weighvision.session.created to edge-weighvision-session', async () => {
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
          payload: { batch_id: 'b' },
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('processed')
    if (decision.action === 'processed') {
      expect(decision.routedTo).toBe('edge-weighvision-session')
    }
    expect((global as any).fetch).toHaveBeenCalled()
  })

  it('routes weighvision.weight.recorded, image.captured, session.finalized', async () => {
    const dedupe = new InMemoryDedupeStore()
    const makeTopic = (eventType: string): ParsedTopic => ({
      kind: 'weighvision',
      tenantId: 't-1',
      farmId: 'f-1',
      barnId: 'b-1',
      stationId: 'st-1',
      sessionId: 's-1',
      eventType,
    })

    const makeMessage = (event_type: string, event_id: string) =>
      Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id,
          trace_id: `trace-${event_id}`,
          tenant_id: 't-1',
          device_id: 'wv-1',
          event_type,
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      )

    const deps = {
      dedupe,
      deviceAllowlist: allowlistedDevice,
      stationAllowlist: allowlistedStation,
      lastSeen: noopLastSeen,
      downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
      dedupeTtlMs: 60_000,
    }

    const d1 = await processIngressMessage({
      topic: makeTopic('weighvision.weight.recorded'),
      rawTopic: 'iot/weighvision/t-1/f-1/b-1/st-1/session/s-1/weighvision.weight.recorded',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-2',
          trace_id: 'trace-e-2',
          tenant_id: 't-1',
          device_id: 'wv-1',
          event_type: 'weighvision.weight.recorded',
          ts: '2025-01-01T00:00:00Z',
          payload: { weightKg: 120.5 },
        })
      ),
      deps,
    })
    expect(d1.action).toBe('processed')

    const d2 = await processIngressMessage({
      topic: makeTopic('weighvision.image.captured'),
      rawTopic: 'iot/weighvision/t-1/f-1/b-1/st-1/session/s-1/weighvision.image.captured',
      message: Buffer.from(
        JSON.stringify({
          schema_version: '1.0',
          event_id: 'e-3',
          trace_id: 'trace-e-3',
          tenant_id: 't-1',
          device_id: 'wv-1',
          event_type: 'weighvision.image.captured',
          ts: '2025-01-01T00:00:00Z',
          payload: { mediaObjectId: 'm-1' },
        })
      ),
      deps,
    })
    expect(d2.action).toBe('processed')

    const d3 = await processIngressMessage({
      topic: makeTopic('weighvision.session.finalized'),
      rawTopic: 'iot/weighvision/t-1/f-1/b-1/st-1/session/s-1/weighvision.session.finalized',
      message: makeMessage('weighvision.session.finalized', 'e-4'),
      deps,
    })
    expect(d3.action).toBe('processed')
  })

  it('drops when event_type does not match topic eventType', async () => {
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
          event_type: 'weighvision.session.finalized',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: allowlistedStation,
        lastSeen: noopLastSeen,
        downstream: { telemetryBaseUrl: 'http://telemetry', weighvisionBaseUrl: 'http://weigh', timeoutMs: 50 },
        dedupeTtlMs: 60_000,
      },
    })

    expect(decision.action).toBe('dropped')
  })

  it('drops when station is not allowlisted for farm/barn', async () => {
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
          event_id: 'e-x',
          trace_id: 'trace-x',
          tenant_id: 't-1',
          device_id: 'wv-1',
          event_type: 'weighvision.session.created',
          ts: '2025-01-01T00:00:00Z',
          payload: {},
        })
      ),
      deps: {
        dedupe: new InMemoryDedupeStore(),
        deviceAllowlist: allowlistedDevice,
        stationAllowlist: {
          getStation: async () => ({
            tenant_id: 't-1',
            station_id: 'st-1',
            farm_id: 'different',
            barn_id: 'b-1',
            enabled: true,
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
})
