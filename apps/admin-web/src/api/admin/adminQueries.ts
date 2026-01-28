/**
 * Admin API Queries
 * React Query hooks for admin-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  OverviewStats,
  Tenant,
  User,
  Device,
  PaginatedResponse,
  CreateTenantInput,
  UpdateTenantInput,
  CreateUserInput,
  UpdateUserInput,
  AuditEvent,
  BillingSummary,
} from './types';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

// ========== Overview Stats ==========

/**
 * Hook to fetch overview statistics for the admin dashboard
 */
export const useOverviewStats = () => {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/overview');
      return response.data as OverviewStats;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
};

// ========== Tenants ==========

/**
 * Hook to fetch paginated list of tenants
 */
export const useTenantsQuery = (params?: { page?: number; pageSize?: number; search?: string }) => {
  return useQuery({
    queryKey: ['admin', 'tenants', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/tenants', { params });
      return response.data as PaginatedResponse<Tenant>;
    },
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch a single tenant by ID
 */
export const useTenantById = (tenantId: string) => {
  return useQuery({
    queryKey: ['admin', 'tenants', tenantId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/admin/tenants/${tenantId}`);
      return response.data as Tenant;
    },
    enabled: !!tenantId,
    staleTime: 120000, // 2 minutes
  });
};

// Alias for backward compatibility
export const useTenant = useTenantById;

/**
 * Hook to create a new tenant
 */
export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTenantInput) => {
      const response = await apiClient.post('/api/v1/admin/tenants', data);
      return response.data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
};

/**
 * Hook to update an existing tenant
 */
export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: string; data: UpdateTenantInput }) => {
      const response = await apiClient.patch(`/api/v1/admin/tenants/${tenantId}`, data);
      return response.data as Tenant;
    },
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
};

/**
 * Hook to delete a tenant
 */
export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.delete(`/api/v1/admin/tenants/${tenantId}`);
      return tenantId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
};

// ========== Users ==========

/**
 * Hook to fetch paginated list of users
 */
export const useUsersQuery = (params?: { tenantId?: string; page?: number; pageSize?: number; search?: string }) => {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/users', { params });
      return response.data as PaginatedResponse<User>;
    },
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch a single user by ID
 */
export const useUserById = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/admin/users/${userId}`);
      return response.data as User;
    },
    enabled: !!userId,
    staleTime: 120000, // 2 minutes
  });
};

// Alias for backward compatibility
export const useUser = useUserById;

/**
 * Hook to create a new user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await apiClient.post('/api/v1/admin/users', data);
      return response.data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Hook to update an existing user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserInput }) => {
      const response = await apiClient.patch(`/api/v1/admin/users/${userId}`, data);
      return response.data as User;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] });
    },
  });
};

/**
 * Hook to delete a user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/api/v1/admin/users/${userId}`);
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

// ========== Devices ==========

/**
 * Hook to fetch paginated list of devices
 */
export const useDevicesQuery = (params?: { tenantId?: string; status?: string; page?: number; pageSize?: number }) => {
  return useQuery({
    queryKey: ['admin', 'devices', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/devices', { params });
      return response.data as PaginatedResponse<Device>;
    },
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch a single device by ID
 */
export const useDeviceById = (deviceId: string) => {
  return useQuery({
    queryKey: ['admin', 'devices', deviceId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/devices/${deviceId}`);
      return response.data as Device;
    },
    enabled: !!deviceId,
    staleTime: 120000, // 2 minutes
  });
};

// Alias for backward compatibility
export const useDevice = useDeviceById;

// ========== System Health ==========

/**
 * Hook to fetch system health status
 */
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/ops/health');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // 30 seconds
  });
};

// ========== Audit Logs ==========

/**
 * Hook to fetch audit events
 */
export const useAuditLogs = (params?: { from?: string; to?: string; userId?: string; page?: number; pageSize?: number }) => {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/audit/events', { params });
      return response.data as PaginatedResponse<AuditEvent>;
    },
    staleTime: 60000, // 1 minute
  });
};

// Alias for backward compatibility
export const useAuditLog = useAuditLogs;

/**
 * Hook to fetch a single audit event by ID
 */
export const useAuditEventById = (eventId: string) => {
  return useQuery({
    queryKey: ['admin', 'audit', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/audit/events/${eventId}`);
      return response.data as AuditEvent;
    },
    enabled: !!eventId,
    staleTime: 300000, // 5 minutes - audit logs don't change
  });
};

// ========== Billing ==========

/**
 * Hook to fetch billing summary
 */
export const useBillingSummary = () => {
  return useQuery({
    queryKey: ['admin', 'billing'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/billing/summary');
      return response.data as BillingSummary;
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

// ========== Roles ==========

/**
 * Hook to fetch admin roles
 */
export const useAdminRoles = () => {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/roles');
      return response.data as PaginatedResponse<Role>;
    },
    staleTime: 300000, // 5 minutes - roles don't change often
  });
};

// ========== Settings ==========

/**
 * Hook to fetch admin settings
 */
export const useAdminSettings = () => {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/settings');
      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Hook to update admin settings
 */
export const useUpdateAdminSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      const response = await apiClient.patch('/api/v1/admin/settings', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
};
