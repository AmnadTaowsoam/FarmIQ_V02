import { useState, useCallback } from 'react';
import { api, unwrapApiResponse } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';
import { usePolling } from './usePolling';
import type { components } from '@farmiq/api-client';

export type Barn = components['schemas']['Barn'];

export const useBarns = () => {
    const { tenantId, farmId } = useActiveContext();
    const [data, setData] = useState<Barn[]>([]);
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
            const response = await api.barns.list({
                tenantId,
                farmId: farmId || undefined,
                page: 1,
                pageSize: 50,
            });
            const barns = unwrapApiResponse<any[]>(response) || [];
            const normalized = barns.map((barn) => ({
                ...barn,
                barn_id: barn.barn_id || (barn as any).id,
            }));
            setData(normalized);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch barns', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [tenantId, farmId]);

    usePolling(fetchData, 30000, true);

    return { data, isLoading, error, refetch: fetchData };
};
