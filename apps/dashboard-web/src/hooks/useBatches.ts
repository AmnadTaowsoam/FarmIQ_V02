import { useCallback, useState } from 'react';
import { api, unwrapApiResponse } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';
import { usePolling } from './usePolling';
import type { components } from '@farmiq/api-client';

export type Batch = components['schemas']['Batch'];

export const useBatches = (options?: { farmId?: string; barnId?: string }) => {
  const { tenantId, farmId, barnId } = useActiveContext();
  const effectiveFarmId = options?.farmId ?? farmId ?? undefined;
  const effectiveBarnId = options?.barnId ?? barnId ?? undefined;
  const [data, setData] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.batches.list({
        tenantId,
        farmId: effectiveFarmId,
        barnId: effectiveBarnId,
        page: 1,
        pageSize: 50,
      });
      const batches = unwrapApiResponse<Batch[]>(response) || [];
      setData(batches);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, effectiveFarmId, effectiveBarnId]);

  usePolling(fetchData, 30000, true);

  return { data, isLoading, error, refetch: fetchData };
};
