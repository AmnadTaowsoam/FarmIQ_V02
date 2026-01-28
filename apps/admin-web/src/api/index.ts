/**
 * API Exports
 * Centralized exports for API functions
 */

import { apiClient as httpClient } from './client';
import { OPS_ENDPOINTS } from './endpoints';
import type { AxiosResponse } from 'axios';

export * from './client';
export * from './endpoints';
export * from './admin/adminQueries';
export * from './admin/types';

// Re-export for backward compatibility
export const apiClient = httpClient;

export const unwrapApiResponse = <T>(response: AxiosResponse<ApiResponse<T> | T>): T => {
    const payload = response.data as any;
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return payload.data as T;
    }
    return payload as T;
};

// Type definitions
export interface ApiResponse<T> {
    data: T;
    meta?: {
        total?: number;
        page?: number;
        pageSize?: number;
        cursor?: string;
    };
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        traceId?: string;
    };
}

// API client
export const api = {
    // ==================== Ops ====================
    opsHealth: (params?: any) => httpClient.get<ApiResponse<any>>(OPS_ENDPOINTS.HEALTH, { params }),
    opsDataQuality: (params?: any) => httpClient.get<ApiResponse<any>>(OPS_ENDPOINTS.DATA_QUALITY, { params }),
};
