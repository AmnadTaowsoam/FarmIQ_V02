import { PrismaClient } from '@prisma/client'

export interface LastSeenStore {
  upsertLastSeen(params: {
    tenantId: string
    deviceId: string
    lastSeenAtIso: string
    topic: string
    payloadHash?: string | null
  }): Promise<void>
}

export class PrismaLastSeenStore implements LastSeenStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertLastSeen(params: {
    tenantId: string
    deviceId: string
    lastSeenAtIso: string
    topic: string
    payloadHash?: string | null
  }): Promise<void> {
    await this.prisma.deviceLastSeen.upsert({
      where: {
        tenant_id_device_id: {
          tenant_id: params.tenantId,
          device_id: params.deviceId,
        },
      },
      create: {
        tenant_id: params.tenantId,
        device_id: params.deviceId,
        last_seen_at: new Date(params.lastSeenAtIso),
        last_topic: params.topic,
        last_payload_hash: params.payloadHash ?? null,
      },
      update: {
        last_seen_at: new Date(params.lastSeenAtIso),
        last_topic: params.topic,
        last_payload_hash: params.payloadHash ?? null,
      },
    })
  }
}
