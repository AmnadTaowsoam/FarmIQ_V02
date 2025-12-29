/**
 * Mock Data Generators for Admin API
 * 
 * Provides realistic mock data for UI development when backend endpoints are missing.
 * All data is generated with realistic shapes matching expected API responses.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Tenant Mock Data
// ============================================================================

export interface MockTenant {
    id: string;
    name: string;
    type: 'enterprise' | 'standard' | 'trial';
    status: 'active' | 'suspended' | 'inactive';
    region: string;
    createdAt: string;
    updatedAt: string;
    farmCount: number;
    barnCount: number;
    batchCount: number;
    deviceCount: number;
    sensorCount: number;
    sensorBindingCount: number;
    sensorCalibrationCount: number;
    userCount?: number;
}

export function generateMockTenants(count: number = 50): MockTenant[] {
    const types: MockTenant['type'][] = ['enterprise', 'standard', 'trial'];
    const statuses: MockTenant['status'][] = ['active', 'suspended', 'inactive'];
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2'];
    const names = [
        'Acme Farms', 'Green Valley Poultry', 'Sunrise Agriculture', 'Golden Harvest',
        'Blue Sky Farms', 'Mountain View Ranch', 'Coastal Poultry Co', 'Prairie Farms',
        'Riverside Agriculture', 'Highland Farms', 'Valley View Poultry', 'Meadow Farms',
    ];

    return Array.from({ length: count }, (_, i) => ({
        id: uuidv4(),
        name: `${names[i % names.length]} ${i > 11 ? i - 11 : ''}`.trim(),
        type: types[Math.floor(Math.random() * types.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        region: regions[Math.floor(Math.random() * regions.length)],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        farmCount: Math.floor(Math.random() * 20) + 1,
        barnCount: Math.floor(Math.random() * 50) + 5,
        batchCount: Math.floor(Math.random() * 80) + 10,
        deviceCount: Math.floor(Math.random() * 200) + 10,
        sensorCount: Math.floor(Math.random() * 300) + 10,
        sensorBindingCount: Math.floor(Math.random() * 100) + 5,
        sensorCalibrationCount: Math.floor(Math.random() * 100) + 5,
        userCount: Math.floor(Math.random() * 50) + 2,
    }));
}

// ============================================================================
// User Mock Data
// ============================================================================

export interface MockUser {
    id: string;
    email: string;
    name: string;
    roles: string[];
    status: 'active' | 'inactive' | 'suspended';
    tenantId: string;
    tenantName: string;
    lastLogin: string | null;
    createdAt: string;
}

export function generateMockUsers(count: number = 100): MockUser[] {
    const roles = ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'];
    const statuses: MockUser['status'][] = ['active', 'inactive', 'suspended'];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

    return Array.from({ length: count }, (_, i) => {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

        return {
            id: uuidv4(),
            email,
            name: `${firstName} ${lastName}`,
            roles: [roles[Math.floor(Math.random() * roles.length)]],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            tenantId: uuidv4(),
            tenantName: `Tenant ${i % 10}`,
            lastLogin: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
            createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        };
    });
}

// ============================================================================
// Device Mock Data
// ============================================================================

export interface MockDevice {
    id: string;
    name: string;
    type: 'scale' | 'camera' | 'sensor' | 'gateway';
    status: 'online' | 'offline' | 'error';
    tenantId: string;
    tenantName: string;
    farmId: string;
    farmName: string;
    barnId: string | null;
    barnName: string | null;
    lastSeen: string;
    firmwareVersion: string;
    ipAddress: string;
}

export function generateMockDevices(count: number = 200): MockDevice[] {
    const types: MockDevice['type'][] = ['scale', 'camera', 'sensor', 'gateway'];
    const statuses: MockDevice['status'][] = ['online', 'offline', 'error'];

    return Array.from({ length: count }, (_, i) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            id: uuidv4(),
            name: `${type.toUpperCase()}-${String(i).padStart(4, '0')}`,
            type,
            status,
            tenantId: uuidv4(),
            tenantName: `Tenant ${i % 10}`,
            farmId: uuidv4(),
            farmName: `Farm ${i % 20}`,
            barnId: Math.random() > 0.3 ? uuidv4() : null,
            barnName: Math.random() > 0.3 ? `Barn ${i % 30}` : null,
            lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            firmwareVersion: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        };
    });
}

// ============================================================================
// Audit Log Mock Data
// ============================================================================

export interface MockAuditEntry {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    resourceId: string;
    tenantId: string;
    tenantName: string;
    ipAddress: string;
    userAgent: string;
    status: 'success' | 'failure';
    details: Record<string, any>;
}

export function generateMockAuditEntries(count: number = 500): MockAuditEntry[] {
    const actions = [
        'user.login', 'user.logout', 'user.created', 'user.updated', 'user.deleted',
        'tenant.created', 'tenant.updated', 'tenant.deleted',
        'device.created', 'device.updated', 'device.deleted', 'device.configured',
        'settings.updated', 'role.assigned', 'permission.granted',
    ];
    const resources = ['user', 'tenant', 'device', 'settings', 'role', 'permission'];
    const statuses: MockAuditEntry['status'][] = ['success', 'failure'];

    return Array.from({ length: count }, (_, i) => ({
        id: uuidv4(),
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        userId: uuidv4(),
        userName: `User ${i % 50}`,
        action: actions[Math.floor(Math.random() * actions.length)],
        resource: resources[Math.floor(Math.random() * resources.length)],
        resourceId: uuidv4(),
        tenantId: uuidv4(),
        tenantName: `Tenant ${i % 10}`,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: statuses[Math.floor(Math.random() * statuses.length)],
        details: { action: 'Mock audit entry' },
    }));
}

// ============================================================================
// Overview Stats Mock Data
// ============================================================================

export interface MockOverviewStats {
    totalTenants: number;
    totalFarms: number;
    totalBarns: number;
    totalDevices: number;
    devicesOnline: number;
    devicesOffline: number;
    lastDataIngest: string;
    lastSync: string;
    topAlerts: Array<{
        id: string;
        severity: 'critical' | 'warning' | 'info';
        message: string;
        timestamp: string;
    }>;
    systemHealth: {
        api: 'healthy' | 'degraded' | 'critical';
        database: 'healthy' | 'degraded' | 'critical';
        mqtt: 'healthy' | 'degraded' | 'critical';
        storage: 'healthy' | 'degraded' | 'critical';
    };
}

export function generateMockOverviewStats(): MockOverviewStats {
    return {
        totalTenants: 42,
        totalFarms: 156,
        totalBarns: 487,
        totalDevices: 1243,
        devicesOnline: 1156,
        devicesOffline: 87,
        lastDataIngest: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        topAlerts: [
            {
                id: uuidv4(),
                severity: 'critical',
                message: 'Device SCALE-0042 offline for 2 hours',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: uuidv4(),
                severity: 'warning',
                message: 'High memory usage on edge cluster EC-01',
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            },
            {
                id: uuidv4(),
                severity: 'warning',
                message: 'Sync delay detected for Tenant Acme Farms',
                timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            },
        ],
        systemHealth: {
            api: 'healthy',
            database: 'healthy',
            mqtt: 'degraded',
            storage: 'healthy',
        },
    };
}

// ============================================================================
// Pagination Helper
// ============================================================================

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export function paginateData<T>(
    data: T[],
    page: number = 0,
    pageSize: number = 25
): PaginatedResponse<T> {
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedData = data.slice(start, end);

    return {
        data: paginatedData,
        total: data.length,
        page,
        pageSize,
        totalPages: Math.ceil(data.length / pageSize),
    };
}

// ============================================================================
// Search and Filter Helpers
// ============================================================================

export function searchData<T extends Record<string, any>>(
    data: T[],
    searchTerm: string,
    searchFields: (keyof T)[]
): T[] {
    if (!searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item =>
        searchFields.some(field => {
            const value = item[field];
            return value && String(value).toLowerCase().includes(lowerSearch);
        })
    );
}

export function filterData<T extends Record<string, any>>(
    data: T[],
    filters: Record<string, any>
): T[] {
    return data.filter(item =>
        Object.entries(filters).every(([key, value]) => {
            if (value === null || value === undefined || value === '') return true;
            return item[key] === value;
        })
    );
}
