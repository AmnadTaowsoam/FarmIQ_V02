/**
 * Query Client Configuration
 * Sets up React Query client with default options
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

/**
 * Create and configure the QueryClient instance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time in milliseconds that data remains fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Time in milliseconds that unused data remains in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      // Number of times to retry failed requests
      retry: 1,
      // Retry only on specific status codes
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (can be disabled for better performance)
      refetchOnWindowFocus: false,
      // Refetch on component mount
      refetchOnMount: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Number of times to retry failed mutations
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Global error handler for queries
      console.error('Query error:', error, query.queryKey);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, variables, context) => {
      // Global error handler for mutations
      console.error('Mutation error:', error, variables);
    },
  }),
});
