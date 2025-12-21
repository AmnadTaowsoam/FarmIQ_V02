import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import * as barnRecordsService from '../services/barnRecordsService'

/**
 * POST /api/v1/barn-records/morbidity
 */
export async function createMorbidityEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateMorbidityEventInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      occurredAt: new Date(req.body.occurredAt),
      diseaseCode: req.body.diseaseCode,
      severity: req.body.severity,
      animalCount: parseInt(req.body.animalCount, 10),
      notes: req.body.notes,
      externalRef: req.body.externalRef || idempotencyKey,
      eventId: req.body.eventId,
      createdByUserId: res.locals.userId,
    }

    const event = await barnRecordsService.createMorbidityEvent(input, tenantId)

    // Note: Event publishing happens in service layer (non-blocking)

    res.status(201).json({
      id: event.id,
      animalCount: event.animalCount,
    })
  } catch (error) {
    logger.error('Error in createMorbidityEventHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Morbidity event with same external_ref or event_id already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create morbidity event',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/mortality
 */
export async function createMortalityEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateMortalityEventInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      occurredAt: new Date(req.body.occurredAt),
      causeCode: req.body.causeCode,
      animalCount: parseInt(req.body.animalCount, 10),
      disposalMethod: req.body.disposalMethod,
      notes: req.body.notes,
      externalRef: req.body.externalRef || idempotencyKey,
      eventId: req.body.eventId,
      createdByUserId: res.locals.userId,
    }

    const event = await barnRecordsService.createMortalityEvent(input, tenantId)

    // Note: Event publishing happens in service layer (non-blocking)

    res.status(201).json({
      id: event.id,
      animalCount: event.animalCount,
    })
  } catch (error) {
    logger.error('Error in createMortalityEventHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Mortality event with same external_ref or event_id already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create mortality event',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/vaccines
 */
export async function createVaccineEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateVaccineEventInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      occurredAt: new Date(req.body.occurredAt),
      vaccineName: req.body.vaccineName,
      doseMl: req.body.doseMl ? parseFloat(req.body.doseMl) : null,
      route: req.body.route,
      administeredBy: req.body.administeredBy,
      animalCount: parseInt(req.body.animalCount, 10),
      notes: req.body.notes,
      externalRef: req.body.externalRef || idempotencyKey,
      eventId: req.body.eventId,
    }

    const event = await barnRecordsService.createVaccineEvent(input, tenantId)

    res.status(201).json({
      id: event.id,
      vaccineName: event.vaccineName,
    })
  } catch (error) {
    logger.error('Error in createVaccineEventHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Vaccine event with same external_ref or event_id already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create vaccine event',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/treatments
 */
export async function createTreatmentEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateTreatmentEventInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      occurredAt: new Date(req.body.occurredAt),
      treatmentName: req.body.treatmentName,
      doseMl: req.body.doseMl ? parseFloat(req.body.doseMl) : null,
      route: req.body.route,
      durationDays: req.body.durationDays ? parseInt(req.body.durationDays, 10) : null,
      animalCount: parseInt(req.body.animalCount, 10),
      withdrawalDays: req.body.withdrawalDays
        ? parseInt(req.body.withdrawalDays, 10)
        : null,
      notes: req.body.notes,
      externalRef: req.body.externalRef || idempotencyKey,
      eventId: req.body.eventId,
    }

    const event = await barnRecordsService.createTreatmentEvent(input, tenantId)

    res.status(201).json({
      id: event.id,
      treatmentName: event.treatmentName,
    })
  } catch (error) {
    logger.error('Error in createTreatmentEventHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Treatment event with same external_ref or event_id already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create treatment event',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/daily-counts
 */
export async function createDailyCountHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateDailyCountInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      recordDate: new Date(req.body.recordDate),
      animalCount: parseInt(req.body.animalCount, 10),
      averageWeightKg: req.body.averageWeightKg
        ? parseFloat(req.body.averageWeightKg)
        : null,
      mortalityCount: req.body.mortalityCount
        ? parseInt(req.body.mortalityCount, 10)
        : null,
      cullCount: req.body.cullCount ? parseInt(req.body.cullCount, 10) : null,
      externalRef: req.body.externalRef || idempotencyKey,
    }

    const record = await barnRecordsService.createDailyCount(input, tenantId)

    res.status(201).json({
      id: record.id,
      animalCount: record.animalCount,
    })
  } catch (error) {
    logger.error('Error in createDailyCountHandler', error)
    if (
      (error as Error).message === 'DUPLICATE_ENTRY' ||
      (error as Error).message === 'DUPLICATE_DATE_ENTRY'
    ) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Daily count with same external_ref or record_date already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create daily count',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/barn-records/daily-counts
 */
export async function listDailyCountsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const result = await barnRecordsService.listDailyCounts(tenantId, {
      farmId: req.query.farmId as string | undefined,
      barnId: req.query.barnId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      start: req.query.start ? new Date(req.query.start as string) : undefined,
      end: req.query.end ? new Date(req.query.end as string) : undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listDailyCountsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list daily counts',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/welfare-checks
 */
export async function createWelfareCheckHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateWelfareCheckInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      occurredAt: new Date(req.body.occurredAt),
      gaitScore: req.body.gaitScore ? parseInt(req.body.gaitScore, 10) : null,
      lesionScore: req.body.lesionScore ? parseInt(req.body.lesionScore, 10) : null,
      behaviorScore: req.body.behaviorScore
        ? parseInt(req.body.behaviorScore, 10)
        : null,
      observer: req.body.observer,
      notes: req.body.notes,
      externalRef: req.body.externalRef || idempotencyKey,
    }

    const check = await barnRecordsService.createWelfareCheck(input, tenantId)

    res.status(201).json({
      id: check.id,
      gaitScore: check.gaitScore,
    })
  } catch (error) {
    logger.error('Error in createWelfareCheckHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Welfare check with same external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create welfare check',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/housing-conditions
 */
export async function createHousingConditionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateHousingConditionInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      occurredAt: new Date(req.body.occurredAt),
      stockingDensity: req.body.stockingDensity
        ? parseFloat(req.body.stockingDensity)
        : null,
      beddingType: req.body.beddingType,
      ventilationMode: req.body.ventilationMode,
      temperatureC: req.body.temperatureC ? parseFloat(req.body.temperatureC) : null,
      humidityPct: req.body.humidityPct ? parseFloat(req.body.humidityPct) : null,
      ammoniaPpm: req.body.ammoniaPpm ? parseFloat(req.body.ammoniaPpm) : null,
      notes: req.body.notes,
      externalRef: req.body.externalRef || idempotencyKey,
    }

    const condition = await barnRecordsService.createHousingCondition(input, tenantId)

    res.status(201).json({
      id: condition.id,
      stockingDensity: condition.stockingDensity?.toString() || null,
    })
  } catch (error) {
    logger.error('Error in createHousingConditionHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Housing condition with same external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create housing condition',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/genetics
 */
export async function createGeneticProfileHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: barnRecordsService.CreateGeneticProfileInput = {
      tenantId,
      batchId: req.body.batchId,
      strain: req.body.strain,
      breedLine: req.body.breedLine,
      supplier: req.body.supplier,
      hatchDate: req.body.hatchDate ? new Date(req.body.hatchDate) : null,
      externalRef: req.body.externalRef || idempotencyKey,
    }

    const profile = await barnRecordsService.createGeneticProfile(input, tenantId)

    res.status(201).json({
      id: profile.id,
      strain: profile.strain,
    })
  } catch (error) {
    logger.error('Error in createGeneticProfileHandler', error)
    if (
      (error as Error).message === 'DUPLICATE_ENTRY' ||
      (error as Error).message === 'DUPLICATE_BATCH_ENTRY'
    ) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Genetic profile with same external_ref or batch_id already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create genetic profile',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

