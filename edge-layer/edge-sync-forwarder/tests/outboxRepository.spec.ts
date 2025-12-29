import { OutboxRepository } from '../src/services/outboxRepository'

class FakeQueryRunner {
  public connected = false
  public committed = false
  public rolledBack = false
  public queries: Array<{ sql: string; params: unknown[] }> = []
  constructor(private readonly rows: unknown[]) {}

  async connect() {
    this.connected = true
  }

  async startTransaction() {
    return undefined
  }

  async commitTransaction() {
    this.committed = true
  }

  async rollbackTransaction() {
    this.rolledBack = true
  }

  async release() {
    return undefined
  }

  manager = {
    query: async (sql: string, params: unknown[]) => {
      this.queries.push({ sql, params })
      return this.rows
    },
  }
}

class FakeDataSource {
  private readonly queryRunner: FakeQueryRunner
  constructor(private readonly rows: unknown[]) {
    this.queryRunner = new FakeQueryRunner(rows)
  }
  createQueryRunner() {
    return this.queryRunner
  }
  getQueryRunner() {
    return this.queryRunner
  }
}

describe('OutboxRepository.claimBatch', () => {
  it('uses FOR UPDATE SKIP LOCKED and returns claimed rows', async () => {
    const rows = [
      {
        id: '1',
        tenant_id: 't-1',
        event_type: 'event.a',
        payload_json: {},
        status: 'pending',
        attempt_count: 0,
      },
      {
        id: '2',
        tenant_id: 't-1',
        event_type: 'event.b',
        payload_json: {},
        status: 'pending',
        attempt_count: 0,
      },
    ]
    const dataSource = new FakeDataSource(rows) as any
    const repo = new OutboxRepository(dataSource, 'worker-1')

    const claimed = await repo.claimBatch(2, 120)

    expect(claimed.map((row) => row.id)).toEqual(['1', '2'])
    const query = (dataSource as any).getQueryRunner().queries?.[0]
    expect(query?.sql || '').toContain('FOR UPDATE SKIP LOCKED')
  })
})
