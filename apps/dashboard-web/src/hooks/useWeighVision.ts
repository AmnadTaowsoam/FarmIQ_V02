/**
 * WeighVision Hooks
 * React Query hooks for fetching WeighVision sessions and analytics
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';

export interface WeighVisionSession {
  id: string;
  barnId: string;
  batchId: string | null;
  startTime: string;
  endTime: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  animalCount: number;
  avgWeight: number;
  minWeight: number;
  maxWeight: number;
  stdDev: number;
  fcr: number | null;
  adg: number | null;
}

export interface WeighVisionMeasurement {
  id: string;
  sessionId: string;
  timestamp: string;
  weight: number;
  confidence: number;
  imageId: string | null;
}

export interface WeighVisionAnalytics {
  avgWeight: number;
  weightTrend: Array<{ date: string; value: number }>;
  fcr: number;
  adg: number;
  distribution: {
    underweight: number;
    normal: number;
    overweight: number;
  };
}

/**
 * Hook to fetch WeighVision sessions with pagination
 */
export const useWeighVisionSessions = (params?: { page?: number; pageSize?: number }) => {
  const { barnId, tenantId } = useActiveContext();

  return useQuery({
    queryKey: ['weighvision', 'sessions', barnId, params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/weighvision/sessions', {
        params: { tenantId, barnId, ...params },
      });
      return response.data;
    },
    enabled: !!barnId && !!tenantId,
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch a single WeighVision session by ID
 */
export const useWeighVisionSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['weighvision', 'session', sessionId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/weighvision/sessions/${sessionId}`);
      return response.data as WeighVisionSession;
    },
    enabled: !!sessionId,
    staleTime: 300000, // 5 minutes - session data doesn't change
  });
};

/**
 * Hook to fetch WeighVision analytics
 */
export const useWeighVisionAnalytics = () => {
  const { barnId, tenantId, timeRange } = useActiveContext();

  return useQuery({
    queryKey: ['weighvision', 'analytics', barnId, timeRange],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/weighvision/analytics', {
        params: {
          tenantId,
          barnId,
          from: timeRange.start,
          to: timeRange.end,
        },
      });
      return response.data as WeighVisionAnalytics;
    },
    enabled: !!barnId && !!tenantId,
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};
