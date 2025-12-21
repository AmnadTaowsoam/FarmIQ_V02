import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// Morbidity event validation schema
export const morbidityEventSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().datetime(),
  diseaseCode: z.string().optional().nullable(),
  severity: z.enum(['low', 'medium', 'high']).optional().nullable(),
  animalCount: z.number().int().min(0),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Mortality event validation schema
export const mortalityEventSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().datetime(),
  causeCode: z.string().optional().nullable(),
  animalCount: z.number().int().min(0),
  disposalMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Vaccine event validation schema
export const vaccineEventSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().datetime(),
  vaccineName: z.string().min(1),
  doseMl: z.number().min(0).optional().nullable(),
  route: z.string().optional().nullable(),
  administeredBy: z.string().optional().nullable(),
  animalCount: z.number().int().min(0),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Treatment event validation schema
export const treatmentEventSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().datetime(),
  treatmentName: z.string().min(1),
  doseMl: z.number().min(0).optional().nullable(),
  route: z.string().optional().nullable(),
  durationDays: z.number().int().min(0).optional().nullable(),
  animalCount: z.number().int().min(0),
  withdrawalDays: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Daily count validation schema
export const dailyCountSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  recordDate: z.string().date(),
  animalCount: z.number().int().min(0),
  averageWeightKg: z.number().min(0).optional().nullable(),
  mortalityCount: z.number().int().min(0).optional().nullable(),
  cullCount: z.number().int().min(0).optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Welfare check validation schema
export const welfareCheckSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().datetime(),
  gaitScore: z.number().int().min(0).max(5).optional().nullable(),
  lesionScore: z.number().int().min(0).max(5).optional().nullable(),
  behaviorScore: z.number().int().min(0).max(5).optional().nullable(),
  observer: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Housing condition validation schema
export const housingConditionSchema = z.object({
  tenantId: z.string().uuid().optional(),
  farmId: z.string().uuid(),
  barnId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  stockingDensity: z.number().min(0).optional().nullable(),
  beddingType: z.string().optional().nullable(),
  ventilationMode: z.string().optional().nullable(),
  temperatureC: z.number().optional().nullable(),
  humidityPct: z.number().min(0).max(100).optional().nullable(),
  ammoniaPpm: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

// Genetic profile validation schema
export const geneticProfileSchema = z.object({
  tenantId: z.string().uuid().optional(),
  batchId: z.string().uuid(),
  strain: z.string().optional().nullable(),
  breedLine: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  hatchDate: z.string().date().optional().nullable(),
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
export const validateMorbidityEvent = validateBody(morbidityEventSchema)
export const validateMortalityEvent = validateBody(mortalityEventSchema)
export const validateVaccineEvent = validateBody(vaccineEventSchema)
export const validateTreatmentEvent = validateBody(treatmentEventSchema)
export const validateDailyCount = validateBody(dailyCountSchema)
export const validateWelfareCheck = validateBody(welfareCheckSchema)
export const validateHousingCondition = validateBody(housingConditionSchema)
export const validateGeneticProfile = validateBody(geneticProfileSchema)

