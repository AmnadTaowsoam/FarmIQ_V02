import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Environment variable for BFF Base URL
const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || import.meta.env.VITE_API_BASE_URL || '/api';
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || import.meta.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export const apiClient = axios.create({
    baseURL: BFF_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Export for use in API hooks
export const getBFFBaseURL = () => BFF_BASE_URL;
export const isMockMode = () => MOCK_MODE;

// Request Interceptor: Auth & Tracing
apiClient.interceptors.request.use(async (config) => {
    // 1. Inject Auth Token (with auto-refresh)
    try {
        // Dynamic import to avoid circular dependency
        const { authService } = await import('../services/AuthService');
        const token = await authService.ensureValidToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        // Token refresh failed - will be handled by response interceptor
        console.warn('Failed to get valid token', error);
    }

    // 2. Inject Request ID (Tracing)
    const requestId = uuidv4();
    config.headers['x-request-id'] = requestId;

    // Store request ID globally for error handling
    if (typeof window !== 'undefined') {
        (window as any).__lastRequestId = requestId;
    }

    // 3. Context should be sent via query params (not headers)
    // This is handled by individual API calls, not here

    return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Error Standardization & Refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // 1. Handle 401 (Unauthorized) - Refresh Logic
        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
            (originalRequest as any)._retry = true;

            try {
                // Use AuthService for refresh
                const { authService } = await import('../services/AuthService');
                await authService.refreshToken();

                // Retry original request with new token
                const newToken = authService.getAccessToken();
                if (newToken && originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed - logout and redirect
                const { authService } = await import('../services/AuthService');
                await authService.logout('Token refresh failed');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // 2. Standardize Error Shape
        const errorResponse = {
            message: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR',
            traceId: error.response?.headers['x-trace-id'] || uuidv4(),
            originalError: error
        };

        if (error.response?.data && typeof error.response.data === 'object') {
            const data = error.response.data as any;
            if (data.error) {
                errorResponse.message = data.error.message || errorResponse.message;
                errorResponse.code = data.error.code || errorResponse.code;
                errorResponse.traceId = data.error.traceId || errorResponse.traceId;
            }
        }

        return Promise.reject(errorResponse);
    }
);
