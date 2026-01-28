import { useState, useCallback } from 'react';
import { useActiveContext } from '../contexts/ActiveContext';
import { api, unwrapApiResponse } from '../api';
import { usePolling } from './usePolling';
import type { components } from '@farmiq/api-client';

export type FeedDailyPoint = components['schemas']['FeedingDailyPoint'];

export const useFeeding = () => {
    const { tenantId, barnId, farmId, batchId, timeRange } = useActiveContext();
    const [dailyData, setDailyData] = useState<FeedDailyPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFeedingData = useCallback(async () => {
        if (!tenantId) {
            setDailyData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const startDate = timeRange.start.toISOString().slice(0, 10);
            const endDate = timeRange.end.toISOString().slice(0, 10);
            const response = await api.feeding.daily({
                tenant_id: tenantId,
                farm_id: farmId || undefined,
                barn_id: barnId || undefined,
                batch_id: batchId || undefined,
                start_date: startDate,
                end_date: endDate,
            });

            const data = unwrapApiResponse<any>(response);
            setDailyData(data?.daily_feed || data || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch feeding data');
        } finally {
            setLoading(false);
        }
    }, [tenantId, farmId, barnId, batchId, timeRange.start, timeRange.end]);

    usePolling(fetchFeedingData, 60000, true);

    return { dailyData, loading, error, refetch: fetchFeedingData };
};
