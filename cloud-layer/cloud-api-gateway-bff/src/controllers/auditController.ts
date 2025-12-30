import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { queryAuditEvents, getAuditEventById } from '../services/auditService'

export async function queryAuditEventsHandler(req: Request, res: Response): Promise<void> {
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

    const data = await queryAuditEvents({
      tenantId,
      actor: req.query.actor as string | undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resource_type as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
      headers,
    })

    res.status(200).json(data)
  } catch (error) {
    logger.error('Error in queryAuditEventsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to query audit events',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getAuditEventByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = res.locals.tenantId || (req.query.tenant_id as string)
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

    const data = await getAuditEventById({
      tenantId,
      id: req.params.id,
      headers,
    })

    if (!data) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Audit event not found',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    res.status(200).json(data)
  } catch (error) {
    logger.error('Error in getAuditEventByIdHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch audit event',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
