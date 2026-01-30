/**
 * Centralized React Query keys for consistent cache management
 */

export const queryKeys = {
    // Auth
    auth: {
        me: ['auth', 'me'] as const,
    },

    // Tenants
    tenants: {
        all: ['tenants'] as const,
        detail: (id: string) => ['tenants', id] as const,
    },

    // Farms
    farms: {
        all: (tenantId?: string) => ['farms', { tenantId }] as const,
        detail: (id: string) => ['farms', id] as const,
        byTenant: (tenantId: string) => ['farms', 'tenant', tenantId] as const,
    },

    // Barns
    barns: {
        all: (params?: { tenantId?: string; farmId?: string }) => ['barns', params] as const,
        detail: (id: string) => ['barns', id] as const,
        byFarm: (farmId: string) => ['barns', 'farm', farmId] as const,
    },

    // Batches
    batches: {
        all: (params?: { tenantId?: string; farmId?: string; barnId?: string }) => ['batches', params] as const,
        detail: (id: string) => ['batches', id] as const,
    },

    // Devices
    devices: {
        all: (params?: { tenantId?: string; farmId?: string; barnId?: string }) => ['devices', params] as const,
        detail: (id: string) => ['devices', id] as const,
    },

    // Dashboard
    dashboard: {
        overview: (params?: { tenantId?: string; farmId?: string; barnId?: string }) => ['dashboard', 'overview', params] as const,
        farm: (farmId: string) => ['dashboard', 'farm', farmId] as const,
        barn: (barnId: string) => ['dashboard', 'barn', barnId] as const,
        alerts: ['dashboard', 'alerts'] as const,
    },

    // Telemetry
    telemetry: {
        readings: (params: { farmId?: string; barnId?: string; startTime: string; endTime: string }) =>
            ['telemetry', 'readings', params] as const,
        aggregates: (params: { farmId?: string; barnId?: string; startTime: string; endTime: string; interval?: string }) =>
            ['telemetry', 'aggregates', params] as const,
        metrics: (params: { farmId?: string; barnId?: string; startTime: string; endTime: string }) =>
            ['telemetry', 'metrics', params] as const,
    },

    // WeighVision
    weighvision: {
        sessions: (params?: { farmId?: string; barnId?: string; status?: string }) =>
            ['weighvision', 'sessions', params] as const,
        session: (id: string) => ['weighvision', 'session', id] as const,
    },

    // Sensors
    sensors: {
        all: (params?: { barnId?: string; deviceId?: string; type?: string }) => ['sensors', params] as const,
        detail: (id: string) => ['sensors', id] as const,
        bindings: (sensorId: string) => ['sensors', sensorId, 'bindings'] as const,
        calibrations: (sensorId: string) => ['sensors', sensorId, 'calibrations'] as const,
    },

    // Feeding
    feeding: {
        kpi: (params: { tenantId: string; barnId?: string; startDate: string; endDate: string }) =>
            ['feeding', 'kpi', params] as const,
        intakeRecords: (params?: any) => ['feeding', 'intake-records', params] as const,
        lots: (params?: any) => ['feeding', 'lots', params] as const,
        deliveries: (params?: any) => ['feeding', 'deliveries', params] as const,
        qualityResults: (params?: any) => ['feeding', 'quality-results', params] as const,
        formulas: (params?: any) => ['feeding', 'formulas', params] as const,
        programs: (params?: any) => ['feeding', 'programs', params] as const,
    },

    // Analytics
    analytics: {
        anomalies: (params?: { tenantId?: string; farmId?: string; barnId?: string; startTime?: string; endTime?: string }) =>
            ['analytics', 'anomalies', params] as const,
        recommendations: (params?: { tenantId?: string; farmId?: string; barnId?: string }) =>
            ['analytics', 'recommendations', params] as const,
    },

    // Insights
    insights: {
        all: (params?: { tenantId?: string }) => ['insights', params] as const,
        detail: (id: string) => ['insights', id] as const,
    },

    // Barn Records
    barnRecords: {
        dailyCounts: (params?: any) => ['barn-records', 'daily-counts', params] as const,
    },

    // Reports
    reports: {
        jobs: (params?: { status?: string; job_type?: string }) => ['reports', 'jobs', params] as const,
        job: (id: string) => ['reports', 'job', id] as const,
    },
} as const;

// Default stale time for queries (5 minutes)
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

// Query options presets
export const queryOptions = {
    default: {
        staleTime: DEFAULT_STALE_TIME,
        refetchOnWindowFocus: false,
    },
    realtime: {
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // 1 minute
        refetchOnWindowFocus: true,
    },
    static: {
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    },
} as const;
