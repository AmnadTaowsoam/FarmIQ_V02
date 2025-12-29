import { SyncForwarder } from '../src/services/syncForwarder'
import { SyncConfig } from '../src/config'
import { OutboxRow } from '../src/services/outboxRepository'

describe('SyncForwarder', () => {
  const config: SyncConfig = {
    batchSize: 10,
    leaseSeconds: 120,
    maxAttempts: 3,
    backoffCapSeconds: 60,
    syncIntervalMs: 1000,
  }

  it('moves to DLQ when attempts exceed max', async () => {
    const row: OutboxRow = {
      id: 'outbox-1',
      tenantId: 't-1',
      eventType: 'telemetry.ingested',
      payload_json: { value: 1 },
      attemptCount: 2,
      status: 'claimed',
    } as OutboxRow

    const repo = {
      claimBatch: jest.fn().mockResolvedValue([row]),
      markSent: jest.fn(),
      markFailed: jest.fn(),
      insertDlq: jest.fn(),
      markDead: jest.fn(),
    }

    const forwarder = new SyncForwarder(
      repo as any,
      config,
      'http://cloud-ingestion:3000/api/v1/edge/batch',
      'worker-1'
    )

    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => 'failed',
    })

    await forwarder.runOnce()

    expect(repo.insertDlq).toHaveBeenCalled()
    expect(repo.markDead).toHaveBeenCalled()
    expect(repo.markFailed).not.toHaveBeenCalled()
  })
})
