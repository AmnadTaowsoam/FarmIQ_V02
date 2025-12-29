/**
 * Performance utilities for caching, deduplication, and downsampling
 */

/**
 * Request deduplication: cache in-flight requests
 */
class RequestDeduplicator {
  private cache: Map<string, Promise<unknown>> = new Map();

  deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
      // Remove from cache after completion
      setTimeout(() => this.cache.delete(key), 1000);
    });

    this.cache.set(key, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Downsample time-series data for chart rendering
 * Reduces data points to improve performance
 */
export const downsampleTimeSeries = <T extends { timestamp: string }>(
  data: T[],
  maxPoints: number = 1000
): T[] => {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  const downsampled: T[] = [];

  for (let i = 0; i < data.length; i += step) {
    downsampled.push(data[i]);
  }

  // Always include the last point
  if (downsampled[downsampled.length - 1] !== data[data.length - 1]) {
    downsampled.push(data[data.length - 1]);
  }

  return downsampled;
};

/**
 * Memoize function results
 */
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

