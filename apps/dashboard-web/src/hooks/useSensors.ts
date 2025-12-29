import { useState, useCallback } from 'react';
import { useActiveContext } from '../contexts/ActiveContext';
import { api } from '../api';
import { usePolling } from './usePolling';
import type { components } from '@farmiq/api-client';

export type TelemetrySensor = components['schemas']['TelemetrySensor'];

export const useSensors = () => {
    const { tenantId, barnId } = useActiveContext();
    const [sensors, setSensors] = useState<TelemetrySensor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSensors = useCallback(async () => {
        if (!tenantId || !barnId) {
            setSensors([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await api.telemetryLatest({
                tenantId: tenantId,
                barn_id: barnId,
            });
            setSensors(response.data?.sensors || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch sensors');
        } finally {
            setLoading(false);
        }
    }, [tenantId, barnId]);

    usePolling(fetchSensors, 30000, true);

    return { sensors, loading, error, refetch: fetchSensors };
};
