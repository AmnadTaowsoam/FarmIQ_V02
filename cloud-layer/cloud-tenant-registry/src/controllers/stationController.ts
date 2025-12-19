import { Request, Response } from 'express'
import {
  getStationsByTenant,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
} from '../services/stationService'
import { logger } from '../utils/logger'

/**
 * Get all stations for tenant
 */
export async function getStations(req: Request, res: Response) {
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
    const stations = await getStationsByTenant(tenantId, farmId, barnId)
    res.json(stations)
  } catch (error) {
    logger.error('Error in getStations:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch stations',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get station by ID
 */
export async function getStation(req: Request, res: Response) {
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
    const station = await getStationById(tenantId, id)
    if (!station) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Station with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(station)
  } catch (error) {
    logger.error('Error in getStation:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch station',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create station
 */
export async function createStationHandler(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.body.tenantId
    const { farmId, barnId } = req.body
    if (!tenantId || !farmId || !barnId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId, farmId, and barnId are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const station = await createStation(tenantId, farmId, barnId, req.body)
    res.status(201).json(station)
  } catch (error: any) {
    logger.error('Error in createStationHandler:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Station with this name already exists for this barn',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create station',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update station
 */
export async function updateStationHandler(req: Request, res: Response) {
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
    const result = await updateStation(tenantId, id, req.body)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Station with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const updated = await getStationById(tenantId, id)
    res.json(updated)
  } catch (error) {
    logger.error('Error in updateStationHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update station',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Delete station
 */
export async function deleteStationHandler(req: Request, res: Response) {
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
    const result = await deleteStation(tenantId, id)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Station with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(204).send()
  } catch (error) {
    logger.error('Error in deleteStationHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete station',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

