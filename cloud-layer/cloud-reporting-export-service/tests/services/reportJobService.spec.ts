import { PrismaClient } from '@prisma/client'
import { createReportJob } from '../../src/services/reportJobService'

jest.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(code: string) {
      super('Prisma error')
      this.code = code
    }
  }

  const mockPrismaClient = {
    reportJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  }

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      JsonNull: null,
      PrismaClientKnownRequestError,
    },
  }
})

describe('reportJobService', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  it('creates a report job', async () => {
    const mockJob = {
      id: 'job-1',
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      jobType: 'FEED_INTAKE_EXPORT',
      format: 'csv',
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.reportJob.create as jest.Mock).mockResolvedValue(mockJob)

    const result = await createReportJob({
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      jobType: 'FEED_INTAKE_EXPORT',
      format: 'csv',
    })

    expect(result.created).toBe(true)
    expect(result.job).toBe(mockJob)
  })

  it('returns existing job on idempotency hit', async () => {
    const existingJob = {
      id: 'job-2',
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      jobType: 'FEED_INTAKE_EXPORT',
      format: 'csv',
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const Prisma = jest.requireMock('@prisma/client').Prisma
    ;(prisma.reportJob.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('P2002')
    )
    ;(prisma.reportJob.findFirst as jest.Mock).mockResolvedValue(existingJob)

    const result = await createReportJob({
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      jobType: 'FEED_INTAKE_EXPORT',
      format: 'csv',
      idempotencyKey: 'idem-1',
    })

    expect(result.created).toBe(false)
    expect(result.job).toBe(existingJob)
    expect(prisma.reportJob.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', idempotencyKey: 'idem-1' },
    })
  })
})
