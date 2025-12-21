import { PrismaClient, Prisma, ReportJobStatus, ReportJobType, ReportFormat } from '@prisma/client'
import { randomUUID } from 'crypto'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface CreateReportJobInput {
  tenantId: string
  requestedBy: string
  jobType: ReportJobType
  format: ReportFormat
  farmId?: string | null
  barnId?: string | null
  batchId?: string | null
  startDate?: Date | null
  endDate?: Date | null
  filters?: Record<string, unknown> | null
  idempotencyKey?: string | null
}

export async function createReportJob(input: CreateReportJobInput) {
  const jobId = randomUUID()

  try {
    const job = await prisma.reportJob.create({
      data: {
        id: jobId,
        tenantId: input.tenantId,
        requestedBy: input.requestedBy,
        jobType: input.jobType,
        format: input.format,
        farmId: input.farmId || null,
        barnId: input.barnId || null,
        batchId: input.batchId || null,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        filters: input.filters ? (input.filters as Prisma.InputJsonValue) : undefined,
        status: 'queued',
        progressPct: 0,
        idempotencyKey: input.idempotencyKey || null,
      },
    })

    return { job, created: true }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      input.idempotencyKey
    ) {
      const existing = await prisma.reportJob.findFirst({
        where: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
        },
      })
      if (existing) {
        return { job: existing, created: false }
      }
    }

    logger.error('Error creating report job', { error })
    throw error
  }
}

export async function getReportJobById(tenantId: string, jobId: string) {
  return prisma.reportJob.findFirst({
    where: {
      id: jobId,
      tenantId,
    },
  })
}

export async function listReportJobs(
  tenantId: string,
  filters?: {
    status?: ReportJobStatus
    jobType?: ReportJobType
    createdFrom?: Date
    createdTo?: Date
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.ReportJobWhereInput = {
    tenantId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.jobType ? { jobType: filters.jobType } : {}),
    ...(filters?.createdFrom || filters?.createdTo
      ? {
          createdAt: {
            ...(filters?.createdFrom ? { gte: filters.createdFrom } : {}),
            ...(filters?.createdTo ? { lte: filters.createdTo } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.reportJob.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

export async function markJobRunning(tenantId: string, jobId: string) {
  const result = await prisma.reportJob.updateMany({
    where: {
      id: jobId,
      tenantId,
      status: 'queued',
    },
    data: {
      status: 'running',
      progressPct: 0,
    },
  })

  if (result.count === 0) {
    return null
  }

  return prisma.reportJob.findFirst({
    where: { id: jobId, tenantId },
  })
}

export async function markJobSucceeded(params: {
  tenantId: string
  jobId: string
  filePath: string
  fileName: string
  mimeType: string
  sizeBytes: bigint | number
  sha256: string
}) {
  await prisma.reportJob.updateMany({
    where: { id: params.jobId, tenantId: params.tenantId },
    data: {
      status: 'succeeded',
      progressPct: 100,
      filePath: params.filePath,
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes:
        typeof params.sizeBytes === 'bigint' ? params.sizeBytes : BigInt(params.sizeBytes),
      sha256: params.sha256,
      errorCode: null,
      errorMessage: null,
    },
  })
}

export async function markJobFailed(params: {
  tenantId: string
  jobId: string
  errorCode: string
  errorMessage: string
}) {
  await prisma.reportJob.updateMany({
    where: { id: params.jobId, tenantId: params.tenantId },
    data: {
      status: 'failed',
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
  })
}

export async function updateJobExpiry(params: {
  tenantId: string
  jobId: string
  expiresAt: Date
}) {
  await prisma.reportJob.updateMany({
    where: { id: params.jobId, tenantId: params.tenantId },
    data: {
      expiresAt: params.expiresAt,
    },
  })
}

export async function prismaDisconnect() {
  await prisma.$disconnect()
}

export async function prismaConnect() {
  await prisma.$connect()
}

export function getPrismaClient() {
  return prisma
}
