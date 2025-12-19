import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// Validation schemas
export const tenantSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
})

export const farmSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const barnSchema = z.object({
  name: z.string().min(1),
  animalType: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const batchSchema = z.object({
  species: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

export const deviceSchema = z.object({
  deviceType: z.string().min(1),
  serialNo: z.string().optional(),
  farmId: z.string().uuid().optional(),
  barnId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const stationSchema = z.object({
  name: z.string().min(1),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  stationType: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
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
            message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
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

// Specific middleware exports
export const validateTenant = validateBody(tenantSchema)
export const validateFarm = validateBody(farmSchema)
export const validateBarn = validateBody(barnSchema)
export const validateBatch = validateBody(batchSchema)
export const validateDevice = validateBody(deviceSchema)
export const validateStation = validateBody(stationSchema)
