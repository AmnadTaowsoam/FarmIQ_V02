import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrapApiResponse } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';
// import { usePolling } from './usePolling'; // No longer needed
import type { components } from '@farmiq/api-client';


type OverviewResponse = components['schemas']['DashboardOverviewResponse'];
type Alert = components['schemas']['Alert'];
type WeightTrend = components['schemas']['WeightTrend'];

export interface DashboardData {
    kpis: Record<string, number>;
    recentAlerts: Alert[];
    recentActivity: components['schemas']['RecentActivity'][];
    weightTrend: WeightTrend[];
}

export const useDashboard = () => {
    const { tenantId, farmId, barnId, timeRange } = useActiveContext();

    const query = useQuery({
        queryKey: ['dashboard', 'overview', { tenantId, farmId, barnId, timeRange: timeRange.preset }],
        queryFn: async () => {
            // If no tenant selected, return null or empty (depends on logic)
            if (!tenantId) return null;

            const response = await apiClient.get<OverviewResponse>('/api/v1/dashboard/overview', {
                params: {
                    tenantId,
                    farmId: farmId || undefined,
                    barnId: barnId || undefined,
                    timeRange: timeRange.preset,
                },
            });
            const payload = unwrapApiResponse<any>(response) || {};
            // Cast kpis because generated type is Record<string, never>
            const rawKpis = (payload.kpis || {}) as Record<string, number>;

            return {
                kpis: rawKpis,
                recentAlerts: payload.recent_alerts || [],
                recentActivity: payload.recent_activity || [],
                weightTrend: payload.weight_trend || [],
            } as DashboardData;
        },
        enabled: !!tenantId,
        refetchInterval: 60000,
    });

    return {
        data: query.data || null,
        isLoading: query.isLoading,
        error: query.error as Error | null,
        refetch: query.refetch
    };
};
