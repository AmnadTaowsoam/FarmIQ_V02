import { morbidityEventSchema, dailyCountSchema, welfareCheckSchema } from '../../src/middlewares/validationMiddleware'

describe('Validation Schemas', () => {
  describe('morbidityEventSchema', () => {
    it('should validate a valid morbidity event', () => {
      const valid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        occurredAt: '2025-01-02T06:00:00Z',
        diseaseCode: 'coccidiosis',
        severity: 'medium',
        animalCount: 20,
      }

      const result = morbidityEventSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject negative animal count', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        occurredAt: '2025-01-02T06:00:00Z',
        animalCount: -5,
      }

      const result = morbidityEventSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('animalCount')
      }
    })
  })

  describe('dailyCountSchema', () => {
    it('should validate a valid daily count', () => {
      const valid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        recordDate: '2025-01-02',
        animalCount: 1000,
        averageWeightKg: 2.5,
      }

      const result = dailyCountSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject negative animal count', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        recordDate: '2025-01-02',
        animalCount: -100,
      }

      const result = dailyCountSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('welfareCheckSchema', () => {
    it('should validate a valid welfare check', () => {
      const valid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        occurredAt: '2025-01-02T06:00:00Z',
        gaitScore: 2,
        lesionScore: 1,
        behaviorScore: 3,
      }

      const result = welfareCheckSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject score > 5', () => {
      const invalid = {
        tenantId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001',
        farmId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002',
        barnId: '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003',
        occurredAt: '2025-01-02T06:00:00Z',
        gaitScore: 10,
      }

      const result = welfareCheckSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('gaitScore')
      }
    })
  })
})

