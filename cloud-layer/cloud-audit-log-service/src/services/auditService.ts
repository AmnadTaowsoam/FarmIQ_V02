import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface AuditEventInput {
  tenantId: string
  actorId: string
  actorRole: string
  action: string
  resourceType: string
  resourceId?: string | null
  summary: string
  metadataJson?: Record<string, unknown> | null
  requestId?: string | null
}

/**
 * Create audit event (append-only)
 */
export async function createAuditEvent(input: AuditEventInput) {
  try {
    return await prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId || null,
        summary: input.summary,
        metadataJson: input.metadataJson as any,
        requestId: input.requestId || null,
      },
    })
  } catch (error) {
    logger.error('Error creating audit event', error)
    throw error
  }
}

export interface AuditEventQuery {
  tenantId: string
  actorId?: string
  action?: string
  resourceType?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}

/**
 * Query audit events
 */
export async function queryAuditEvents(query: AuditEventQuery) {
  try {
    const page = query.page || 1
    const limit = Math.min(query.limit || 25, 100) // Max 100 per page
    const skip = (page - 1) * limit

    const where: any = {
      tenantId: query.tenantId,
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    }

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditEvent.count({ where }),
    ])

    return {
      data: events,
      meta: {
        page,
        limit,
        total,
        hasNext: skip + limit < total,
      },
    }
  } catch (error) {
    logger.error('Error querying audit events', error)
    throw error
  }
}

export async function getAuditEventById(params: { tenantId: string; id: string }) {
  try {
    return await prisma.auditEvent.findFirst({
      where: {
        id: params.id,
        tenantId: params.tenantId,
      },
    })
  } catch (error) {
    logger.error('Error fetching audit event by id', error)
    throw error
  }
}
