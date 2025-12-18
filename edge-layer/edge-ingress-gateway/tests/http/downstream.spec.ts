import { buildDownstreamConfig, postJson } from '../../src/http/downstream'

describe('postJson', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  it('returns ok on 2xx', async () => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    })

    const result = await postJson({
      url: 'http://example',
      body: { a: 1 },
      requestId: 'r',
      traceId: 't',
      timeoutMs: 1000,
    })

    expect(result.ok).toBe(true)
  })

  it('returns non-ok on non-2xx', async () => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    })

    const result = await postJson({
      url: 'http://example',
      body: { a: 1 },
      requestId: 'r',
      traceId: 't',
      timeoutMs: 1000,
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
  })

  it('returns non-ok on fetch error', async () => {
    ;(global as any).fetch = jest.fn().mockRejectedValue(new Error('network'))

    const result = await postJson({
      url: 'http://example',
      body: { a: 1 },
      requestId: 'r',
      traceId: 't',
      timeoutMs: 1000,
    })

    expect(result.ok).toBe(false)
  })
})

describe('buildDownstreamConfig', () => {
  it('uses defaults when env not set', () => {
    const prevTelemetry = process.env.EDGE_TELEMETRY_TIMESERIES_URL
    const prevWeigh = process.env.EDGE_WEIGHVISION_SESSION_URL
    const prevTimeout = process.env.DOWNSTREAM_TIMEOUT_MS
    delete process.env.EDGE_TELEMETRY_TIMESERIES_URL
    delete process.env.EDGE_WEIGHVISION_SESSION_URL
    delete process.env.DOWNSTREAM_TIMEOUT_MS

    const cfg = buildDownstreamConfig()
    expect(cfg.telemetryBaseUrl).toContain('edge-telemetry-timeseries')
    expect(cfg.weighvisionBaseUrl).toContain('edge-weighvision-session')
    expect(cfg.timeoutMs).toBe(5000)

    process.env.EDGE_TELEMETRY_TIMESERIES_URL = prevTelemetry
    process.env.EDGE_WEIGHVISION_SESSION_URL = prevWeigh
    process.env.DOWNSTREAM_TIMEOUT_MS = prevTimeout
  })
})
