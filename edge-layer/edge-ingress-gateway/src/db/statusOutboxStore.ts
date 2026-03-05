import { PrismaClient } from '@prisma/client'

export interface StatusOutboxStore {
  writeStatusEvent(params: {
    eventId: string
    tenantId: string
    farmId: string
    barnId: string
    deviceId: string
    occurredAtIso: string
    traceId?: string
    topic: string
    payload: unknown
    payloadHash?: string | null
  }): Promise<void>
}

export class PrismaStatusOutboxStore implements StatusOutboxStore {
  constructor(private readonly prisma: PrismaClient) {}

  async writeStatusEvent(params: {
    eventId: string
    tenantId: string
    farmId: string
    barnId: string
    deviceId: string
    occurredAtIso: string
    traceId?: string
    topic: string
    payload: unknown
    payloadHash?: string | null
  }): Promise<void> {
    const payloadJson = JSON.stringify({
      tenant_id: params.tenantId,
      farm_id: params.farmId,
      barn_id: params.barnId,
      device_id: params.deviceId,
      occurred_at: params.occurredAtIso,
      source_topic: params.topic,
      payload_hash: params.payloadHash ?? null,
      status_payload: params.payload,
    })

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO sync_outbox (
        id, tenant_id, farm_id, barn_id, device_id, event_type, occurred_at, trace_id,
        payload_json, payload_size_bytes, status, next_attempt_at, priority, attempt_count, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::text, $3::text, $4::text, $5::text, 'device.status', $6::timestamptz, $7::text,
        $8::jsonb, $9::int, 'pending', NOW(), 0, 0, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING
      `,
      params.eventId,
      params.tenantId,
      params.farmId,
      params.barnId,
      params.deviceId,
      params.occurredAtIso,
      params.traceId || null,
      payloadJson,
      Buffer.byteLength(payloadJson, 'utf8')
    )
  }
}
