import { v4 as uuidv4 } from 'uuid';
import { apiClient } from './client';

export type BarnRecordsContext = {
  tenantId: string;
  farmId?: string | null;
  barnId?: string | null;
  batchId?: string | null;
};

export type BarnRecordsListResponse<T> = {
  items: T[];
  nextCursor?: string | null;
};

export type BarnRecordsError = {
  message: string;
  status?: number;
  code?: string;
  traceId?: string;
  requestId?: string;
  isServiceUnavailable?: boolean;
};

const API_PREFIX = '/v1/barn-records';

const buildParams = (context: BarnRecordsContext, params?: Record<string, string | number | boolean | null | undefined>) => ({
  tenantId: context.tenantId,
  farmId: context.farmId || undefined,
  barnId: context.barnId || undefined,
  batchId: context.batchId || undefined,
  ...params,
});

const normalizeList = <T>(payload: any): BarnRecordsListResponse<T> => {
  if (!payload) return { items: [] };
  if (Array.isArray(payload.items)) {
    return { items: payload.items, nextCursor: payload.nextCursor ?? payload.next_cursor ?? null };
  }
  if (payload.data && Array.isArray(payload.data.items)) {
    return { items: payload.data.items, nextCursor: payload.data.nextCursor ?? payload.data.next_cursor ?? null };
  }
  if (Array.isArray(payload.data)) {
    return { items: payload.data, nextCursor: payload.nextCursor ?? payload.next_cursor ?? null };
  }
  return { items: [] };
};

const toError = (error: any): BarnRecordsError => {
  const response = error?.response || error?.originalError?.response;
  const status = response?.status || error?.status;
  const data = response?.data;
  const traceId = data?.error?.traceId || error?.traceId;
  const requestId = (window as any)?.__lastRequestId;
  const message = data?.error?.message || error?.message || 'Unexpected error';
  return {
    message,
    status,
    code: data?.error?.code || error?.code,
    traceId,
    requestId,
    isServiceUnavailable: status === 404 || status === 503,
  };
};

export const barnRecordsApi = {
  async listRecords<T>(
    resource: string,
    context: BarnRecordsContext,
    params?: Record<string, string | number | boolean | null | undefined>
  ): Promise<BarnRecordsListResponse<T>> {
    try {
      const response = await apiClient.get(`${API_PREFIX}/${resource}`, {
        params: buildParams(context, params),
      });
      return normalizeList<T>(response.data);
    } catch (error) {
      throw toError(error);
    }
  },

  async createRecord<T>(
    resource: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    try {
      const idempotencyKey = uuidv4();
      const response = await apiClient.post(`${API_PREFIX}/${resource}`, payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      return response.data as T;
    } catch (error) {
      throw toError(error);
    }
  },
};
