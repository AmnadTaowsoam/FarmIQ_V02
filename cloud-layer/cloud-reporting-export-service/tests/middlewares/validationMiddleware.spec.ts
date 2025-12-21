import { reportJobCreateSchema } from '../../src/middlewares/validationMiddleware'

describe('reportJobCreateSchema', () => {
  it('accepts a valid payload', () => {
    const result = reportJobCreateSchema.parse({
      job_type: 'FEED_INTAKE_EXPORT',
      format: 'csv',
      farm_id: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      filters: { source: 'MANUAL' },
      idempotency_key: 'test-key',
    })

    expect(result.job_type).toBe('FEED_INTAKE_EXPORT')
  })

  it('rejects end_date before start_date', () => {
    expect(() =>
      reportJobCreateSchema.parse({
        job_type: 'FEED_INTAKE_EXPORT',
        format: 'csv',
        start_date: '2025-02-01',
        end_date: '2025-01-01',
      })
    ).toThrow(/end_date must be on or after start_date/)
  })
})
