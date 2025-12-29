import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getAccessToken, getRefreshToken, setSession, clearSession, getTenantId } from './auth';

// Base URL configuration
const RAW_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

const normalizeBaseUrl = (value: string): string => {
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (typeof window === 'undefined') return value;
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${window.location.origin}${path}`;
};

export const API_BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

// Create axios instance
const httpClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
httpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const baseUrl = config.baseURL || '';
        if (config.url?.startsWith('/api/') && /\/api(\/v\d+)?$/.test(baseUrl)) {
            config.baseURL = baseUrl.replace(/\/api(\/v\d+)?$/, '');
        }

        // Generate request ID if not present
        if (!config.headers['x-request-id']) {
            config.headers['x-request-id'] = uuidv4();
        }

        // Prevent browsers from sending conditional requests (304) for API GETs.
        // Some endpoints (via Express default ETag) may respond 304 with an empty body,
        // which breaks clients expecting JSON payloads.
        if (config.method === 'get') {
            config.headers['Cache-Control'] = 'no-store';
            config.headers.Pragma = 'no-cache';
        }

        // Add authorization token
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add tenant context (skip for auth endpoints and tenant list endpoint)
        const isAuthEndpoint = config.url?.includes('/auth/');
        // Check if this is the tenants list endpoint (matches /api/v1/tenants but not /api/v1/tenants/{id})
        // Pattern: ends with /tenants but not /tenants/{something}
        const urlPath = config.url || '';
        const isTenantsListEndpoint = urlPath.endsWith('/tenants') && !urlPath.match(/\/tenants\/[^/]+/);
        const shouldSkipTenantContext = isAuthEndpoint || isTenantsListEndpoint;
        
        if (!shouldSkipTenantContext) {
            const tenantIdFromParams =
                (config.params as any)?.tenantId ||
                (config.headers?.['x-tenant-id'] as string | undefined) ||
                (config.headers?.['x-tenant-id'.toLowerCase()] as string | undefined);
            const tenantId = tenantIdFromParams || getTenantId();

            // Validate tenant context for non-auth requests (but allow tenants list)
            if (!tenantId && import.meta.env.DEV) {
                console.warn(
                    `[API] Request to ${config.url} without tenant context. This may result in empty data.`
                );
            }

            if (tenantId) {
                // Add as header (BFF expects this)
                config.headers['x-tenant-id'] = tenantId;

                // Also add as query param for GET requests (some endpoints expect this)
                if (config.method === 'get' && !(config.params as any)?.tenantId) {
                    config.params = { ...config.params, tenantId };
                }
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const responseData = error.response?.data as any;
        const traceId =
            responseData?.error?.traceId ||
            responseData?.traceId ||
            error.response?.headers?.['x-trace-id'] ||
            error.response?.headers?.['x-request-id'];
        const requestId = originalRequest?.headers?.['x-request-id'] as string | undefined;

        if (typeof window !== 'undefined') {
            (window as any).__lastApiError = {
                status: error.response?.status,
                code: responseData?.error?.code,
                message: responseData?.error?.message || error.message,
                requestId,
                traceId,
                path: originalRequest?.url,
            };
        }

        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Attempt token refresh
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                // Update session
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                setSession(newAccessToken, newRefreshToken, user);

                // Retry original request with new token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                return httpClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear session and redirect to login
                console.error('Token refresh failed:', refreshError);
                clearSession();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error('[API] Access forbidden (403):', error.response.data);
            // Could show a global notification here
        }

        // Handle 5xx Server Errors
        if (error.response?.status && error.response.status >= 500) {
            console.error('[API] Server error (5xx):', error.response.data);
            // Could show a global notification here
        }

        // Handle network errors
        if (!error.response) {
            console.error('[API] Network error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default httpClient;

// Helper to check if error is an API error
export const isApiError = (error: unknown): error is AxiosError => {
    return axios.isAxiosError(error);
};

// Helper to extract error message
export const getErrorMessage = (error: unknown): string => {
    if (isApiError(error)) {
        const data = error.response?.data as any;
        return data?.error?.message || data?.message || error.message || 'An error occurred';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unknown error occurred';
};

// Helper to extract correlation ID
export const getCorrelationId = (error: unknown): string | undefined => {
    if (isApiError(error)) {
        const data = error.response?.data as any;
        return data?.error?.traceId || data?.traceId || error.response?.headers['x-request-id'];
    }
    return undefined;
};
