import { parseTopic } from '../../src/ingress/topic'

describe('parseTopic', () => {
  it('parses telemetry topic', () => {
    expect(parseTopic('iot/telemetry/t/f/b/d/temperature')).toEqual({
      kind: 'telemetry',
      tenantId: 't',
      farmId: 'f',
      barnId: 'b',
      deviceId: 'd',
      metric: 'temperature',
    })
  })

  it('parses weighvision topic', () => {
    expect(parseTopic('iot/weighvision/t/f/b/st-01/session/s-1/weighvision.session.created')).toEqual({
      kind: 'weighvision',
      tenantId: 't',
      farmId: 'f',
      barnId: 'b',
      stationId: 'st-01',
      sessionId: 's-1',
      eventType: 'weighvision.session.created',
    })
  })

  it('parses generic event topic', () => {
    expect(parseTopic('iot/event/t/f/b/d/sensor.heartbeat')).toEqual({
      kind: 'event',
      tenantId: 't',
      farmId: 'f',
      barnId: 'b',
      deviceId: 'd',
      eventType: 'sensor.heartbeat',
    })
  })

  it('parses status topic', () => {
    expect(parseTopic('iot/status/t/f/b/d')).toEqual({
      kind: 'status',
      tenantId: 't',
      farmId: 'f',
      barnId: 'b',
      deviceId: 'd',
    })
  })

  it('rejects invalid topic', () => {
    expect(parseTopic('iot/telemetry/t/f/b/d')).toBeNull()
  })
})
