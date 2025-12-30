import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { createAuditEvent, queryAuditEvents, getAuditEventById, AuditEventInput } from '../services/auditService'

/**
 * Create audit event
 * POST /api/v1/audit/events
 * (Internal + BFF can call this)
 */
export async function createAuditEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = req.body.tenant_id || res.locals.tenantId
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

    const input: AuditEventInput = {
      tenantId,
      actorId: req.body.actor_id || res.locals.userId || 'system',
      actorRole: req.body.actor_role || res.locals.roles?.[0] || 'system',
      action: req.body.action,
      resourceType: req.body.resource_type,
      resourceId: req.body.resource_id || null,
      summary: req.body.summary,
      metadataJson: req.body.metadata || null,
      requestId: res.locals.requestId || null,
    }

    const event = await createAuditEvent(input)

    res.status(201).json({
      data: event,
    })
  } catch (error) {
    logger.error('Error in createAuditEventHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create audit event',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Query audit events
 * GET /api/v1/audit/events
 */
export async function queryAuditEventsHandler(
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

    const from = req.query.from ? new Date(req.query.from as string) : undefined
    const to = req.query.to ? new Date(req.query.to as string) : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25

    const result = await queryAuditEvents({
      tenantId,
      actorId: req.query.actor as string | undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resource_type as string | undefined,
      from,
      to,
      page,
      limit,
    })

    res.status(200).json(result)
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

/**
 * Get audit event by ID
 * GET /api/v1/audit/events/:id
 */
export async function getAuditEventByIdHandler(
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

    const event = await getAuditEventById({ tenantId, id: req.params.id })
    if (!event) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Audit event not found',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    res.status(200).json({ data: event })
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
