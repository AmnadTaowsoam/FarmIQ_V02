import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// Feed formula validation schema
export const feedFormulaSchema = z.object({
  tenantId: z.string().uuid().optional(),
  name: z.string().min(1),
  species: z.enum(['broiler', 'layer', 'swine', 'fish']).optional().nullable(),
  phase: z.string().optional().nullable(),
  energyKcalPerKg: z.number().min(0).optional().nullable(),
  proteinPct: z.number().min(0).max(100).optional().nullable(),
  fiberPct: z.number().min(0).max(100).optional().nullable(),
  fatPct: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  externalRef: z.string().optional().nullable(),
})

// Feed lot validation schema
export const feedLotSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  supplierName: z.string().optional().nullable(),
  lotCode: z.string().min(1),
  feedFormulaId: z.string().uuid().optional().nullable(),
  manufactureDate: z.string().date().optional().nullable(),
  receivedDate: z.string().date().optional().nullable(),
  quantityKg: z.number().min(0).optional().nullable(),
  remainingKg: z.number().min(0).optional().nullable(),
  status: z.enum(['active', 'archived']).optional(),
  externalRef: z.string().optional().nullable(),
})

// Feed delivery validation schema
export const feedDeliverySchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid().optional().nullable(),
  feedLotId: z.string().uuid(),
  deliveryRef: z.string().optional().nullable(),
  deliveredAt: z.string().datetime(),
  quantityKg: z.number().min(0),
  unitCost: z.number().min(0).optional().nullable(),
  currency: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Feed quality result validation schema
export const feedQualityResultSchema = z.object({
  tenantId: z.string().uuid().optional(),
  feedLotId: z.string().uuid(),
  sampledAt: z.string().datetime(),
  metric: z.string().min(1),
  value: z.number().min(0),
  unit: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  status: z.enum(['valid', 'rejected']).optional(),
  externalRef: z.string().optional().nullable(),
})

// Feed intake record validation schema
export const feedIntakeRecordSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  deviceId: z.string().uuid().optional().nullable(),
  source: z.enum(['MANUAL', 'API_IMPORT', 'SILO_AUTO']),
  feedFormulaId: z.string().uuid().optional().nullable(),
  feedLotId: z.string().uuid().optional().nullable(),
  quantityKg: z.number().min(0),
  occurredAt: z.string().datetime(),
  ingestedAt: z.string().datetime().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  externalRef: z.string().optional().nullable(),
  sequence: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// Feed program validation schema (optional)
export const feedProgramSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional().nullable(),
  barnId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  status: z.enum(['active', 'inactive']).optional(),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Feed inventory snapshot validation schema (optional)
export const feedInventorySnapshotSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional().nullable(),
  barnId: z.string().uuid().optional().nullable(),
  feedLotId: z.string().uuid().optional().nullable(),
  snapshotAt: z.string().datetime(),
  quantityKg: z.number().min(0),
  source: z.enum(['MANUAL', 'SENSOR']),
  externalRef: z.string().optional().nullable(),
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
export const validateFeedFormula = validateBody(feedFormulaSchema)
export const validateFeedLot = validateBody(feedLotSchema)
export const validateFeedDelivery = validateBody(feedDeliverySchema)
export const validateFeedQualityResult = validateBody(feedQualityResultSchema)
export const validateFeedIntakeRecord = validateBody(feedIntakeRecordSchema)
export const validateFeedProgram = validateBody(feedProgramSchema)
export const validateFeedInventorySnapshot = validateBody(feedInventorySnapshotSchema)

