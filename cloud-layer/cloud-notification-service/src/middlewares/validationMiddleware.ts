import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

const notificationTargetSchema = z.object({
  type: z.enum(['user', 'role', 'topic']),
  value: z.string().min(1),
})

export const notificationSendSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional().nullable(),
  barnId: z.string().uuid().optional().nullable(),
  batchId: z.string().uuid().optional().nullable(),
  severity: z.enum(['info', 'warning', 'critical']),
  channel: z.enum(['in_app', 'webhook', 'email', 'sms']),
  title: z.string().min(1),
  message: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  targets: z.array(notificationTargetSchema).optional(),
  externalRef: z.string().optional().nullable(),
  dedupeKey: z.string().optional().nullable(),
})

export const notificationHistoryQuerySchema = z.object({
  farmId: z.string().uuid().optional(),
  barnId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  channel: z.enum(['in_app', 'webhook', 'email', 'sms']).optional(),
  status: z.enum(['created', 'queued', 'sent', 'failed', 'canceled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const notificationInboxQuerySchema = z.object({
  topic: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
}

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error:', error.errors)
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: formatZodError(error),
            traceId: res.locals.traceId || 'unknown',
          },
        })
      } else {
        logger.error('Unexpected validation error:', error)
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Validation failed',
            traceId: res.locals.traceId || 'unknown',
          },
        })
      }
    }
  }
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error:', error.errors)
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: formatZodError(error),
            traceId: res.locals.traceId || 'unknown',
          },
        })
      } else {
        logger.error('Unexpected validation error:', error)
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Validation failed',
            traceId: res.locals.traceId || 'unknown',
          },
        })
      }
    }
  }
}

export const validateNotificationSend = validateBody(notificationSendSchema)
export const validateNotificationHistory = validateQuery(notificationHistoryQuerySchema)
export const validateNotificationInbox = validateQuery(notificationInboxQuerySchema)
