import { Request, Response } from 'express'
import {
  listNotificationHistoryHandler,
  listNotificationInboxHandler,
  sendNotificationHandler,
} from '../../src/controllers/notificationController'
import { notificationProxyServiceClient } from '../../src/services/notificationProxyService'

jest.mock('../../src/services/notificationProxyService', () => ({
  notificationProxyServiceClient: {
    getInbox: jest.fn(),
    getHistory: jest.fn(),
    send: jest.fn(),
  },
}))

describe('NotificationController (BFF /api/v1/notifications)', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: { 'x-trace-id': 'trace-xyz' } as any,
    }
    ;(mockReq as any).id = 'req-123'

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {
        tenantId: 'tenant-abc',
        roles: ['tenant_admin'],
        traceId: 'trace-xyz',
      },
    }

    ;(notificationProxyServiceClient.getInbox as jest.Mock).mockReset()
    ;(notificationProxyServiceClient.getHistory as jest.Mock).mockReset()
    ;(notificationProxyServiceClient.send as jest.Mock).mockReset()
  })

  it('GET inbox returns 400 when tenantId missing', async () => {
    mockRes.locals!.tenantId = undefined
    mockReq.query = {}

    await listNotificationInboxHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: 'trace-xyz' },
    })
  })

  it('GET inbox normalizes cursor list response', async () => {
    mockReq.query = { tenantId: 'tenant-abc', limit: '10' }
    ;(notificationProxyServiceClient.getInbox as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [{ id: 'n1' }], nextCursor: 'c1' },
    })

    await listNotificationInboxHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({
      data: [{ id: 'n1' }],
      meta: { cursor: 'c1', limit: 10, hasNext: true },
    })
  })

  it('GET history normalizes cursor list response', async () => {
    mockReq.query = { tenantId: 'tenant-abc' }
    ;(notificationProxyServiceClient.getHistory as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [], nextCursor: null },
    })

    await listNotificationHistoryHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({
      data: [],
      meta: { cursor: null, limit: 25, hasNext: false },
    })
  })

  it('POST send passes through downstream 409', async () => {
    mockReq.query = { tenantId: 'tenant-abc' }
    mockReq.body = { tenantId: 'tenant-abc', severity: 'info', channel: 'in_app', title: 't', message: 'm' }
    ;(notificationProxyServiceClient.send as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      data: { error: { code: 'CONFLICT', message: 'duplicate' } },
    })

    await sendNotificationHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(409)
    expect(mockRes.json).toHaveBeenCalledWith({ error: { code: 'CONFLICT', message: 'duplicate' } })
  })

  it('GET inbox maps downstream 5xx to 502 envelope', async () => {
    mockReq.query = { tenantId: 'tenant-abc' }
    ;(notificationProxyServiceClient.getInbox as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      data: { error: { code: 'INTERNAL_ERROR' } },
    })

    await listNotificationInboxHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(502)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to fetch notification inbox',
        traceId: 'trace-xyz',
      },
    })
  })
})

