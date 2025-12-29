/**
 * Admin API Client
 * 
 * Typed API client for admin endpoints with mock fallback for missing backend endpoints.
 * All endpoints are clearly marked with TODO comments for backend implementation.
 */

import axios, { AxiosInstance } from 'axios';
import {
    MockTenant,
    MockUser,
    MockDevice,
    MockAuditEntry,
    MockOverviewStats,
    PaginatedResponse,
    generateMockTenants,
    generateMockUsers,
    generateMockDevices,
    generateMockAuditEntries,
    generateMockOverviewStats,
    paginateData,
    searchData,
} from './mockAdminData';

// ============================================================================
// API Client Configuration
// ============================================================================

const USE_MOCKS = import.meta.env.VITE_USE_ADMIN_MOCKS !== 'false';
const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5125';

class AdminApiClient {
    private client: AxiosInstance;
    private mockData: {
        tenants: MockTenant[];
        users: MockUser[];
        devices: MockDevice[];
        auditEntries: MockAuditEntry[];
    };

    constructor() {
        this.client = axios.create({
            // Admin endpoints must go through BFF (never call cloud services directly from FE).
            // Ensure baseURL includes /api/v1 prefix
            baseURL: `${BFF_BASE_URL}/api/v1`,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor for auth token
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Add request ID for tracing
            config.headers['x-request-id'] = this.generateRequestId();

            return config;
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                console.error('Admin API Error:', error);
                return Promise.reject(error);
            }
        );

        // Initialize mock data
        this.mockData = {
            tenants: generateMockTenants(50),
            users: generateMockUsers(100),
            devices: generateMockDevices(200),
            auditEntries: generateMockAuditEntries(500),
        };
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async delay(ms: number = 300): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================================================
    // Overview / Dashboard
    // ============================================================================

    async getOverviewStats(): Promise<MockOverviewStats> {
        // Use existing endpoints instead of new admin endpoint
        if (USE_MOCKS) {
            await this.delay();
            return generateMockOverviewStats();
        }

        try {
            // Fetch tenants from existing endpoint
            const tenantsResponse = await this.client.get('/tenants', {
                params: { page: 1, pageSize: 1000 }
            });
            const tenants = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : [];

            let totalFarms = 0;
            let totalBarns = 0;

            // Aggregate farms and barns from each tenant
            for (const tenant of tenants) {
                // Fetch farms for this tenant
                try {
                    const farmsResponse = await this.client.get('/farms', {
                        params: { tenantId: tenant.id || tenant.tenantId, page: 1, pageSize: 1000 }
                    });
                    const farms = Array.isArray(farmsResponse.data) ? farmsResponse.data : [];
                    totalFarms += farms.length;

                    // Count barns from each farm
                    for (const farm of farms) {
                        if (farm.barns && Array.isArray(farm.barns)) {
                            totalBarns += farm.barns.length;
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to fetch farms for tenant ${tenant.id}`, error);
                }
            }

            return {
                totalTenants: tenants.length,
                totalFarms,
                totalBarns,
                totalDevices: 0, // TODO: Add when device endpoint available
                devicesOnline: 0,
                devicesOffline: 0,
                lastDataIngest: new Date().toISOString(),
                lastSync: new Date().toISOString(),
                topAlerts: [],
                systemHealth: {
                    api: 'healthy' as const,
                    database: 'healthy' as const,
                    mqtt: 'unknown' as const,
                    storage: 'healthy' as const,
                },
            };
        } catch (error) {
            console.error('Failed to fetch overview stats:', error);
            // Return empty stats on error
            return {
                totalTenants: 0,
                totalFarms: 0,
                totalBarns: 0,
                totalDevices: 0,
                devicesOnline: 0,
                devicesOffline: 0,
                lastDataIngest: null as any,
                lastSync: null as any,
                topAlerts: [],
                systemHealth: {
                    api: 'degraded' as const,
                    database: 'unknown' as const,
                    mqtt: 'unknown' as const,
                    storage: 'unknown' as const,
                },
            };
        }
    }

    // ============================================================================
    // Tenants
    // ============================================================================

    async getTenants(params: {
        page?: number;
        pageSize?: number;
        search?: string;
        status?: string;
        type?: string;
        region?: string;
    } = {}): Promise<PaginatedResponse<MockTenant>> {
        // TODO: Replace with real API endpoint: GET /api/v1/admin/tenants
        if (USE_MOCKS) {
            await this.delay();

            let filtered = this.mockData.tenants;

            // Apply filters
            if (params.status) {
                filtered = filtered.filter(t => t.status === params.status);
            }
            if (params.type) {
                filtered = filtered.filter(t => t.type === params.type);
            }
            if (params.region) {
                filtered = filtered.filter(t => t.region === params.region);
            }

            // Apply search
            if (params.search) {
                filtered = searchData(filtered, params.search, ['name', 'region']);
            }

            return paginateData(filtered, params.page || 0, params.pageSize || 25);
        }

        const response = await this.client.get('/admin/tenants', { params });
        return response.data;
    }

    async getTenantById(id: string): Promise<MockTenant> {
        // TODO: Replace with real API endpoint: GET /api/admin/tenants/:id
        if (USE_MOCKS) {
            await this.delay();
            const tenant = this.mockData.tenants.find(t => t.id === id);
            if (!tenant) throw new Error('Tenant not found');
            return tenant;
        }

        const response = await this.client.get(`/admin/tenants/${id}`);
        return response.data;
    }

    async createTenant(data: Partial<MockTenant>): Promise<MockTenant> {
        // TODO: Replace with real API endpoint: POST /api/v1/admin/tenants
        if (USE_MOCKS) {
            await this.delay();
            const newTenant: MockTenant = {
                id: `tenant_${Date.now()}`,
                name: data.name || 'New Tenant',
                type: (data.type as MockTenant['type']) || 'standard',
                status: 'active',
                region: data.region || 'TH',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                farmCount: 0,
                barnCount: 0,
                batchCount: 0,
                deviceCount: 0,
                sensorCount: 0,
                sensorBindingCount: 0,
                sensorCalibrationCount: 0,
                userCount: 0,
            };
            this.mockData.tenants.unshift(newTenant);
            return newTenant;
        }

        const response = await this.client.post('/admin/tenants', data);
        return response.data;
    }

    async updateTenant(id: string, data: Partial<MockTenant>): Promise<MockTenant> {
        // TODO: Replace with real API endpoint: PATCH /api/v1/admin/tenants/:id
        if (USE_MOCKS) {
            await this.delay();
            const index = this.mockData.tenants.findIndex(t => t.id === id);
            if (index === -1) throw new Error('Tenant not found');

            this.mockData.tenants[index] = {
                ...this.mockData.tenants[index],
                ...data,
                updatedAt: new Date().toISOString(),
            };
            return this.mockData.tenants[index];
        }

        const response = await this.client.patch(`/admin/tenants/${id}`, data);
        return response.data;
    }

    async deleteTenant(id: string): Promise<void> {
        // TODO: Replace with real API endpoint: DELETE /api/v1/admin/tenants/:id
        if (USE_MOCKS) {
            await this.delay();
            this.mockData.tenants = this.mockData.tenants.filter(t => t.id !== id);
            return;
        }

        await this.client.delete(`/admin/tenants/${id}`);
    }

    // ============================================================================
    // Users
    // ============================================================================

    async getUsers(params: {
        page?: number;
        pageSize?: number;
        search?: string;
        status?: string;
        role?: string;
        tenantId?: string;
    } = {}): Promise<PaginatedResponse<MockUser>> {
        // TODO: Replace with real API endpoint: GET /api/v1/admin/users
        if (USE_MOCKS) {
            await this.delay();

            let filtered = this.mockData.users;

            // Apply filters
            if (params.status) {
                filtered = filtered.filter(u => u.status === params.status);
            }
            if (params.role) {
                filtered = filtered.filter(u => u.roles?.includes(params.role!));
            }
            if (params.tenantId) {
                filtered = filtered.filter(u => u.tenantId === params.tenantId);
            }

            // Apply search
            if (params.search) {
                filtered = searchData(filtered, params.search, ['name', 'email']);
            }

            return paginateData(filtered, params.page || 0, params.pageSize || 25);
        }

        const response = await this.client.get('/admin/users', { params });
        return response.data;
    }

    async getUserById(id: string): Promise<MockUser> {
        // TODO: Replace with real API endpoint: GET /api/admin/users/:id
        if (USE_MOCKS) {
            await this.delay();
            const user = this.mockData.users.find(u => u.id === id);
            if (!user) throw new Error('User not found');
            return user;
        }

        const response = await this.client.get(`/api/admin/users/${id}`);
        return response.data;
    }

    // ============================================================================
    // Devices
    // ============================================================================

    async getDevices(params: {
        page?: number;
        pageSize?: number;
        search?: string;
        status?: string;
        type?: string;
        tenantId?: string;
        farmId?: string;
        barnId?: string;
    } = {}): Promise<PaginatedResponse<MockDevice>> {
        // TODO: Replace with real API endpoint: GET /api/v1/admin/devices
        if (USE_MOCKS) {
            await this.delay();

            let filtered = this.mockData.devices;

            // Apply filters
            if (params.status) {
                filtered = filtered.filter(d => d.status === params.status);
            }
            if (params.type) {
                filtered = filtered.filter(d => d.type === params.type);
            }
            if (params.tenantId) {
                filtered = filtered.filter(d => d.tenantId === params.tenantId);
            }
            if (params.farmId) {
                filtered = filtered.filter(d => d.farmId === params.farmId);
            }
            if (params.barnId) {
                filtered = filtered.filter(d => d.barnId === params.barnId);
            }

            // Apply search
            if (params.search) {
                filtered = searchData(filtered, params.search, ['name', 'ipAddress']);
            }

            return paginateData(filtered, params.page || 0, params.pageSize || 25);
        }

        const response = await this.client.get('/admin/devices', { params });
        return response.data;
    }

    async getDeviceById(id: string): Promise<MockDevice> {
        // TODO: Replace with real API endpoint: GET /api/v1/admin/devices/:id
        if (USE_MOCKS) {
            await this.delay();
            const device = this.mockData.devices.find(d => d.id === id);
            if (!device) throw new Error('Device not found');
            return device;
        }

        const response = await this.client.get(`/admin/devices/${id}`);
        return response.data;
    }

    // ============================================================================
    // Audit Log
    // ============================================================================

    async getAuditLog(params: {
        page?: number;
        pageSize?: number;
        search?: string;
        action?: string;
        resource?: string;
        userId?: string;
        tenantId?: string;
        startDate?: string;
        endDate?: string;
    } = {}): Promise<PaginatedResponse<MockAuditEntry>> {
        // TODO: Replace with real API endpoint: GET /api/v1/admin/audit-log
        if (USE_MOCKS) {
            await this.delay();

            let filtered = this.mockData.auditEntries;

            // Apply filters
            if (params.action) {
                filtered = filtered.filter(e => e.action === params.action);
            }
            if (params.resource) {
                filtered = filtered.filter(e => e.resource === params.resource);
            }
            if (params.userId) {
                filtered = filtered.filter(e => e.userId === params.userId);
            }
            if (params.tenantId) {
                filtered = filtered.filter(e => e.tenantId === params.tenantId);
            }

            // Apply search
            if (params.search) {
                filtered = searchData(filtered, params.search, ['userName', 'action', 'resource']);
            }

            return paginateData(filtered, params.page || 0, params.pageSize || 25);
        }

        const response = await this.client.get('/admin/audit-log', { params });
        return response.data;
    }

    async getAuditEntryById(id: string): Promise<MockAuditEntry> {
        // TODO: Replace with real API endpoint: GET /api/v1/admin/audit-log/:id
        if (USE_MOCKS) {
            await this.delay();
            const entry = this.mockData.auditEntries.find(e => e.id === id);
            if (!entry) throw new Error('Audit entry not found');
            return entry;
        }

        const response = await this.client.get(`/admin/audit-log/${id}`);
        return response.data;
    }
}

// Export singleton instance
export const adminApiClient = new AdminApiClient();
export default adminApiClient;
