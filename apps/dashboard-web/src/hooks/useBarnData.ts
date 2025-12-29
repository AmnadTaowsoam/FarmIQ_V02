import { useState, useCallback } from 'react';
import { api, unwrapApiResponse } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';
import { usePolling } from './usePolling';
import type { components } from '@farmiq/api-client';

type Barn = components['schemas']['Barn'];

export const useBarnData = (barnId: string | undefined) => {
    const { tenantId } = useActiveContext();
    const [data, setData] = useState<Barn | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!barnId || !tenantId) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.barns.get(barnId, { tenantId });
            const barn = unwrapApiResponse<any>(response);
            if (barn) {
              setData({
                ...barn,
                barn_id: barn.barn_id || (barn as any).id,
              });
            } else {
              setData(null);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch barn', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [barnId, tenantId]);

    usePolling(fetchData, 30000);

    return { data, isLoading, error, refetch: fetchData };
};
