import { PrismaClient } from '@prisma/client'

export interface DedupeStore {
  /**
   * @returns true if this event_id is new for the tenant, false if it is a duplicate.
   */
  tryMarkSeen(params: {
    tenantId: string
    eventId: string
    topic: string
    payloadHash?: string
    ttlMs: number
  }): Promise<boolean>

  /**
   * Best-effort cleanup for TTL-based dedupe.
   */
  cleanupExpired(): Promise<number>
}

export class PrismaDedupeStore implements DedupeStore {
  constructor(private readonly prisma: PrismaClient) {}

  async tryMarkSeen(params: {
    tenantId: string
    eventId: string
    topic: string
    payloadHash?: string
    ttlMs: number
  }): Promise<boolean> {
    const expiresAtIso = new Date(Date.now() + params.ttlMs).toISOString()

    const rows = await this.prisma.$queryRaw<
      Array<{ tenant_id: string }>
    >`INSERT INTO ingress_dedupe (tenant_id, event_id, first_seen_at, expires_at, topic, hash)
      VALUES (${params.tenantId}, ${params.eventId}, NOW(), ${expiresAtIso}::timestamptz, ${params.topic}, ${params.payloadHash ?? null})
      ON CONFLICT (tenant_id, event_id)
      DO UPDATE SET
        first_seen_at = EXCLUDED.first_seen_at,
        expires_at = EXCLUDED.expires_at,
        topic = EXCLUDED.topic,
        hash = EXCLUDED.hash
      WHERE ingress_dedupe.expires_at <= NOW()
      RETURNING tenant_id`

    // If we inserted or updated an expired record we get a row back.
    // If the record exists and is not expired, no row is returned -> duplicate.
    return rows.length > 0
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.ingressDedupe.deleteMany({
      where: { expires_at: { lt: new Date() } },
    })
    return result.count
  }
}

export class InMemoryDedupeStore implements DedupeStore {
  private readonly seen = new Set<string>()

  async tryMarkSeen(params: {
    tenantId: string
    eventId: string
    topic: string
    payloadHash?: string
    ttlMs: number
  }): Promise<boolean> {
    const key = `${params.tenantId}:${params.eventId}`
    if (this.seen.has(key)) return false
    this.seen.add(key)
    return true
  }

  async cleanupExpired(): Promise<number> {
    return 0
  }
}
