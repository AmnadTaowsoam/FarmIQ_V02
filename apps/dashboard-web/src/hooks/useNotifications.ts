import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
    fetchNotificationsInbox,
    fetchNotificationsHistory,
    fetchUnreadCount,
    NotificationInboxResponse,
    NotificationHistoryResponse,
    NotificationFilters,
} from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';

// Query keys
export const notificationKeys = {
    all: ['notifications'] as const,
    inbox: () => [...notificationKeys.all, 'inbox'] as const,
    history: (filters?: NotificationFilters) => [...notificationKeys.all, 'history', filters] as const,
    unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

/**
 * Hook to fetch notifications inbox
 * Returns recent notifications (unread + read)
 */
export const useNotificationsInbox = (): UseQueryResult<NotificationInboxResponse, Error> => {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: notificationKeys.inbox(),
        queryFn: () => fetchNotificationsInbox(),
        enabled: isAuthenticated,
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // Refetch every 60 seconds
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch notifications history with filters
 */
export const useNotificationsHistory = (
    filters?: NotificationFilters
): UseQueryResult<NotificationHistoryResponse, Error> => {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: notificationKeys.history(filters),
        queryFn: () => fetchNotificationsHistory(filters),
        enabled: isAuthenticated,
        staleTime: 60000, // 1 minute
    });
};

/**
 * Hook to fetch unread notification count
 * Polls every 30-60 seconds when user is logged in
 */
export const useUnreadCount = (): UseQueryResult<number, Error> => {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: notificationKeys.unreadCount(),
        queryFn: () => fetchUnreadCount(),
        enabled: isAuthenticated,
        staleTime: 30000, // 30 seconds
        refetchInterval: 45000, // Refetch every 45 seconds
        refetchOnWindowFocus: true,
        // Only refetch when tab is visible
        refetchIntervalInBackground: false,
    });
};
