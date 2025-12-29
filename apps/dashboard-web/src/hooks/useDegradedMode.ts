import { useCallback, useEffect, useRef, useState } from 'react';

interface DegradedModeState {
  isDegraded: boolean;
  lastUpdate: Date | null;
  reason: string | null;
  retry: () => Promise<void>;
}

/**
 * Hook to detect degraded mode (BFF unreachable)
 * Shows cached data when available
 */
export const useDegradedMode = (): DegradedModeState => {
  const [state, setState] = useState<DegradedModeState>({
    isDegraded: false,
    lastUpdate: null,
    reason: null,
    retry: async () => {},
  });
  const failureCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const scheduleCheck = useCallback((delayMs: number, check: () => void) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(check, delayMs);
  }, []);

  const checkHealth = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    try {
      // Try to reach BFF health endpoint
      // Avoid conditional requests (304) so we don't accidentally treat cache revalidation as a failure.
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) {
        failureCountRef.current = 0;
        setState((prev) => ({
          ...prev,
          isDegraded: false,
          reason: 'Authentication required',
        }));
        return;
      }
      if (!response.ok && response.status !== 304) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      setState((prev) => ({
        ...prev,
        isDegraded: false,
        lastUpdate: new Date(),
        reason: null,
      }));
      failureCountRef.current = 0;
    } catch (error) {
      failureCountRef.current += 1;
      setState((prev) => ({
        ...prev,
        isDegraded: true,
        reason: 'BFF unreachable',
      }));
    }
    finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    const retry = async () => {
      await checkHealth();
    };

    setState((prev) => ({ ...prev, retry }));
  }, [checkHealth]);

  useEffect(() => {
    const baseDelay = 10000;
    const maxDelay = 60000;
    const run = async () => {
      await checkHealth();
      const backoff = Math.min(baseDelay * Math.pow(2, failureCountRef.current), maxDelay);
      scheduleCheck(backoff, run);
    };
    run();
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [checkHealth, scheduleCheck]);

  return state;
};

