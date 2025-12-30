import { useEffect, useState } from 'react';
import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';

/**
 * Custom hook for smart polling.
 * Pauses polling when the window/tab is not visible.
 */
export function usePoll<TData = unknown, TError = unknown>(
    key: QueryKey,
    queryFn: () => Promise<TData>,
    intervalMs: number,
    options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn' | 'refetchInterval'>
) {
    const [isVisible, setIsVisible] = useState(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // If interval is 0 or tab hidden, don't poll
    const refetchInterval = (intervalMs > 0 && isVisible) ? intervalMs : false;

    return useQuery<TData, TError>({
        queryKey: key,
        queryFn,
        refetchInterval,
        refetchIntervalInBackground: false, // Double ensure
        ...options
    });
}
