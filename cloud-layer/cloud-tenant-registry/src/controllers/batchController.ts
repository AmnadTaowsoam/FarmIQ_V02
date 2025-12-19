import { Request, Response } from 'express'
import {
  getBatchesByTenant,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
} from '../services/batchService'
import { logger } from '../utils/logger'

/**
 * Get all batches for tenant
 */
export async function getBatches(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const batches = await getBatchesByTenant(tenantId, farmId, barnId)
    res.json(batches)
  } catch (error) {
    logger.error('Error in getBatches:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch batches',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get batch by ID
 */
export async function getBatch(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const batch = await getBatchById(tenantId, id)
    if (!batch) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Batch with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(batch)
  } catch (error) {
    logger.error('Error in getBatch:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch batch',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create batch
 */
export async function createBatchHandler(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.body.tenantId
    const { farmId, barnId, species, startDate, endDate, status } = req.body
    if (!tenantId || !farmId || !barnId || !species) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId, farmId, barnId, and species are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const batch = await createBatch(tenantId, farmId, barnId, {
      species,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    })
    res.status(201).json(batch)
  } catch (error: any) {
    logger.error('Error in createBatchHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create batch',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update batch
 */
export async function updateBatchHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = res.locals.tenantId || req.body.tenantId
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const { startDate, endDate, ...rest } = req.body
    const updateData: any = { ...rest }
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    const result = await updateBatch(tenantId, id, updateData)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Batch with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const updated = await getBatchById(tenantId, id)
    res.json(updated)
  } catch (error) {
    logger.error('Error in updateBatchHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update batch',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Delete batch
 */
export async function deleteBatchHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const result = await deleteBatch(tenantId, id)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Batch with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(204).send()
  } catch (error) {
    logger.error('Error in deleteBatchHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete batch',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

