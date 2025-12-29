import { AxiosError } from 'axios';

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    retryableStatusCodes: [502, 503, 504], // Only retry on these status codes
};

/**
 * Calculate exponential backoff delay
 */
const calculateBackoffDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error: unknown, retryableStatusCodes: number[]): boolean => {
    // Network errors (no response)
    if (error instanceof Error && !('response' in error)) {
        return true;
    }

    // Axios errors with specific status codes
    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        return status !== undefined && retryableStatusCodes.includes(status);
    }

    return false;
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param config - Retry configuration
 * @returns Promise with the result of the function
 * 
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => apiClient.get('/api/v1/notifications/inbox'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: unknown;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if error is not retryable
            if (!isRetryableError(error, finalConfig.retryableStatusCodes)) {
                throw error;
            }

            // Don't retry if we've exhausted all attempts
            if (attempt === finalConfig.maxRetries) {
                throw error;
            }

            // Calculate delay and wait
            const delay = calculateBackoffDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);

            if (import.meta.env.DEV) {
                console.warn(
                    `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed. Retrying in ${Math.round(delay)}ms...`,
                    error
                );
            }

            await sleep(delay);
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
}

/**
 * Wrapper for API calls with automatic retry
 * 
 * @example
 * ```typescript
 * const response = await withRetry(() => 
 *   apiClient.get('/api/v1/notifications/inbox')
 * );
 * ```
 */
export const withRetry = retryWithBackoff;
