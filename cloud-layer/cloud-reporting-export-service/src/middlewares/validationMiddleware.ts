import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

export const reportJobCreateSchema = z
  .object({
    tenant_id: z.string().uuid().optional(),
    job_type: z.enum([
      'FEED_INTAKE_EXPORT',
      'KPI_FEEDING_EXPORT',
      'TELEMETRY_EXPORT',
      'WEIGHVISION_EXPORT',
    ]),
    format: z.enum(['csv', 'json']),
    farm_id: z.string().uuid().optional().nullable(),
    barn_id: z.string().uuid().optional().nullable(),
    batch_id: z.string().uuid().optional().nullable(),
    start_date: z.string().regex(dateOnlyRegex).optional().nullable(),
    end_date: z.string().regex(dateOnlyRegex).optional().nullable(),
    filters: z.record(z.unknown()).optional().nullable(),
    idempotency_key: z.string().min(1).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && isNaN(Date.parse(`${data.start_date}T00:00:00Z`))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['start_date'],
        message: 'Invalid start_date',
      })
    }

    if (data.end_date && isNaN(Date.parse(`${data.end_date}T00:00:00Z`))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'Invalid end_date',
      })
    }

    if (data.start_date && data.end_date) {
      const start = Date.parse(`${data.start_date}T00:00:00Z`)
      const end = Date.parse(`${data.end_date}T00:00:00Z`)
      if (!isNaN(start) && !isNaN(end) && start > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['end_date'],
          message: 'end_date must be on or after start_date',
        })
      }
    }
  })

/**
 * Generic validation middleware factory
 */
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
            message: error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', '),
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

export const validateReportJobCreate = validateBody(reportJobCreateSchema)
