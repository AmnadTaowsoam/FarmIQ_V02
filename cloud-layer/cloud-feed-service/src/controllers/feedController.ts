import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import * as feedService from '../services/feedService'
import * as kpiService from '../services/kpiService'

function getQueryValue(req: Request, camel: string, snake: string): string | undefined {
  return (req.query[camel] as string | undefined) || (req.query[snake] as string | undefined)
}

function parseDateRange(req: Request) {
  const startStr = getQueryValue(req, 'start', 'start') || getQueryValue(req, 'startDate', 'start_date')
  const endStr = getQueryValue(req, 'end', 'end') || getQueryValue(req, 'endDate', 'end_date')
  return {
    start: startStr ? new Date(startStr) : undefined,
    end: endStr ? new Date(endStr) : undefined,
  }
}

/**
 * POST /api/v1/feed/formulas
 */
export async function createFeedFormulaHandler(
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

    const input: feedService.CreateFeedFormulaInput = {
      tenantId,
      name: req.body.name,
      species: req.body.species,
      phase: req.body.phase,
      energyKcalPerKg: req.body.energyKcalPerKg,
      proteinPct: req.body.proteinPct,
      fiberPct: req.body.fiberPct,
      fatPct: req.body.fatPct,
      status: req.body.status || 'active',
      externalRef: req.body.externalRef,
      idempotencyKey,
    }

    // TODO: Implement idempotency cache check using idempotencyKey
    // For now, using externalRef if provided

    const formula = await feedService.createFeedFormula(input, tenantId)

    res.status(201).json({
      id: formula.id,
      name: formula.name,
      status: formula.status,
    })
  } catch (error) {
    logger.error('Error in createFeedFormulaHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Formula with same name or external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed formula',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/formulas
 */
export async function listFeedFormulasHandler(
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

    const result = await feedService.listFeedFormulas(tenantId, {
      species: req.query.species as string | undefined,
      phase: req.query.phase as string | undefined,
      status: req.query.status as string | undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedFormulasHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed formulas',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/intake-records
 */
export async function createFeedIntakeRecordHandler(
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

    if (!idempotencyKey && !req.body.eventId && !req.body.externalRef) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Idempotency-Key header or eventId/externalRef is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const input: feedService.CreateFeedIntakeRecordInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      deviceId: req.body.deviceId,
      source: req.body.source, // MANUAL, API_IMPORT, SILO_AUTO
      feedFormulaId: req.body.feedFormulaId,
      feedLotId: req.body.feedLotId,
      quantityKg: parseFloat(req.body.quantityKg),
      occurredAt: new Date(req.body.occurredAt),
      ingestedAt: req.body.ingestedAt ? new Date(req.body.ingestedAt) : null,
      eventId: req.body.eventId,
      externalRef: req.body.externalRef,
      idempotencyKey,
      sequence: req.body.sequence,
      notes: req.body.notes,
      createdByUserId: res.locals.userId,
    }

    if (input.quantityKg < 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'quantityKg must be >= 0',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const record = await feedService.createFeedIntakeRecord(input, tenantId)

    res.status(201).json({
      id: record.id,
      quantityKg: record.quantityKg.toString(),
      occurredAt: record.occurredAt.toISOString(),
    })
  } catch (error) {
    logger.error('Error in createFeedIntakeRecordHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Record with same event_id, idempotency_key, or external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed intake record',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/intake-records
 */
export async function listFeedIntakeRecordsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, getQueryValue(req, 'tenantId', 'tenant_id'))
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

    const { start, end } = parseDateRange(req)

    const result = await feedService.listFeedIntakeRecords(tenantId, {
      farmId: getQueryValue(req, 'farmId', 'farm_id'),
      barnId: getQueryValue(req, 'barnId', 'barn_id'),
      batchId: getQueryValue(req, 'batchId', 'batch_id'),
      start,
      end,
      cursor: getQueryValue(req, 'cursor', 'cursor'),
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedIntakeRecordsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed intake records',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/lots
 */
export async function createFeedLotHandler(
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

    const input: feedService.CreateFeedLotInput = {
      tenantId,
      farmId: req.body.farmId,
      supplierName: req.body.supplierName,
      lotCode: req.body.lotCode,
      feedFormulaId: req.body.feedFormulaId,
      manufactureDate: req.body.manufactureDate
        ? new Date(req.body.manufactureDate)
        : null,
      receivedDate: req.body.receivedDate
        ? new Date(req.body.receivedDate)
        : null,
      quantityKg: req.body.quantityKg ? parseFloat(req.body.quantityKg) : null,
      remainingKg: req.body.remainingKg
        ? parseFloat(req.body.remainingKg)
        : null,
      status: req.body.status || 'active',
      externalRef: req.body.externalRef,
      idempotencyKey,
    }

    const lot = await feedService.createFeedLot(input, tenantId)

    res.status(201).json({
      id: lot.id,
      lotCode: lot.lotCode,
      quantityKg: lot.quantityKg?.toString() || null,
    })
  } catch (error) {
    logger.error('Error in createFeedLotHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Lot with same external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed lot',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/lots
 */
export async function listFeedLotsHandler(
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

    const result = await feedService.listFeedLots(tenantId, {
      farmId: req.query.farmId as string | undefined,
      feedFormulaId: req.query.feedFormulaId as string | undefined,
      status: req.query.status as string | undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedLotsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed lots',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/deliveries
 */
export async function createFeedDeliveryHandler(
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

    const input: feedService.CreateFeedDeliveryInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      feedLotId: req.body.feedLotId,
      deliveryRef: req.body.deliveryRef,
      deliveredAt: new Date(req.body.deliveredAt),
      quantityKg: parseFloat(req.body.quantityKg),
      unitCost: req.body.unitCost ? parseFloat(req.body.unitCost) : null,
      currency: req.body.currency,
      externalRef: req.body.externalRef,
      idempotencyKey,
    }

    if (input.quantityKg < 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'quantityKg must be >= 0',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const delivery = await feedService.createFeedDelivery(input, tenantId)

    res.status(201).json({
      id: delivery.id,
      deliveredAt: delivery.deliveredAt.toISOString(),
      quantityKg: delivery.quantityKg.toString(),
    })
  } catch (error) {
    logger.error('Error in createFeedDeliveryHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Delivery with same external_ref or delivery_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed delivery',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/deliveries
 */
export async function listFeedDeliveriesHandler(
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

    const result = await feedService.listFeedDeliveries(tenantId, {
      farmId: req.query.farmId as string | undefined,
      barnId: req.query.barnId as string | undefined,
      feedLotId: req.query.feedLotId as string | undefined,
      start: req.query.start ? new Date(req.query.start as string) : undefined,
      end: req.query.end ? new Date(req.query.end as string) : undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedDeliveriesHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed deliveries',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/quality-results
 */
export async function createFeedQualityResultHandler(
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

    const input: feedService.CreateFeedQualityResultInput = {
      tenantId,
      feedLotId: req.body.feedLotId,
      sampledAt: new Date(req.body.sampledAt),
      metric: req.body.metric,
      value: parseFloat(req.body.value),
      unit: req.body.unit,
      method: req.body.method,
      status: req.body.status || 'valid',
      externalRef: req.body.externalRef,
      idempotencyKey,
    }

    if (input.value < 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'value must be >= 0',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const qualityResult = await feedService.createFeedQualityResult(
      input,
      tenantId
    )

    res.status(201).json({
      id: qualityResult.id,
      metric: qualityResult.metric,
      value: qualityResult.value.toString(),
    })
  } catch (error) {
    logger.error('Error in createFeedQualityResultHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Quality result with same external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed quality result',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/quality-results
 */
export async function listFeedQualityResultsHandler(
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

    const result = await feedService.listFeedQualityResults(tenantId, {
      feedLotId: req.query.feedLotId as string | undefined,
      metric: req.query.metric as string | undefined,
      status: req.query.status as string | undefined,
      start: req.query.start ? new Date(req.query.start as string) : undefined,
      end: req.query.end ? new Date(req.query.end as string) : undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedQualityResultsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed quality results',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/programs
 */
export async function createFeedProgramHandler(
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

    const input: feedService.CreateFeedProgramInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      name: req.body.name,
      status: req.body.status || 'active',
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      notes: req.body.notes,
      externalRef: req.body.externalRef,
      idempotencyKey,
    }

    const program = await feedService.createFeedProgram(input, tenantId)

    res.status(201).json({
      id: program.id,
      name: program.name,
      status: program.status,
    })
  } catch (error) {
    logger.error('Error in createFeedProgramHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Program with same name or external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed program',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/programs
 */
export async function listFeedProgramsHandler(
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

    const result = await feedService.listFeedPrograms(tenantId, {
      farmId: req.query.farmId as string | undefined,
      barnId: req.query.barnId as string | undefined,
      status: req.query.status as string | undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedProgramsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed programs',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/inventory-snapshots
 */
export async function createFeedInventorySnapshotHandler(
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

    const input: feedService.CreateFeedInventorySnapshotInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      feedLotId: req.body.feedLotId,
      snapshotAt: new Date(req.body.snapshotAt),
      quantityKg: parseFloat(req.body.quantityKg),
      source: req.body.source,
      externalRef: req.body.externalRef,
      idempotencyKey,
    }

    if (input.quantityKg < 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'quantityKg must be >= 0',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const snapshot = await feedService.createFeedInventorySnapshot(
      input,
      tenantId
    )

    res.status(201).json({
      id: snapshot.id,
      quantityKg: snapshot.quantityKg.toString(),
    })
  } catch (error) {
    logger.error('Error in createFeedInventorySnapshotHandler', error)
    if ((error as Error).message === 'DUPLICATE_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Inventory snapshot with same external_ref already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create feed inventory snapshot',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/inventory-snapshots
 */
export async function listFeedInventorySnapshotsHandler(
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

    const result = await feedService.listFeedInventorySnapshots(tenantId, {
      farmId: req.query.farmId as string | undefined,
      barnId: req.query.barnId as string | undefined,
      feedLotId: req.query.feedLotId as string | undefined,
      source: req.query.source as string | undefined,
      start: req.query.start ? new Date(req.query.start as string) : undefined,
      end: req.query.end ? new Date(req.query.end as string) : undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listFeedInventorySnapshotsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list feed inventory snapshots',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

