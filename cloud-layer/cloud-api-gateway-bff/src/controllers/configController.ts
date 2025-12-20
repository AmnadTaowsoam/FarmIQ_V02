import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import {
  getConfigContext,
  getThresholds,
  upsertThreshold,
  getTargets,
  upsertTarget,
} from '../services/configService'

export async function getConfigContextHandler(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = res.locals.tenantId || req.query.tenant_id as string
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

    const headers = {
      authorization: req.headers.authorization || '',
      'x-request-id': res.locals.requestId || '',
    }

    const data = await getConfigContext({
      tenantId,
      farmId: req.query.farm_id as string | undefined,
      barnId: req.query.barn_id as string | undefined,
      headers,
    })

    res.status(200).json({ data })
  } catch (error) {
    logger.error('Error in getConfigContextHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get config context',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getThresholdsHandler(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = res.locals.tenantId || req.query.tenant_id as string
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

    const headers = {
      authorization: req.headers.authorization || '',
      'x-request-id': res.locals.requestId || '',
    }

    const data = await getThresholds({
      tenantId,
      farmId: req.query.farm_id as string | undefined,
      barnId: req.query.barn_id as string | undefined,
      headers,
    })

    res.status(200).json(data)
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

export async function upsertThresholdHandler(req: Request, res: Response): Promise<void> {
  try {
    const headers = {
      authorization: req.headers.authorization || '',
      'x-request-id': res.locals.requestId || '',
    }

    const data = await upsertThreshold({
      body: req.body,
      headers,
    })

    res.status(200).json({ data })
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

export async function getTargetsHandler(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = res.locals.tenantId || req.query.tenant_id as string
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

    const headers = {
      authorization: req.headers.authorization || '',
      'x-request-id': res.locals.requestId || '',
    }

    const data = await getTargets({
      tenantId,
      farmId: req.query.farm_id as string | undefined,
      barnId: req.query.barn_id as string | undefined,
      species: req.query.species as string | undefined,
      headers,
    })

    res.status(200).json(data)
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

export async function upsertTargetHandler(req: Request, res: Response): Promise<void> {
  try {
    const headers = {
      authorization: req.headers.authorization || '',
      'x-request-id': res.locals.requestId || '',
    }

    const data = await upsertTarget({
      body: req.body,
      headers,
    })

    res.status(200).json({ data })
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

