import { PrismaClient } from '@prisma/client'

export interface LastSeenStore {
  upsertLastSeen(params: {
    tenantId: string
    deviceId: string
    observedAtIso: string
    reportedAtIso?: string | null
    topic: string
    payloadHash?: string | null
  }): Promise<void>
}

export class PrismaLastSeenStore implements LastSeenStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertLastSeen(params: {
    tenantId: string
    deviceId: string
    observedAtIso: string
    reportedAtIso?: string | null
    topic: string
    payloadHash?: string | null
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO device_last_seen (
        tenant_id, device_id, last_seen_at, device_reported_at, last_topic, last_payload_hash, updated_at
      )
      VALUES (
        $1::text, $2::text, $3::timestamptz, $4::timestamptz, $5::text, $6::text, NOW()
      )
      ON CONFLICT (tenant_id, device_id) DO UPDATE
      SET
        last_seen_at = EXCLUDED.last_seen_at,
        device_reported_at = EXCLUDED.device_reported_at,
        last_topic = EXCLUDED.last_topic,
        last_payload_hash = EXCLUDED.last_payload_hash,
        updated_at = NOW()`,
      params.tenantId,
      params.deviceId,
      params.observedAtIso,
      params.reportedAtIso ?? null,
      params.topic,
      params.payloadHash ?? null
    )
  }
}
