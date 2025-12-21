import {
  notificationSendSchema,
  notificationHistoryQuerySchema,
} from '../../src/middlewares/validationMiddleware'

describe('Notification validation schemas', () => {
  it('should validate a valid notification send payload', () => {
    const valid = {
      severity: 'info',
      channel: 'in_app',
      title: 'System Alert',
      message: 'All systems go',
      targets: [{ type: 'user', value: 'user-123' }],
    }

    const result = notificationSendSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should reject invalid severity', () => {
    const invalid = {
      severity: 'urgent',
      channel: 'in_app',
      title: 'Alert',
      message: 'Invalid severity',
    }

    const result = notificationSendSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject invalid target type', () => {
    const invalid = {
      severity: 'info',
      channel: 'in_app',
      title: 'Alert',
      message: 'Invalid target',
      targets: [{ type: 'group', value: 'ops' }],
    }

    const result = notificationSendSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should validate notification history query', () => {
    const valid = {
      severity: 'warning',
      channel: 'email',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-02T00:00:00Z',
      limit: 25,
    }

    const result = notificationHistoryQuerySchema.safeParse(valid)
    expect(result.success).toBe(true)
  })
})
