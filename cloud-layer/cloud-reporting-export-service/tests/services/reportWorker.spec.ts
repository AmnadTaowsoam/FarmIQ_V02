import fs from 'fs'
import os from 'os'
import path from 'path'

jest.mock('../../src/services/reportJobService', () => ({
  markJobRunning: jest.fn().mockResolvedValue({ id: 'job-1' }),
  markJobSucceeded: jest.fn().mockResolvedValue(undefined),
  markJobFailed: jest.fn().mockResolvedValue(undefined),
}))

import { processReportJobMessage } from '../../src/services/reportWorker'
import { markJobSucceeded } from '../../src/services/reportJobService'

const mockFetch = jest.fn()

describe('reportWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = mockFetch
  })

  it('processes a feed intake export and writes a file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-export-'))
    process.env.EXPORT_ROOT = tmpDir

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'rec-1',
            tenantId: 'tenant-1',
            farmId: 'farm-1',
            barnId: 'barn-1',
            batchId: null,
            deviceId: null,
            source: 'MANUAL',
            feedFormulaId: null,
            feedLotId: null,
            quantityKg: '10.5',
            occurredAt: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
            ingestedAt: null,
            eventId: null,
            externalRef: null,
            idempotencyKey: null,
            sequence: null,
            notes: null,
            createdByUserId: null,
          },
        ],
        nextCursor: null,
      }),
    })

    const payload = {
      job_id: 'job-1',
      tenant_id: 'tenant-1',
      job_type: 'FEED_INTAKE_EXPORT',
      format: 'csv',
      scope: {
        farm_id: 'farm-1',
      },
      requested_by: 'user-1',
    }

    const msg = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: {
        timestamp: Date.now(),
      },
    } as any

    await processReportJobMessage(msg)

    const expectedPath = path.join(tmpDir, 'tenant-1', 'job-1', 'report.csv')
    expect(fs.existsSync(expectedPath)).toBe(true)

    const contents = fs.readFileSync(expectedPath, 'utf8')
    expect(contents).toContain('quantity_kg')
    expect(contents).toContain('10.5')

    expect(markJobSucceeded).toHaveBeenCalled()
  })
})
