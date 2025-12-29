import { z } from 'zod';
import { logger } from '../../utils/logger';
import { getLastRequestId } from '../../hooks/useRequestId';

export class ContractError extends Error {
  constructor(
    message: string,
    public readonly schema: string,
    public readonly errors: z.ZodError,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

/**
 * Validate API response against Zod schema
 */
export const validateResponse = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  schemaName: string
): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const requestId = getLastRequestId();
      logger.error('Data contract validation failed', error, {
        schema: schemaName,
        requestId: requestId ?? undefined,
        errors: error.errors,
      });
      throw new ContractError(
        `Data contract mismatch for ${schemaName}`,
        schemaName,
        error,
        requestId ?? undefined,
      );
    }
    throw error;
  }
};


/**
 * Safe validation that returns null on failure instead of throwing
 */
export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn('Safe validation failed', {
      errors: result.error.errors,
    });
  }
  return result;
};

