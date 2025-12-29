import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateResponse, ContractError, safeValidate } from '../contractValidator';

describe('ContractValidator', () => {
  const TestSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    count: z.number().int().positive(),
  });

  describe('validateResponse', () => {
    it('should validate correct data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        count: 5,
      };

      const result = validateResponse(TestSchema, validData, 'TestSchema');
      expect(result).toEqual(validData);
    });

    it('should throw ContractError for invalid data', () => {
      const invalidData = {
        id: 'not-a-uuid',
        name: 'Test',
        count: -5, // Invalid: not positive
      };

      expect(() => {
        validateResponse(TestSchema, invalidData, 'TestSchema');
      }).toThrow(ContractError);
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        count: 5,
      };

      const result = safeValidate(TestSchema, validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error for invalid data', () => {
      const invalidData = {
        id: 'not-a-uuid',
        name: 'Test',
        count: -5,
      };

      const result = safeValidate(TestSchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });
  });
});

