import { useState, useCallback } from 'react';
import { api, unwrapApiResponse } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';
import { usePolling } from './usePolling';
import type { components } from '@farmiq/api-client';

type Farm = components['schemas']['Farm'];

export const useFarmData = (farmId: string | undefined) => {
    const { tenantId } = useActiveContext();
    const [data, setData] = useState<Farm | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!farmId || !tenantId) {
            setIsLoading(false);
            return;
        }
        try {
            const response = await api.farms.get(farmId, { tenantId });
            const farm = unwrapApiResponse<any>(response);
            if (farm) {
              setData({
                ...farm,
                farm_id: farm.farm_id || (farm as any).id,
              });
            } else {
              setData(null);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch farm', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [farmId, tenantId]);

    // Poll every 30s
    usePolling(fetchData, 30000);

    return { data, isLoading, error, refetch: fetchData };
};
