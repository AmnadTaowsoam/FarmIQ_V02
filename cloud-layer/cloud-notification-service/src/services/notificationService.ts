import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export function getPrismaClient(): PrismaClient {
  return prisma
}

export async function prismaConnect(): Promise<void> {
  await prisma.$connect()
}

export async function prismaDisconnect(): Promise<void> {
  await prisma.$disconnect()
}

export interface NotificationTargetInput {
  type: 'user' | 'role' | 'topic'
  value: string
}

export interface CreateNotificationInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  batchId?: string | null
  severity: 'info' | 'warning' | 'critical'
  channel: 'in_app' | 'webhook' | 'email' | 'sms'
  title: string
  message: string
  payload?: Record<string, unknown>
  targets?: NotificationTargetInput[]
  externalRef?: string | null
  dedupeKey?: string | null
  idempotencyKey?: string | null
  createdBy?: string | null
}

export interface NotificationListFilters {
  farmId?: string
  barnId?: string
  batchId?: string
  severity?: 'info' | 'warning' | 'critical'
  channel?: 'in_app' | 'webhook' | 'email' | 'sms'
  status?: 'created' | 'queued' | 'sent' | 'failed' | 'canceled'
  startDate?: Date
  endDate?: Date
  cursor?: string
  limit?: number
}

export interface InboxFilters {
  userId?: string
  roles?: string[]
  topics?: string[]
  cursor?: string
  limit?: number
}

export async function findNotificationById(tenantId: string, id: string) {
  return prisma.notification.findFirst({
    where: {
      tenantId,
      id,
    },
  })
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    if (input.idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: {
          notifications_tenant_idempotency_key: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      })

      if (existing) {
        return { notification: existing, wasDuplicate: true }
      }
    }

    if (input.externalRef) {
      const existing = await prisma.notification.findUnique({
        where: {
          notifications_tenant_external_ref: {
            tenantId: input.tenantId,
            externalRef: input.externalRef,
          },
        },
      })

      if (existing) {
        return { notification: existing, wasDuplicate: true }
      }
    }

    const status = input.channel === 'in_app' ? 'sent' : 'queued'

    const notification = await prisma.$transaction(async (tx) => {
      const created = await tx.notification.create({
        data: {
          tenantId: input.tenantId,
          farmId: input.farmId || null,
          barnId: input.barnId || null,
          batchId: input.batchId || null,
          severity: input.severity,
          channel: input.channel,
          title: input.title,
          message: input.message,
          payloadJson: input.payload ? (input.payload as Prisma.InputJsonValue) : undefined,
          status,
          dedupeKey: input.dedupeKey || null,
          idempotencyKey: input.idempotencyKey || null,
          externalRef: input.externalRef || null,
          createdBy: input.createdBy || null,
        },
      })

      if (input.targets && input.targets.length > 0) {
        await tx.notificationTarget.createMany({
          data: input.targets.map((target) => ({
            tenantId: input.tenantId,
            notificationId: created.id,
            targetType: target.type,
            targetValue: target.value,
          })),
        })
      }

      if (input.channel === 'in_app') {
        await tx.notificationDeliveryAttempt.create({
          data: {
            tenantId: input.tenantId,
            notificationId: created.id,
            attemptNo: 1,
            provider: 'in_app',
            status: 'success',
          },
        })
      }

      return created
    })

    return { notification, wasDuplicate: false }
  } catch (error) {
    logger.error('Error creating notification', error)
    throw error
  }
}

export async function listNotifications(tenantId: string, filters?: NotificationListFilters) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.NotificationWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.batchId ? { batchId: filters.batchId } : {}),
    ...(filters?.severity ? { severity: filters.severity } : {}),
    ...(filters?.channel ? { channel: filters.channel } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.startDate || filters?.endDate
      ? {
          createdAt: {
            ...(filters?.startDate ? { gte: filters.startDate } : {}),
            ...(filters?.endDate ? { lte: filters.endDate } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.notification.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

export async function listInboxNotifications(tenantId: string, filters?: InboxFilters) {
  const limit = Math.min(filters?.limit || 25, 100)
  const matchers: Prisma.NotificationWhereInput[] = []

  if (filters?.userId) {
    matchers.push({
      targets: {
        some: {
          targetType: 'user',
          targetValue: filters.userId,
        },
      },
    })
  }

  if (filters?.roles && filters.roles.length > 0) {
    matchers.push({
      targets: {
        some: {
          targetType: 'role',
          targetValue: { in: filters.roles },
        },
      },
    })
  }

  if (filters?.topics && filters.topics.length > 0) {
    matchers.push({
      targets: {
        some: {
          targetType: 'topic',
          targetValue: { in: filters.topics },
        },
      },
    })
  }

  if (matchers.length === 0) {
    return { items: [], nextCursor: null }
  }

  const items = await prisma.notification.findMany({
    where: {
      tenantId,
      channel: 'in_app',
      OR: matchers,
    },
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

export async function recordDeliveryAttempt(params: {
  tenantId: string
  notificationId: string
  attemptNo: number
  provider: 'in_app' | 'webhook' | 'email' | 'sms'
  status: 'success' | 'fail' | 'retrying'
  destination?: string | null
  errorMessage?: string | null
  responseCode?: number | null
}) {
  return prisma.notificationDeliveryAttempt.create({
    data: {
      tenantId: params.tenantId,
      notificationId: params.notificationId,
      attemptNo: params.attemptNo,
      provider: params.provider,
      status: params.status,
      destination: params.destination || null,
      errorMessage: params.errorMessage || null,
      responseCode: params.responseCode || null,
    },
  })
}

export async function updateNotificationStatus(
  tenantId: string,
  notificationId: string,
  status: 'created' | 'queued' | 'sent' | 'failed' | 'canceled'
) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
    },
    data: {
      status,
    },
  })
}
