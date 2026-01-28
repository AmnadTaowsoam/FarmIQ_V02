/**
 * Telemetry Hooks
 * React Query hooks for fetching telemetry data including readings and aggregates
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';

export interface TelemetryReading {
  id: string;
  sensorId: string;
  metric: string;
  value: number;
  timestamp: string;
}

export interface TelemetryAggregate {
  metric: string;
  bucket: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Hook to fetch telemetry readings for a specific metric
 */
export const useTelemetryReadings = (metric: string, options?: { from?: string; to?: string }) => {
  const { barnId, tenantId } = useActiveContext();

  return useQuery({
    queryKey: ['telemetry', 'readings', barnId, metric, options],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/telemetry/readings', {
        params: {
          tenantId,
          barnId,
          metric,
          from: options?.from,
          to: options?.to,
        },
      });
      return response.data.data as TelemetryReading[];
    },
    enabled: !!barnId && !!tenantId && !!metric,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 15000, // Data is fresh for 15 seconds
  });
};

/**
 * Hook to fetch aggregated telemetry data
 */
export const useTelemetryAggregates = (bucket: '1h' | '1d' = '1h') => {
  const { barnId, tenantId, timeRange } = useActiveContext();

  return useQuery({
    queryKey: ['telemetry', 'aggregates', barnId, bucket, timeRange],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/telemetry/aggregates', {
        params: {
          tenantId,
          barnId,
          bucket,
          from: timeRange.start,
          to: timeRange.end,
        },
      });
      return response.data;
    },
    enabled: !!barnId && !!tenantId,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Data is fresh for 30 seconds
  });
};

/**
 * Hook to fetch available telemetry metrics
 */
export const useTelemetryMetrics = () => {
  const { barnId, tenantId } = useActiveContext();

  return useQuery({
    queryKey: ['telemetry', 'metrics', barnId],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/telemetry/metrics', {
        params: {
          tenantId,
          barnId,
        },
      });
      return response.data;
    },
    enabled: !!barnId && !!tenantId,
    staleTime: 300000, // Metrics don't change often - 5 minutes
  });
};
