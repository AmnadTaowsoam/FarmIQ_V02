import { Request, Response } from 'express'
import {
  getDashboardNotificationsInboxHandler,
  getDashboardNotificationsHistoryHandler,
  postDashboardNotificationsSendHandler,
} from '../../src/controllers/dashboardNotificationsController'
import { dashboardNotificationServiceClient } from '../../src/services/dashboardNotificationService'

jest.mock('../../src/services/dashboardNotificationService', () => ({
  dashboardNotificationServiceClient: {
    getInbox: jest.fn(),
    getHistory: jest.fn(),
    send: jest.fn(),
  },
}))

describe('DashboardNotificationsController', () => {
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

    ;(dashboardNotificationServiceClient.getInbox as jest.Mock).mockReset()
    ;(dashboardNotificationServiceClient.getHistory as jest.Mock).mockReset()
    ;(dashboardNotificationServiceClient.send as jest.Mock).mockReset()
  })

  it('GET inbox returns 400 when tenantId missing', async () => {
    mockRes.locals!.tenantId = undefined
    mockReq.query = {}

    await getDashboardNotificationsInboxHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: 'trace-xyz' },
    })
  })

  it('GET inbox passes through 200 response', async () => {
    mockReq.query = { topic: 'alerts', limit: '25' }
    ;(dashboardNotificationServiceClient.getInbox as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [], nextCursor: null },
    })

    await getDashboardNotificationsInboxHandler(mockReq as Request, mockRes as Response)

    expect(dashboardNotificationServiceClient.getInbox).toHaveBeenCalledWith({
      headers: expect.objectContaining({
        'x-tenant-id': 'tenant-abc',
        'x-request-id': 'req-123',
        'x-trace-id': 'trace-xyz',
      }),
      query: expect.objectContaining({ topic: 'alerts', limit: '25' }),
    })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({
      data: [],
      meta: { cursor: null, limit: 25, hasNext: false },
    })
  })

  it('GET history passes through downstream 401 + body', async () => {
    mockReq.query = { tenantId: 'tenant-abc' }
    ;(dashboardNotificationServiceClient.getHistory as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      data: { error: { code: 'UNAUTHORIZED', message: 'bad token' } },
    })

    await getDashboardNotificationsHistoryHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'bad token' } })
  })

  it('POST send forwards idempotency-key and returns 201', async () => {
    mockReq.headers = {
      'idempotency-key': 'idem-1',
      authorization: 'Bearer test',
      'x-trace-id': 'trace-xyz',
    } as any
    mockReq.body = { severity: 'info', channel: 'in_app', title: 't', message: 'm' }
    ;(dashboardNotificationServiceClient.send as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      data: { notificationId: 'n1', status: 'sent', createdAt: '2025-01-01T00:00:00Z' },
    })

    await postDashboardNotificationsSendHandler(mockReq as Request, mockRes as Response)

    expect(dashboardNotificationServiceClient.send).toHaveBeenCalledWith({
      headers: expect.objectContaining({
        authorization: 'Bearer test',
        'idempotency-key': 'idem-1',
      }),
      body: mockReq.body,
    })
    expect(mockRes.status).toHaveBeenCalledWith(201)
  })

  it('POST send returns 502 on downstream 5xx', async () => {
    mockReq.body = { tenantId: 'tenant-abc', severity: 'info', channel: 'in_app', title: 't', message: 'm' }
    ;(dashboardNotificationServiceClient.send as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      data: { error: { code: 'INTERNAL_ERROR' } },
    })

    await postDashboardNotificationsSendHandler(mockReq as Request, mockRes as Response)

    expect(mockRes.status).toHaveBeenCalledWith(502)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to send notification',
        traceId: 'trace-xyz',
      },
    })
  })
})
