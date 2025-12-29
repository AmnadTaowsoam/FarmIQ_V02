import { AxiosError } from 'axios';

export interface NormalizedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
  traceId?: string;
  timestamp: string;
  statusCode?: number;
}

/**
 * Normalize API errors into a standard shape
 */
export const normalizeError = (error: unknown, requestId?: string): NormalizedError => {
  const timestamp = new Date().toISOString();

  if (error instanceof AxiosError) {
    const response = error.response;
    const data = response?.data;

    // Check for BFF error format
    if (data?.error) {
      return {
        code: data.error.code || 'API_ERROR',
        message: data.error.message || error.message || 'An error occurred',
        details: data.error.details,
        requestId: data.error.traceId || requestId || response?.headers['x-request-id'],
        traceId: response?.headers['x-trace-id'],
        timestamp,
        statusCode: response?.status,
      };
    }

    // Standard HTTP errors
    return {
      code: `HTTP_${response?.status || 'UNKNOWN'}`,
      message: error.message || 'Network error',
      requestId: requestId || response?.headers['x-request-id'],
      traceId: response?.headers['x-trace-id'],
      timestamp,
      statusCode: response?.status,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      requestId,
      timestamp,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    requestId,
    timestamp,
  };
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: NormalizedError): boolean => {
  if (!error.statusCode) return false;
  
  // Retry on network errors and 5xx
  return (
    error.statusCode >= 500 ||
    error.statusCode === 408 || // Request timeout
    error.statusCode === 429 // Too many requests (with backoff)
  );
};

/**
 * Check if error is auth-related
 */
export const isAuthError = (error: NormalizedError): boolean => {
  return error.statusCode === 401 || error.statusCode === 403;
};

