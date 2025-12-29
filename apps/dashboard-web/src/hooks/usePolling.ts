import { useEffect, useRef } from 'react';

export const usePolling = (callback: () => void, intervalMs: number, enabled: boolean = true) => {
    const savedCallback = useRef(callback);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        if (!enabled || intervalMs <= 0) return;

        // Execute immediately
        savedCallback.current();

        const id = setInterval(() => {
            // Check if tab is visible
            if (!document.hidden) {
                savedCallback.current();
            }
        }, intervalMs);

        return () => clearInterval(id);
    }, [intervalMs, enabled]);
};
