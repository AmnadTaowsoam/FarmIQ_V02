import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import {
  getEffectiveConfig,
  getThresholds,
  upsertThreshold,
  getTargets,
  upsertTarget,
  ThresholdRuleInput,
  TargetCurveInput,
} from '../services/configService'

/**
 * Get effective config for context
 * GET /api/v1/config/context
 */
export async function getEffectiveConfigHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenant_id as string)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'tenant_id is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const farmId = req.query.farm_id as string | undefined
    const barnId = req.query.barn_id as string | undefined

    const config = await getEffectiveConfig(tenantId, farmId, barnId)

    res.status(200).json({
      data: config,
    })
  } catch (error) {
    logger.error('Error in getEffectiveConfigHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get effective config',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get thresholds
 * GET /api/v1/config/thresholds
 */
export async function getThresholdsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenant_id as string)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'tenant_id is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const farmId = req.query.farm_id as string | undefined
    const barnId = req.query.barn_id as string | undefined

    const thresholds = await getThresholds(tenantId, farmId, barnId)

    res.status(200).json({
      data: thresholds,
    })
  } catch (error) {
    logger.error('Error in getThresholdsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get thresholds',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Upsert threshold
 * PUT /api/v1/config/thresholds
 */
export async function upsertThresholdHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenant_id)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'tenant_id is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const updatedBy = res.locals.userId || 'system'

    const input: ThresholdRuleInput = {
      tenantId,
      farmId: req.body.farm_id || null,
      barnId: req.body.barn_id || null,
      metric: req.body.metric,
      op: req.body.op,
      value: req.body.value,
      durationSec: req.body.duration_sec || null,
      severity: req.body.severity,
      enabled: req.body.enabled,
    }

    const threshold = await upsertThreshold(input, updatedBy)

    res.status(200).json({
      data: threshold,
    })
  } catch (error) {
    logger.error('Error in upsertThresholdHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upsert threshold',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get targets
 * GET /api/v1/config/targets
 */
export async function getTargetsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenant_id as string)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'tenant_id is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const farmId = req.query.farm_id as string | undefined
    const barnId = req.query.barn_id as string | undefined
    const species = req.query.species as string | undefined

    const targets = await getTargets(tenantId, farmId, barnId, species)

    res.status(200).json({
      data: targets,
    })
  } catch (error) {
    logger.error('Error in getTargetsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get targets',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Upsert target
 * PUT /api/v1/config/targets
 */
export async function upsertTargetHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenant_id)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'tenant_id is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const updatedBy = res.locals.userId || 'system'

    const input: TargetCurveInput = {
      tenantId,
      farmId: req.body.farm_id || null,
      barnId: req.body.barn_id || null,
      species: req.body.species || null,
      day: req.body.day,
      targetWeight: req.body.target_weight || null,
      targetFcr: req.body.target_fcr || null,
    }

    const target = await upsertTarget(input, updatedBy)

    res.status(200).json({
      data: target,
    })
  } catch (error) {
    logger.error('Error in upsertTargetHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upsert target',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

