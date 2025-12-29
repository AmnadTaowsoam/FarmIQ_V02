import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

type CreateSessionParams = {
  sessionId: string
  eventId: string
  tenantId: string
  farmId: string
  barnId: string
  deviceId: string
  stationId: string
  batchId?: string
  startAt: string
  traceId: string
}

type BindWeightParams = {
  tenantId: string
  weightKg: number
  occurredAt: string
  eventId: string
  traceId: string
}

type BindMediaParams = {
  tenantId: string
  mediaObjectId: string
  occurredAt: string
  eventId: string
  traceId: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const pingDb = async () => {
  await prisma.$queryRaw`SELECT 1`
}

export const createSession = async (data: CreateSessionParams) => {
  const {
    sessionId,
    eventId,
    tenantId,
    farmId,
    barnId,
    deviceId,
    stationId,
    batchId,
    startAt,
    traceId,
  } = data

  const session = await prisma.$transaction(async (tx) => {
    // Idempotent upsert
    const createdOrExisting = await tx.weightSession.upsert({
      where: { sessionId },
      create: {
        sessionId,
        tenantId,
        farmId,
        barnId,
        deviceId,
        stationId,
        batchId,
        status: 'created',
        startAt: new Date(startAt),
      },
      update: {}, // No-op if exists
    })

    // Reconcile pending media bindings
    const unboundMedia = await tx.sessionMediaBinding.findMany({
      where: { sessionId, isBound: false },
    })

    if (unboundMedia.length > 0) {
      await tx.sessionMediaBinding.updateMany({
        where: { id: { in: unboundMedia.map((m) => m.id) } },
        data: { isBound: true },
      })

      await tx.weightSession.update({
        where: { sessionId },
        data: { imageCount: { increment: unboundMedia.length } },
      })

      logger.info(
        `Reconciled ${unboundMedia.length} media bindings for session ${sessionId}`
      )
    }

    // Reconcile pending weight records if any (not strictly required but good for consistency)
    const weights = await tx.sessionWeight.findMany({
      where: { sessionId },
    })

    if (weights.length > 0 && !createdOrExisting.initialWeightKg) {
      const firstWeight = weights.sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
      )[0]
      await tx.weightSession.update({
        where: { sessionId },
        data: { initialWeightKg: firstWeight.weightKg },
      })
    }

    return createdOrExisting
  })

  // Emit sync_outbox event (idempotent by eventId).
  // Write outside the session transaction so a transient outbox failure does not roll back session persistence.
  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO sync_outbox (
        id, tenant_id, farm_id, barn_id, device_id, session_id,
        event_type, occurred_at, trace_id, payload_json,
        status, next_attempt_at, priority, attempt_count, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text,
        'weighvision.session.created', $7::timestamptz, $8::text, $9::jsonb,
        'pending', NOW(), 0, 0, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING
      `,
      eventId,
      tenantId,
      farmId,
      barnId,
      deviceId,
      sessionId,
      new Date(startAt),
      traceId || null,
      JSON.stringify({
        session_id: sessionId,
        tenant_id: tenantId,
        farm_id: farmId,
        barn_id: barnId,
        device_id: deviceId,
        station_id: stationId,
        batch_id: batchId,
        start_at: startAt,
      })
    )
  } catch (error: unknown) {
    logger.error('Failed to write sync_outbox weighvision.session.created', {
      error: errorMessage(error),
      eventId,
      traceId,
    })
  }

  return session
}

export const getSession = async (sessionId: string) => {
  return await prisma.weightSession.findUnique({
    where: { sessionId },
    include: {
      weights: {
        orderBy: { occurredAt: 'asc' },
      },
    },
  })
}

export const bindWeight = async (sessionId: string, data: BindWeightParams) => {
  const { tenantId, weightKg, occurredAt, eventId, traceId } = data

  return await prisma.$transaction(async (tx) => {
    // Create weight record (unique by tenantId + eventId handles idempotency)
    const weight = await tx.sessionWeight.upsert({
      where: { tenantId_eventId: { tenantId, eventId } },
      create: {
        sessionId,
        tenantId,
        weightKg,
        occurredAt: new Date(occurredAt),
        eventId,
        traceId,
      },
      update: {},
    })

    // Update initial weight if first
    const session = await tx.weightSession.findUnique({ where: { sessionId } })
    if (session && !session.initialWeightKg) {
      await tx.weightSession.update({
        where: { sessionId },
        data: { initialWeightKg: weightKg },
      })
    }

    return weight
  })
}

export const bindMedia = async (sessionId: string, data: BindMediaParams) => {
  const { tenantId, mediaObjectId, occurredAt, eventId, traceId } = data

  return await prisma.$transaction(async (tx) => {
    // Create media binding
    const binding = await tx.sessionMediaBinding.upsert({
      where: { tenantId_eventId: { tenantId, eventId } },
      create: {
        sessionId,
        tenantId,
        mediaObjectId,
        occurredAt: new Date(occurredAt),
        eventId,
        traceId,
        isBound: false, // Will be updated if session exists
      },
      update: {},
    })

    // Check if session exists to update imageCount
    const session = await tx.weightSession.findUnique({ where: { sessionId } })
    if (session && !binding.isBound) {
      await tx.sessionMediaBinding.update({
        where: { id: binding.id },
        data: { isBound: true },
      })

      await tx.weightSession.update({
        where: { sessionId },
        data: { imageCount: { increment: 1 } },
      })
    }

    return binding
  })
}

export const finalizeSession = async (
  sessionId: string,
  data: {
    tenantId: string
    eventId: string
    occurredAt: string
    traceId: string
  }
) => {
  const updatedSession = await prisma.$transaction(async (tx) => {
    const session = await tx.weightSession.findUnique({
      where: { sessionId },
      include: { weights: { orderBy: { occurredAt: 'desc' }, take: 1 } },
    })

    if (!session) throw new Error('Session not found')
    if (session.status === 'finalized') return session

    const finalWeight = session.weights[0]?.weightKg || session.initialWeightKg
    const endTime = new Date()

    const updatedSession = await tx.weightSession.update({
      where: { sessionId },
      data: {
        status: 'finalized',
        endAt: endTime,
        finalWeightKg: finalWeight,
      },
    })

    return updatedSession
  })

  // Emit sync_outbox finalized event (idempotent by eventId).
  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO sync_outbox (
        id, tenant_id, device_id, session_id,
        event_type, occurred_at, trace_id, payload_json,
        status, next_attempt_at, priority, attempt_count, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::text, $3::text, $4::text,
        'weighvision.session.finalized', $5::timestamptz, $6::text, $7::jsonb,
        'pending', NOW(), 0, 0, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING
      `,
      data.eventId,
      data.tenantId,
      updatedSession.deviceId,
      sessionId,
      new Date(data.occurredAt),
      data.traceId || null,
      JSON.stringify({
        session_id: sessionId,
        tenant_id: data.tenantId,
        device_id: updatedSession.deviceId,
        final_weight_kg: updatedSession.finalWeightKg,
        image_count: updatedSession.imageCount,
        end_at: updatedSession.endAt?.toISOString(),
      })
    )
  } catch (error: unknown) {
    logger.error('Failed to write sync_outbox weighvision.session.finalized', {
      error: errorMessage(error),
      eventId: data.eventId,
      traceId: data.traceId,
    })
  }

  return updatedSession
}

export const attach = async (
  sessionId: string,
  params: {
    tenantId: string
    traceId: string
    mediaId?: string
    inferenceResultId?: string
    capturedAt?: string
  }
) => {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.weightSession.findUnique({ where: { sessionId } })
    if (!session) throw new Error('Session not found')
    if (params.tenantId && session.tenantId !== params.tenantId)
      throw new Error('TENANT_MISMATCH')

    let mediaBinding: unknown = null
    if (params.mediaId) {
      const existing = await tx.sessionMediaBinding.findFirst({
        where: { sessionId, mediaObjectId: params.mediaId },
      })

      mediaBinding = await tx.sessionMediaBinding.upsert({
        where: {
          sessionId_mediaObjectId: { sessionId, mediaObjectId: params.mediaId },
        },
        create: {
          sessionId,
          tenantId: session.tenantId,
          mediaObjectId: params.mediaId,
          occurredAt: params.capturedAt
            ? new Date(params.capturedAt)
            : new Date(),
          eventId: `attach-${session.tenantId}-${params.mediaId}`,
          traceId: params.traceId,
          isBound: true,
        },
        update: { isBound: true },
      })

      if (!existing) {
        await tx.weightSession.update({
          where: { sessionId },
          data: { imageCount: { increment: 1 } },
        })
      }
    }

    let updatedSession = session
    if (params.inferenceResultId) {
      updatedSession = await tx.weightSession.update({
        where: { sessionId },
        data: { inferenceResultId: params.inferenceResultId },
      })
    }

    return {
      session: updatedSession,
      media_binding: mediaBinding,
    }
  })
}
