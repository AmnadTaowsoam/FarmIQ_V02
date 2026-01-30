/**
 * Canonical API endpoint definitions
 * All API paths should be defined here for consistency
 */

// Base paths
export const BASE_PATH = '/api/v1';

// Auth endpoints
export const AUTH_ENDPOINTS = {
    LOGIN: `${BASE_PATH}/auth/login`,
    REFRESH: `${BASE_PATH}/auth/refresh`,
    LOGOUT: `${BASE_PATH}/auth/logout`,
    ME: `${BASE_PATH}/auth/me`,
} as const;

// Registry endpoints (tenant-registry service via BFF)
export const REGISTRY_ENDPOINTS = {
    TENANTS: `${BASE_PATH}/tenants`,
    TENANT_BY_ID: (id: string) => `${BASE_PATH}/tenants/${id}`,

    FARMS: `${BASE_PATH}/farms`,
    FARM_BY_ID: (id: string) => `${BASE_PATH}/farms/${id}`,

    BARNS: `${BASE_PATH}/barns`,
    BARN_BY_ID: (id: string) => `${BASE_PATH}/barns/${id}`,

    BATCHES: `${BASE_PATH}/batches`,
    BATCH_BY_ID: (id: string) => `${BASE_PATH}/batches/${id}`,

    DEVICES: `${BASE_PATH}/devices`,
    DEVICE_BY_ID: (id: string) => `${BASE_PATH}/devices/${id}`,

    TOPOLOGY: `${BASE_PATH}/topology`,
} as const;

// Sensor endpoints (tenant-registry sensor module via BFF)
export const SENSOR_ENDPOINTS = {
    SENSORS: `${BASE_PATH}/sensors`,
    SENSOR_BY_ID: (id: string) => `${BASE_PATH}/sensors/${id}`,
    SENSOR_BINDINGS: (sensorId: string) => `${BASE_PATH}/sensors/${sensorId}/bindings`,
    SENSOR_BINDING_BY_ID: (sensorId: string, bindingId: string) =>
        `${BASE_PATH}/sensors/${sensorId}/bindings/${bindingId}`,
    SENSOR_CALIBRATIONS: (sensorId: string) => `${BASE_PATH}/sensors/${sensorId}/calibrations`,
    SENSOR_CALIBRATION_BY_ID: (sensorId: string, calibrationId: string) =>
        `${BASE_PATH}/sensors/${sensorId}/calibrations/${calibrationId}`,
} as const;

// Dashboard endpoints (BFF aggregation)
export const DASHBOARD_ENDPOINTS = {
    OVERVIEW: `${BASE_PATH}/dashboard/overview`,
    FARM: (farmId: string) => `${BASE_PATH}/dashboard/farms/${farmId}`,
    BARN: (barnId: string) => `${BASE_PATH}/dashboard/barns/${barnId}`,
    ALERTS: `${BASE_PATH}/dashboard/alerts`,
} as const;

// Telemetry endpoints
export const TELEMETRY_ENDPOINTS = {
    READINGS: `${BASE_PATH}/telemetry/readings`,
    AGGREGATES: `${BASE_PATH}/telemetry/aggregates`,
    METRICS: `${BASE_PATH}/telemetry/metrics`,
} as const;

// WeighVision endpoints
export const WEIGHVISION_ENDPOINTS = {
    SESSIONS: `${BASE_PATH}/weighvision/sessions`,
    SESSION_BY_ID: (id: string) => `${BASE_PATH}/weighvision/sessions/${id}`,
    ANALYTICS: `${BASE_PATH}/weighvision/analytics`,
} as const;

// Standards endpoints (cloud-standards-service via BFF)
export const STANDARDS_ENDPOINTS = {
    SETS: `${BASE_PATH}/standards/sets`,
    SET_BY_ID: (setId: string) => `${BASE_PATH}/standards/sets/${setId}`,
    ROWS: (setId: string) => `${BASE_PATH}/standards/sets/${setId}/rows`,
    RESOLVE: `${BASE_PATH}/standards/resolve`,
    CLONE: (setId: string) => `${BASE_PATH}/standards/sets/${setId}/clone`,
    ADJUST: (setId: string) => `${BASE_PATH}/standards/sets/${setId}/adjust`,
    IMPORT_CSV: `${BASE_PATH}/standards/imports/csv`,
    IMPORT_JOB: (jobId: string) => `${BASE_PATH}/standards/imports/${jobId}`,
} as const;

// Feeding endpoints (cloud-feed-service via BFF)
export const FEEDING_ENDPOINTS = {
    KPI: `${BASE_PATH}/kpi/feeding`,

    INTAKE_RECORDS: `${BASE_PATH}/feed/intake-records`,
    INTAKE_RECORD_BY_ID: (id: string) => `${BASE_PATH}/feed/intake-records/${id}`,

    LOTS: `${BASE_PATH}/feed/lots`,
    LOT_BY_ID: (id: string) => `${BASE_PATH}/feed/lots/${id}`,

    DELIVERIES: `${BASE_PATH}/feed/deliveries`,
    DELIVERY_BY_ID: (id: string) => `${BASE_PATH}/feed/deliveries/${id}`,

    QUALITY_RESULTS: `${BASE_PATH}/feed/quality-results`,
    QUALITY_RESULT_BY_ID: (id: string) => `${BASE_PATH}/feed/quality-results/${id}`,

    FORMULAS: `${BASE_PATH}/feed/formulas`,
    FORMULA_BY_ID: (id: string) => `${BASE_PATH}/feed/formulas/${id}`,

    PROGRAMS: `${BASE_PATH}/feed/programs`,
    PROGRAM_BY_ID: (id: string) => `${BASE_PATH}/feed/programs/${id}`,

    INVENTORY_SNAPSHOTS: `${BASE_PATH}/feed/inventory-snapshots`,
} as const;

// Barn Records endpoints (cloud-barn-records-service via BFF)
export const BARN_RECORDS_ENDPOINTS = {
    MORTALITY: `${BASE_PATH}/barn-records/mortality`,
    MORBIDITY: `${BASE_PATH}/barn-records/morbidity`,
    VACCINES: `${BASE_PATH}/barn-records/vaccines`,
    TREATMENTS: `${BASE_PATH}/barn-records/treatments`,
    DAILY_COUNTS: `${BASE_PATH}/barn-records/daily-counts`,
    WELFARE_CHECKS: `${BASE_PATH}/barn-records/welfare-checks`,
    HOUSING_CONDITIONS: `${BASE_PATH}/barn-records/housing-conditions`,
    GENETICS: `${BASE_PATH}/barn-records/genetics`,
} as const;

// Analytics endpoints
export const ANALYTICS_ENDPOINTS = {
    KPIS: `${BASE_PATH}/analytics/kpis`,
    ANOMALIES: `${BASE_PATH}/analytics/anomalies`,
    ANOMALY_BY_ID: (id: string) => `${BASE_PATH}/analytics/anomalies/${id}`,
    ANOMALY_ACKNOWLEDGE: (id: string) => `${BASE_PATH}/analytics/anomalies/${id}/acknowledge`,
    RECOMMENDATIONS: `${BASE_PATH}/analytics/recommendations`,
    FORECASTS: `${BASE_PATH}/analytics/forecasts`,
    SCENARIO: `${BASE_PATH}/analytics/scenario`,
} as const;

// Ops endpoints
export const OPS_ENDPOINTS = {
    DATA_QUALITY: `${BASE_PATH}/ops/data-quality`,
    HEALTH: `${BASE_PATH}/ops/health`,
} as const;

// Admin endpoints
export const ADMIN_ENDPOINTS = {
    USERS: `${BASE_PATH}/admin/users`,
    USER_BY_ID: (id: string) => `${BASE_PATH}/admin/users/${id}`,
    AUDIT: `${BASE_PATH}/admin/audit`,
    SETTINGS: `${BASE_PATH}/admin/settings`,
} as const;

// Reports endpoints
export const REPORTS_ENDPOINTS = {
    JOBS: `${BASE_PATH}/reports/jobs`,
    JOB_BY_ID: (id: string) => `${BASE_PATH}/reports/jobs/${id}`,
    JOB_DOWNLOAD: (id: string) => `${BASE_PATH}/reports/jobs/${id}/download`,
} as const;

// Audit endpoints
export const AUDIT_ENDPOINTS = {
    EVENTS: `${BASE_PATH}/audit/events`,
} as const;

// Notification endpoints
export const NOTIFICATION_ENDPOINTS = {
    SEND: `${BASE_PATH}/notifications/send`,
    HISTORY: `${BASE_PATH}/notifications/history`,
} as const;
