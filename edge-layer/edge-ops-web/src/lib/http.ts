/**
 * Generate a v4 UUID using crypto.randomUUID() with a fallback for non-secure contexts.
 */
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for non-secure contexts (http)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Standard Error Shape for FarmIQ API responses
 */
export interface HttpErrorDetails {
    code: string;
    message: string;
    details?: unknown;
}

export class HttpError extends Error {
    public code: string;
    public details?: unknown;
    public status: number;
    public traceId?: string;

    constructor(status: number, errorBody: HttpErrorDetails | string, traceId?: string) {
        const message = typeof errorBody === 'object' ? errorBody.message : errorBody;
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.code = typeof errorBody === 'object' ? errorBody.code : 'UNKNOWN_ERROR';
        this.details = typeof errorBody === 'object' ? errorBody.details : undefined;
        this.traceId = traceId;
    }
}

interface RequestOptions extends RequestInit {
    timeoutMs?: number;
    tenantId?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    searchParams?: Record<string, string | number | boolean | undefined>;
}

/**
 * Robust HTTP Client wrapper
 */
export const http = {
    request: async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
        const {
            timeoutMs = 10000,
            tenantId,
            apiKey,
            headers = {},
            searchParams,
            ...fetchOptions
        } = options;

        // 1. Construct URL with Search Params
        const urlObj = new URL(url);
        if (searchParams) {
            Object.entries(searchParams).forEach(([key, val]) => {
                if (val !== undefined) {
                    urlObj.searchParams.append(key, String(val));
                }
            });
        }

        // 2. Prepare Headers
        const requestId = generateUUID();
        const traceId = generateUUID();

        const finalHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-request-id': requestId,
            'x-trace-id': traceId,
            ...headers,
        };

        if (tenantId) finalHeaders['x-tenant-id'] = tenantId;
        if (apiKey) finalHeaders['x-api-key'] = apiKey;

        // 3. Prepare Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(urlObj.toString(), {
                ...fetchOptions,
                headers: finalHeaders,
                signal: controller.signal,
            });

            // 4. Handle Response
            if (!response.ok) {
                let errorBody: HttpErrorDetails | string;
                try {
                    errorBody = await response.json();
                } catch {
                    errorBody = response.statusText;
                }
                throw new HttpError(response.status, errorBody, traceId);
            }

            // 5. Parse JSON Safely
            // Handle 204 No Content
            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new HttpError(408, { code: 'TIMEOUT', message: `Request timed out after ${timeoutMs}ms` });
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    get: <T>(url: string, options?: RequestOptions) => http.request<T>(url, { ...options, method: 'GET' }),

    post: <T>(url: string, body: unknown, options?: RequestOptions) =>
        http.request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),

    put: <T>(url: string, body: unknown, options?: RequestOptions) =>
        http.request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),

    delete: <T>(url: string, options?: RequestOptions) => http.request<T>(url, { ...options, method: 'DELETE' }),
};
