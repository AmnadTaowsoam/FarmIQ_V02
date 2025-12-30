
import { HttpError } from './http';

export interface ClassifiedError {
    type: 'NETWORK' | 'TIMEOUT' | 'SERVER' | 'CLIENT' | 'UNKNOWN';
    code?: string;
    reason: string;
    fix: string;
    originalError: unknown;
}

export interface CurlOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    tenantId?: string;
    apiKey?: string;
}

/**
 * Classifies an error into a user-friendly format with debug hints.
 */
export function classifyError(error: unknown): ClassifiedError {
    // 1. Handle HttpError (from our http client)
    if (error instanceof HttpError) {
        if (error.status >= 500) {
            return {
                type: 'SERVER',
                code: error.code || `HTTP_${error.status}`,
                reason: `Server Error (${error.status}): ${error.message}`,
                fix: 'Check server logs. The downstream service might be crashing.',
                originalError: error
            };
        }
        if (error.status === 408 || error.code === 'TIMEOUT') {
            return {
                type: 'TIMEOUT',
                code: error.code || 'TIMEOUT',
                reason: 'Request timed out.',
                fix: 'The service is responding too slowly. Check network latency or server load.',
                originalError: error
            };
        }
        if (error.status === 401 || error.status === 403) {
            return {
                type: 'CLIENT',
                code: `AUTH_${error.status}`,
                reason: `Authentication Failed (${error.status})`,
                fix: 'Verify your API Key or HMAC secret in Settings.',
                originalError: error
            };
        }
        return {
            type: 'CLIENT',
            code: `HTTP_${error.status}`,
            reason: `Client Error (${error.status}): ${error.message}`,
            fix: 'Check request parameters or configuration.',
            originalError: error
        };
    }

    // 2. Handle JS/Fetch Errors
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        // Fetch "Failed to fetch" usually means Network Error / CORS / Connection Refused
        if (msg.includes('failed to fetch') || msg.includes('network error') || error.name === 'TypeError') {
            return {
                type: 'NETWORK',
                code: 'ECONNREFUSED',
                reason: 'Connection Failed.',
                fix: 'Ensure the service is running and accessible from this machine. Check CORS settings.',
                originalError: error
            };
        }

        if (error.name === 'AbortError' || msg.includes('timeout')) {
            return {
                type: 'TIMEOUT',
                code: 'TIMEOUT',
                reason: 'Request timed out locally.',
                fix: 'The request took too long to complete.',
                originalError: error
            };
        }

        return {
            type: 'UNKNOWN',
            reason: error.message,
            fix: 'Check browser console for more details.',
            originalError: error
        };
    }

    return {
        type: 'UNKNOWN',
        reason: String(error),
        fix: 'Unknown error occurred.',
        originalError: error
    };
}

/**
 * Generates a ready-to-use cURL command for debugging.
 */
export function generateCurlCommand(url: string, options: CurlOptions = {}): string {
    const parts = ['curl'];

    // Method (default GET)
    if (options.method && options.method.toUpperCase() !== 'GET') {
        parts.push(`-X ${options.method.toUpperCase()}`);
    }

    // Headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
    };

    if (options.tenantId) headers['x-tenant-id'] = options.tenantId;
    if (options.apiKey) headers['x-api-key'] = options.apiKey;

    Object.entries(headers).forEach(([k, v]) => {
        parts.push(`-H "${k}: ${v}"`);
    });

    // Body
    if (options.body) {
        // Escape check: very basic for now, can be improved
        const json = JSON.stringify(options.body).replace(/"/g, '\\"');
        parts.push(`-d "${json}"`);
    }

    // URL
    parts.push(`"${url}"`);

    return parts.join(' ');
}
