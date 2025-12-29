import { useState, useEffect } from 'react';

/**
 * Custom hook to delay a loading state by a specified duration (default 200ms).
 * This prevents the "flash" of loading skeletons on very fast network connections.
 */
export const useDelayedLoading = (isLoading: boolean, delayMs: number = 200) => {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        let timer: any;

        if (isLoading) {
            timer = setTimeout(() => {
                setShouldShow(true);
            }, delayMs);
        } else {
            setShouldShow(false);
            if (timer) clearTimeout(timer);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading, delayMs]);

    return shouldShow;
};
