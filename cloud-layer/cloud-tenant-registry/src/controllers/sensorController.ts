import { Request, Response } from 'express'
import {
  getSensorsByTenant,
  getSensorBySensorId,
  createSensor,
  updateSensor,
  getSensorBindings,
  createSensorBinding,
  getSensorCalibrations,
  createSensorCalibration,
} from '../services/sensorService'
import { logger } from '../utils/logger'

/**
 * Get all sensors for tenant
 */
export async function getSensors(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || (req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const filters = {
      barnId: req.query.barnId as string | undefined,
      deviceId: req.query.deviceId as string | undefined,
      type: req.query.type as string | undefined,
      enabled: req.query.enabled !== undefined ? req.query.enabled === 'true' : undefined,
      q: req.query.q as string | undefined,
    }

    const pagination = {
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    }

    const result = await getSensorsByTenant(tenantId, filters, pagination)
    res.json(result)
  } catch (error) {
    logger.error('Error in getSensors:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sensors',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get sensor by sensorId
 */
export async function getSensor(req: Request, res: Response) {
  try {
    const { sensorId } = req.params
    const tenantId = res.locals.tenantId || (req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const sensor = await getSensorBySensorId(tenantId, sensorId)
    if (!sensor) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Sensor with id ${sensorId} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(sensor)
  } catch (error) {
    logger.error('Error in getSensor:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sensor',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create sensor
 */
export async function createSensorHandler(req: Request, res: Response) {
  try {
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

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined
    const sensor = await createSensor(tenantId, req.body, idempotencyKey)
    res.status(201).json(sensor)
  } catch (error: any) {
    logger.error('Error in createSensorHandler:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Sensor with this sensorId already exists for this tenant',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create sensor',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update sensor
 */
export async function updateSensorHandler(req: Request, res: Response) {
  try {
    const { sensorId } = req.params
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

    const result = await updateSensor(tenantId, sensorId, req.body)
    if (!result || (result as any).count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Sensor with id ${sensorId} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(result)
  } catch (error: any) {
    logger.error('Error in updateSensorHandler:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update sensor',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get sensor bindings
 */
export async function getBindings(req: Request, res: Response) {
  try {
    const { sensorId } = req.params
    const tenantId = res.locals.tenantId || (req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const pagination = {
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    }

    const result = await getSensorBindings(tenantId, sensorId, pagination)
    res.json(result)
  } catch (error: any) {
    logger.error('Error in getBindings:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch bindings',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create sensor binding
 */
export async function createBindingHandler(req: Request, res: Response) {
  try {
    const { sensorId } = req.params
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

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined
    const bindingData = {
      ...req.body,
      effectiveFrom: new Date(req.body.effectiveFrom),
      effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : null,
    }

    const binding = await createSensorBinding(tenantId, sensorId, bindingData, idempotencyKey)
    res.status(201).json(binding)
  } catch (error: any) {
    logger.error('Error in createBindingHandler:', error)
    if (error.message?.includes('overlaps')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create binding',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get sensor calibrations
 */
export async function getCalibrations(req: Request, res: Response) {
  try {
    const { sensorId } = req.params
    const tenantId = res.locals.tenantId || (req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const pagination = {
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    }

    const result = await getSensorCalibrations(tenantId, sensorId, pagination)
    res.json(result)
  } catch (error: any) {
    logger.error('Error in getCalibrations:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch calibrations',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create sensor calibration
 */
export async function createCalibrationHandler(req: Request, res: Response) {
  try {
    const { sensorId } = req.params
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

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined
    const calibrationData = {
      ...req.body,
      performedAt: new Date(req.body.performedAt),
    }

    const calibration = await createSensorCalibration(tenantId, sensorId, calibrationData, idempotencyKey)
    res.status(201).json(calibration)
  } catch (error: any) {
    logger.error('Error in createCalibrationHandler:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create calibration',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

