import { apiClient } from '../../api/client';
import { v4 as uuidv4 } from 'uuid';

export type ApiContext = {
  tenantId: string;
  farmId?: string | null;
  barnId?: string | null;
  batchId?: string | null;
};

export type ListResponse<T> = {
  items: T[];
  nextCursor?: string | null;
};

type RequestParams = Record<string, string | number | boolean | null | undefined>;

const API_PREFIX = '/api/v1';

const buildParams = (context: ApiContext, extra?: RequestParams): RequestParams => ({
  tenantId: context.tenantId,
  farmId: context.farmId || undefined,
  barnId: context.barnId || undefined,
  batchId: context.batchId || undefined,
  ...extra,
});

const normalizeList = <T>(payload: any): ListResponse<T> => {
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

const request = async <T>(
  method: 'GET' | 'POST',
  path: string,
  options?: { params?: RequestParams; body?: unknown; headers?: Record<string, string> }
): Promise<T> => {
  const response = await apiClient.request<T>({
    method,
    url: `${API_PREFIX}${path}`,
    params: options?.params,
    data: options?.body,
    headers: options?.headers,
  });
  return response.data;
};

export const createIdempotencyKey = () => uuidv4();

export const feedingApi = {
  async getKpiFeeding(context: ApiContext, params: { startDate: string; endDate: string }) {
    return request<any>('GET', '/kpi/feeding', {
      params: buildParams(context, params),
    });
  },

  async listIntakeRecords(
    context: ApiContext,
    params: { startDate?: string; endDate?: string; limit?: number; cursor?: string }
  ): Promise<ListResponse<any>> {
    const payload = await request<any>('GET', '/feed/intake-records', {
      params: buildParams(context, params),
    });
    return normalizeList(payload);
  },

  async createIntakeRecord(payload: any, idempotencyKey: string) {
    return request<any>('POST', '/feed/intake-records', {
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async listLots(
    context: ApiContext,
    params: { limit?: number; cursor?: string }
  ): Promise<ListResponse<any>> {
    const payload = await request<any>('GET', '/feed/lots', {
      params: buildParams(context, params),
    });
    return normalizeList(payload);
  },

  async createLot(payload: any, idempotencyKey: string) {
    return request<any>('POST', '/feed/lots', {
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async listDeliveries(
    context: ApiContext,
    params: { limit?: number; cursor?: string }
  ): Promise<ListResponse<any>> {
    const payload = await request<any>('GET', '/feed/deliveries', {
      params: buildParams(context, params),
    });
    return normalizeList(payload);
  },

  async createDelivery(payload: any, idempotencyKey: string) {
    return request<any>('POST', '/feed/deliveries', {
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async listQualityResults(
    context: ApiContext,
    params: { limit?: number; cursor?: string }
  ): Promise<ListResponse<any>> {
    const payload = await request<any>('GET', '/feed/quality-results', {
      params: buildParams(context, params),
    });
    return normalizeList(payload);
  },

  async createQualityResult(payload: any, idempotencyKey: string) {
    return request<any>('POST', '/feed/quality-results', {
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async listPrograms(
    context: ApiContext,
    params: { limit?: number; cursor?: string }
  ): Promise<ListResponse<any>> {
    const payload = await request<any>('GET', '/feed/programs', {
      params: buildParams(context, params),
    });
    return normalizeList(payload);
  },

  async createProgram(payload: any, idempotencyKey: string) {
    return request<any>('POST', '/feed/programs', {
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
