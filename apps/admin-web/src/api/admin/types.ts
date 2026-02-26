/**
 * Admin API Types
 * Type definitions for admin-related data structures
 */

export interface OverviewStats {
  totalTenants: number;
  totalFarms: number;
  totalBarns: number;
  totalDevices: number;
  totalUsers: number;
  devicesOnline: number;
  devicesOffline: number;
  lastDataIngest: string | null;
  lastSync: string | null;
  topAlerts: Alert[];
  systemHealth: {
    api: 'healthy' | 'degraded' | 'down' | 'unknown';
    database: 'healthy' | 'degraded' | 'down' | 'unknown';
    mqtt: 'healthy' | 'degraded' | 'down' | 'unknown';
    storage: 'healthy' | 'degraded' | 'down' | 'unknown';
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  type: 'enterprise' | 'standard' | 'free';
  status: 'active' | 'suspended' | 'trial';
  region: string;
  createdAt: string;
  updatedAt: string;
  farmsCount: number;
  barnsCount: number;
  usersCount: number;
  deviceCount: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  tenantName: string;
  lastLogin: string | null;
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  tenantId: string;
  tenantName: string;
  farmId: string | null;
  farmName: string | null;
  barnId: string | null;
  barnName: string | null;
  status: 'online' | 'offline';
  ipAddress: string | null;
  lastSeen: string | null;
  firmwareVersion: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateTenantInput {
  name: string;
  type?: 'standard' | 'enterprise' | 'trial';
  status?: 'active' | 'inactive' | 'suspended';
  region?: string;
}

export interface UpdateTenantInput {
  name?: string;
  type?: 'standard' | 'enterprise' | 'trial';
  status?: 'active' | 'inactive' | 'suspended';
  region?: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  tenantId: string;
  roles?: string[];
}

export interface UpdateUserInput {
  name?: string;
  roles?: string[];
  status?: 'active' | 'inactive' | 'locked';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  tenantId: string | null;
  tenantName: string | null;
  action: string;
  resource: string;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, any>;
}

export interface BillingSummary {
  totalRevenue: number;
  activeSubscriptions: number;
  pendingInvoices: number;
  monthlyRevenue: number;
  topPayers: Array<{
    tenantId: string;
    tenantName: string;
    amount: number;
  }>;
}
