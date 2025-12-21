import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Get weighvision sessions with filters
 */
export async function getSessions(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  batchId?: string
  stationId?: string
  status?: string
  from?: Date
  to?: Date
  limit?: number
  cursor?: string
}) {
  const {
    tenantId,
    farmId,
    barnId,
    batchId,
    stationId,
    status,
    from,
    to,
    limit = 100,
    cursor,
  } = params

  const where: any = {
    tenantId,
  }

  if (farmId) where.farmId = farmId
  if (barnId) where.barnId = barnId
  if (batchId) where.batchId = batchId
  if (stationId) where.stationId = stationId
  if (status) where.status = status
  if (from || to) {
    where.startedAt = {}
    if (from) where.startedAt.gte = from
    if (to) where.startedAt.lte = to
  }

  if (cursor) {
    where.id = { gt: cursor }
  }

  const sessions = await prisma.weighVisionSession.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there's a next page
    include: {
      measurements: {
        orderBy: { ts: 'desc' },
        take: 10, // Include latest 10 measurements
      },
      media: {
        orderBy: { ts: 'desc' },
        take: 5, // Include latest 5 media items
      },
      inferences: {
        orderBy: { ts: 'desc' },
        take: 5, // Include latest 5 inferences
      },
    },
  })

  const hasNext = sessions.length > limit
  const items = hasNext ? sessions.slice(0, limit) : sessions
  const nextCursor = hasNext ? items[items.length - 1].id : null

  return {
    items,
    nextCursor,
    hasMore: hasNext,
  }
}

/**
 * Get weighvision session by ID
 */
export async function getSessionById(tenantId: string, sessionId: string) {
  const session = await prisma.weighVisionSession.findUnique({
    where: {
      tenantId_sessionId: {
        tenantId,
        sessionId,
      },
    },
    include: {
      measurements: {
        orderBy: { ts: 'asc' },
      },
      media: {
        orderBy: { ts: 'asc' },
      },
      inferences: {
        orderBy: { ts: 'asc' },
      },
    },
  })

  return session
}

/**
 * RabbitMQ event envelope
 */
export interface WeighVisionEvent {
  event_id: string
  event_type: string
  tenant_id: string
  farm_id?: string
  barn_id?: string
  batch_id?: string
  station_id?: string
  session_id?: string
  occurred_at: string
  trace_id?: string
  payload: Record<string, unknown>
}

/**
 * Handle weighvision.session.created event
 */
export async function handleSessionCreated(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate weighvision session.created event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record first
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id, // Use event_id as id for simplicity
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    // Create session
    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in weighvision.session.created event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    await prisma.weighVisionSession.upsert({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId,
        },
      },
      create: {
        id: event.event_id, // Use event_id as id
        tenantId: event.tenant_id,
        farmId: event.farm_id || null,
        barnId: event.barn_id || null,
        batchId: event.batch_id || (event.payload.batch_id as string) || null,
        stationId: event.station_id || (event.payload.station_id as string) || null,
        sessionId,
        startedAt: new Date(event.occurred_at),
        status: 'RUNNING',
      },
      update: {
        // Update if exists (shouldn't happen, but safe)
        status: 'RUNNING',
        updatedAt: new Date(),
      },
    })

    logger.info('WeighVision session created', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Duplicate - already processed
      logger.debug('Duplicate weighvision session (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling weighvision.session.created', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle weighvision.session.finalized event
 */
export async function handleSessionFinalized(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate weighvision session.finalized event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in weighvision.session.finalized event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Update session
    await prisma.weighVisionSession.update({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId,
        },
      },
      data: {
        status: 'FINALIZED',
        endedAt: new Date(event.occurred_at),
        updatedAt: new Date(),
      },
    })

    logger.info('WeighVision session finalized', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Session not found - log warning but don't fail
      logger.warn('WeighVision session not found for finalized event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId: event.session_id,
      })
      return false
    }
    logger.error('Error handling weighvision.session.finalized', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle weight.recorded event (if exists)
 */
export async function handleWeightRecorded(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate weight.recorded event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in weight.recorded event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Find session by external sessionId to get internal DB ID
    const session = await prisma.weighVisionSession.findUnique({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId: sessionId,
        },
      },
    })

    if (!session) {
      logger.warn('Session not found for weight.recorded event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId,
      })
      return false
    }

    const weightKg = event.payload.weight_kg as number || event.payload.weightKg as number
    if (!weightKg) {
      logger.warn('Missing weight_kg in weight.recorded event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create measurement
    await prisma.weighVisionMeasurement.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        sessionId, // Keep external sessionId for querying
        sessionDbId: session.id, // Use internal DB ID for relation
        ts: new Date(event.occurred_at),
        weightKg,
        source: (event.payload.source as string) || 'scale',
        metaJson: event.payload.meta ? JSON.stringify(event.payload.meta) : null,
      },
    })

    logger.info('WeighVision measurement recorded', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      weightKg,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.debug('Duplicate weight measurement (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling weight.recorded', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle media.stored event (optional)
 */
export async function handleMediaStored(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate media.stored event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in media.stored event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Find session by external sessionId to get internal DB ID
    const session = await prisma.weighVisionSession.findUnique({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId: sessionId,
        },
      },
    })

    if (!session) {
      logger.warn('Session not found for media.stored event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId,
      })
      return false
    }

    const objectId = event.payload.object_id as string || event.payload.objectId as string
    const path = event.payload.path as string || event.payload.url as string
    if (!objectId || !path) {
      logger.warn('Missing object_id or path in media.stored event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create media record
    await prisma.weighVisionMedia.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        sessionId, // Keep external sessionId for querying
        sessionDbId: session.id, // Use internal DB ID for relation
        objectId,
        path,
        ts: new Date(event.occurred_at),
      },
    })

    logger.info('WeighVision media stored', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      objectId,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.debug('Duplicate media record (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling media.stored', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle inference.completed event (optional)
 */
export async function handleInferenceCompleted(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate inference.completed event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in inference.completed event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Find session by external sessionId to get internal DB ID
    const session = await prisma.weighVisionSession.findUnique({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId: sessionId,
        },
      },
    })

    if (!session) {
      logger.warn('Session not found for inference.completed event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId,
      })
      return false
    }

    const modelVersion = event.payload.model_version as string || event.payload.modelVersion as string || 'unknown'
    const resultJson = JSON.stringify(event.payload.result || event.payload)

    // Create inference record
    await prisma.weighVisionInference.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        sessionId, // Keep external sessionId for querying
        sessionDbId: session.id, // Use internal DB ID for relation
        modelVersion,
        resultJson,
        ts: new Date(event.occurred_at),
      },
    })

    logger.info('WeighVision inference completed', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      modelVersion,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.debug('Duplicate inference record (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling inference.completed', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

