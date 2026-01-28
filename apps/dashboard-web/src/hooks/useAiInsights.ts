/**
 * AI Insights Hooks
 * React Query hooks for fetching AI insights and recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import { useActiveContext } from '../contexts/ActiveContext';

export interface Insight {
  id: string;
  prompt: string;
  response: string;
  context?: Record<string, any>;
  generatedAt: string;
  status: 'completed' | 'failed' | 'pending';
  error?: string | null;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'dismissed' | 'applied';
  createdAt: string;
  expiresAt?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Hook to fetch insights history
 */
export const useInsightsHistory = () => {
  const { tenantId } = useActiveContext();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['ai', 'insights', 'history', tenantId],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/insights/history', {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to generate a new insight
 */
export const useGenerateInsight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { prompt: string; context?: any }) => {
      const response = await apiClient.post('/api/v1/insights/generate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'insights', 'history'] });
    },
  });
};

/**
 * Hook to fetch recommendations
 */
export const useRecommendations = () => {
  const { tenantId, farmId, barnId } = useActiveContext();

  return useQuery({
    queryKey: ['ai', 'recommendations', tenantId, farmId, barnId],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/recommendations', {
        params: { tenantId, farmId, barnId },
      });
      return response.data as Recommendation[];
    },
    enabled: !!tenantId,
    staleTime: 300000, // 5 minutes - recommendations don't change often
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

/**
 * Hook to acknowledge a recommendation
 */
export const useAcknowledgeRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const response = await apiClient.post(`/api/v1/recommendations/${recommendationId}/acknowledge`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] });
    },
  });
};

/**
 * Hook to dismiss a recommendation
 */
export const useDismissRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const response = await apiClient.post(`/api/v1/recommendations/${recommendationId}/dismiss`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] });
    },
  });
};

/**
 * Hook to apply a recommendation
 */
export const useApplyRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recommendationId, metadata }: { recommendationId: string; metadata?: Record<string, any> }) => {
      const response = await apiClient.post(`/api/v1/recommendations/${recommendationId}/apply`, metadata);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] });
    },
  });
};
