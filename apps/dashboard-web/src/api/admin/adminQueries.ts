/**
 * TanStack Query Hooks for Admin API
 * 
 * React Query hooks with proper cache configuration, retry logic, and query keys.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { adminApiClient } from './adminApiClient';
import type {
    MockTenant,
    MockUser,
    MockDevice,
    MockAuditEntry,
    MockOverviewStats,
} from './mockAdminData';

// ============================================================================
// Query Keys
// ============================================================================

export const adminQueryKeys = {
    all: ['admin'] as const,

    overview: () => [...adminQueryKeys.all, 'overview'] as const,
    overviewStats: () => [...adminQueryKeys.overview(), 'stats'] as const,

    tenants: () => [...adminQueryKeys.all, 'tenants'] as const,
    tenantsList: (params?: any) => [...adminQueryKeys.tenants(), 'list', params] as const,
    tenantDetail: (id: string) => [...adminQueryKeys.tenants(), 'detail', id] as const,

    users: () => [...adminQueryKeys.all, 'users'] as const,
    usersList: (params?: any) => [...adminQueryKeys.users(), 'list', params] as const,
    userDetail: (id: string) => [...adminQueryKeys.users(), 'detail', id] as const,

    devices: () => [...adminQueryKeys.all, 'devices'] as const,
    devicesList: (params?: any) => [...adminQueryKeys.devices(), 'list', params] as const,
    deviceDetail: (id: string) => [...adminQueryKeys.devices(), 'detail', id] as const,

    audit: () => [...adminQueryKeys.all, 'audit'] as const,
    auditLog: (params?: any) => [...adminQueryKeys.audit(), 'log', params] as const,
    auditDetail: (id: string) => [...adminQueryKeys.audit(), 'detail', id] as const,
};

// ============================================================================
// Overview Queries
// ============================================================================

export function useOverviewStats(options?: UseQueryOptions<MockOverviewStats>) {
    return useQuery({
        queryKey: adminQueryKeys.overviewStats(),
        queryFn: () => adminApiClient.getOverviewStats(),
        staleTime: 30 * 1000, // 30 seconds
        retry: 2,
        ...options,
    });
}

// ============================================================================
// Tenant Queries
// ============================================================================

export function useTenants(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    type?: string;
    region?: string;
}) {
    return useQuery({
        queryKey: adminQueryKeys.tenantsList(params),
        queryFn: () => adminApiClient.getTenants(params),
        staleTime: 60 * 1000, // 1 minute
        retry: 2,
    });
}

export function useTenant(id: string, options?: UseQueryOptions<MockTenant>) {
    return useQuery({
        queryKey: adminQueryKeys.tenantDetail(id),
        queryFn: () => adminApiClient.getTenantById(id),
        enabled: !!id,
        staleTime: 60 * 1000,
        retry: 2,
        ...options,
    });
}

export function useCreateTenant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<MockTenant>) => adminApiClient.createTenant(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.tenants() });
        },
    });
}

export function useUpdateTenant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MockTenant> }) =>
            adminApiClient.updateTenant(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.tenantDetail(variables.id) });
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.tenants() });
        },
    });
}

export function useDeleteTenant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => adminApiClient.deleteTenant(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.tenants() });
        },
    });
}

// ============================================================================
// User Queries
// ============================================================================

export function useUsers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    role?: string;
    tenantId?: string;
}) {
    return useQuery({
        queryKey: adminQueryKeys.usersList(params),
        queryFn: () => adminApiClient.getUsers(params),
        staleTime: 60 * 1000,
        retry: 2,
    });
}

export function useUser(id: string, options?: UseQueryOptions<MockUser>) {
    return useQuery({
        queryKey: adminQueryKeys.userDetail(id),
        queryFn: () => adminApiClient.getUserById(id),
        enabled: !!id,
        staleTime: 60 * 1000,
        retry: 2,
        ...options,
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<MockUser> & { password?: string; roles?: string[]; tenantId?: string | null }) =>
            adminApiClient.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MockUser> & { password?: string; roles?: string[]; tenantId?: string | null } }) =>
            adminApiClient.updateUser(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(variables.id) });
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => adminApiClient.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
        },
    });
}

export function useAdminRoles() {
    return useQuery({
        queryKey: [...adminQueryKeys.users(), 'roles'],
        queryFn: () => adminApiClient.getRoles(),
        staleTime: 60 * 1000,
        retry: 2,
    });
}

// ============================================================================
// Device Queries
// ============================================================================

export function useDevices(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    type?: string;
    tenantId?: string;
    farmId?: string;
    barnId?: string;
}) {
    return useQuery({
        queryKey: adminQueryKeys.devicesList(params),
        queryFn: () => adminApiClient.getDevices(params),
        staleTime: 30 * 1000,
        retry: 2,
    });
}

export function useDevice(id: string, options?: UseQueryOptions<MockDevice>) {
    return useQuery({
        queryKey: adminQueryKeys.deviceDetail(id),
        queryFn: () => adminApiClient.getDeviceById(id),
        enabled: !!id,
        staleTime: 30 * 1000,
        retry: 2,
        ...options,
    });
}

// ============================================================================
// Audit Log Queries
// ============================================================================

export function useAuditLog(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    action?: string;
    resource?: string;
    userId?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
}) {
    return useQuery({
        queryKey: adminQueryKeys.auditLog(params),
        queryFn: () => adminApiClient.getAuditLog(params),
        staleTime: 30 * 1000,
        retry: 2,
    });
}

export function useAuditEntry(id: string, params?: { tenantId?: string }, options?: UseQueryOptions<MockAuditEntry>) {
    return useQuery({
        queryKey: adminQueryKeys.auditDetail(id),
        queryFn: () => adminApiClient.getAuditEntryById(id, params?.tenantId),
        enabled: !!id && (params?.tenantId !== undefined || params === undefined),
        staleTime: 60 * 1000,
        retry: 2,
        ...options,
    });
}
