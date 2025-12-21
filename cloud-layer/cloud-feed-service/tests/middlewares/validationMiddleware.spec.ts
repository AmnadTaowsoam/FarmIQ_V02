import { feedIntakeRecordSchema, feedLotSchema, feedFormulaSchema } from '../../src/middlewares/validationMiddleware'

describe('Validation Schemas', () => {
  describe('feedIntakeRecordSchema', () => {
    it('should validate a valid intake record', () => {
      const valid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        source: 'MANUAL',
        quantityKg: 100.5,
        occurredAt: '2025-01-02T06:00:00Z',
      }

      const result = feedIntakeRecordSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject negative quantity', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        source: 'MANUAL',
        quantityKg: -10,
        occurredAt: '2025-01-02T06:00:00Z',
      }

      const result = feedIntakeRecordSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('quantityKg')
      }
    })

    it('should reject invalid source enum', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        source: 'INVALID_SOURCE',
        quantityKg: 100.5,
        occurredAt: '2025-01-02T06:00:00Z',
      }

      const result = feedIntakeRecordSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('feedLotSchema', () => {
    it('should validate a valid lot', () => {
      const valid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        lotCode: 'LOT-001',
        quantityKg: 1000,
      }

      const result = feedLotSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject negative quantity', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        lotCode: 'LOT-001',
        quantityKg: -100,
      }

      const result = feedLotSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('feedFormulaSchema', () => {
    it('should validate a valid formula', () => {
      const valid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        name: 'Starter Feed',
        species: 'broiler',
        proteinPct: 22.5,
      }

      const result = feedFormulaSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject protein > 100%', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        name: 'Starter Feed',
        proteinPct: 150,
      }

      const result = feedFormulaSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })
})

