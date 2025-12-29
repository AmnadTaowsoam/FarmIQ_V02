import { apiClient, isMockMode } from './index';
import { ActiveContextType } from '../contexts/ActiveContext';
import { validateResponse, ContractError } from '../lib/api/contractValidator';
import { logger } from '../utils/logger';
import { z } from 'zod';

export interface BFFQueryParams {
  tenant_id?: string | null;
  farm_id?: string | null;
  barn_id?: string | null;
  batch_id?: string | null;
  device_id?: string | null;
  station_id?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface BFFErrorResponse {
  error: {
    message: string;
    code: string;
    traceId?: string;
  };
}

// Build query params from context and additional params
export const buildQueryParams = (
  context: Partial<ActiveContextType>,
  additionalParams?: Record<string, string | number | boolean | null | undefined>
): BFFQueryParams => {
  const params: BFFQueryParams = {};

  // tenant_id is handled by ApiClient via getTenantId(), but we can pass it explicitly too
  if (context.tenantId) params.tenant_id = context.tenantId;
  if (context.farmId) params.farm_id = context.farmId;
  if (context.barnId) params.barn_id = context.barnId;
  if (context.batchId) params.batch_id = context.batchId;

  if (additionalParams) {
    Object.assign(params, additionalParams);
  }

  return params;
};

// BFF API call wrapper with schema validation
export const bffRequest = async <T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  context: Partial<ActiveContextType>,
  options?: {
    params?: BFFQueryParams;
    body?: unknown;
    headers?: Record<string, string>;
    schema?: z.ZodSchema<T>;
  }
): Promise<T> => {
  // Merge context params
  const query = buildQueryParams(context, options?.params);

  const requestId = (window as any)?.__lastRequestId || null;

  try {
    // Cast method to strict type expected by ApiClient if needed, or assume compatible string
    const response = await apiClient.request<T>({
      method,
      url: path,
      params: query as Record<string, unknown>,
      data: options?.body,
      headers: options?.headers,
    });

    // Validate response against schema if provided
    if (options?.schema) {
      try {
        return validateResponse(options.schema, response, path);
      } catch (error) {
        if (error instanceof ContractError) {
          logger.error('Contract validation failed', error, { path, requestId });
          throw error;
        }
        throw error;
      }
    }

    return response.data;
  } catch (error: any) {
    // Flatten ApiError to Error
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(error.message);
    }
    throw error;
  }
};

// Mock data helper
export const getMockData = <T>(mockFn: () => T): T => {
  if (isMockMode()) {
    console.warn('[MOCK MODE] Using mock data for API call');
    return mockFn();
  }
  // Fallback for missing endpoints even in real mode?
  // User asked to "Turn off mock progressively... For any endpoint still missing on BE, keep graceful fallback"
  // If we are here, it means the CALLER decided to call getMockData. 
  // If the caller calls bffRequest, they get real data (checked above).
  // So if code is:
  // try { data = await bffRequest(...) } catch { data = getMockData(...) } -> This is the pattern.
  // OR:
  // if (isMockMode()) getMockData() else bffRequest()

  // If strict real mode is on, we throw?
  console.warn('[MOCK FALLBACK] Mock mode is disabled but mock data was requested. Returning mock data as fallback.');
  return mockFn();
};
