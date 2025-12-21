import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

/**
 * Write an event to sync_outbox table for edge-sync-forwarder
 * @param prisma - Prisma client instance
 * @param params - Event parameters
 */
export async function writeToSyncOutbox(
  prisma: PrismaClient,
  params: {
    tenantId: string
    farmId?: string | null
    barnId?: string | null
    deviceId?: string | null
    eventType: string
    occurredAt: Date
    traceId?: string | null
    payload: Record<string, unknown>
  }
): Promise<void> {
  try {
    const payloadJson = JSON.stringify(params.payload)

    await prisma.$executeRawUnsafe(
      `INSERT INTO sync_outbox (
        id, tenant_id, farm_id, barn_id, device_id, event_type, occurred_at, trace_id, payload_json, status, next_attempt_at, priority, attempt_count, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::text,
        $2::text,
        $3::text,
        $4::text,
        $5::text,
        $6::timestamptz,
        $7::text,
        $8::jsonb,
        'pending',
        NOW(),
        0,
        0,
        NOW(),
        NOW()
      )`,
      params.tenantId,
      params.farmId || null,
      params.barnId || null,
      params.deviceId || null,
      params.eventType,
      params.occurredAt,
      params.traceId || null,
      payloadJson
    )

    logger.debug('Wrote event to sync_outbox', {
      eventType: params.eventType,
      tenantId: params.tenantId,
      traceId: params.traceId,
    })
  } catch (error) {
    logger.error('Failed to write outbox event', {
      error: error instanceof Error ? error.message : String(error),
      eventType: params.eventType,
      tenantId: params.tenantId,
      traceId: params.traceId,
    })
    throw error
  }
}

