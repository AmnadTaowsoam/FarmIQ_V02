import httpClient, { isApiError, getErrorMessage, getCorrelationId, API_BASE_URL } from './http';
import type { AxiosResponse } from 'axios';
import { SENSOR_ENDPOINTS, REGISTRY_ENDPOINTS, FEEDING_ENDPOINTS, BARN_RECORDS_ENDPOINTS, DASHBOARD_ENDPOINTS, TELEMETRY_ENDPOINTS, WEIGHVISION_ENDPOINTS, REPORTS_ENDPOINTS, OPS_ENDPOINTS, ADMIN_ENDPOINTS, ANALYTICS_ENDPOINTS } from './endpoints';


// Re-export for backward compatibility
export { isApiError, getErrorMessage, getCorrelationId };
export const getBFFBaseURL = () => API_BASE_URL;
export const isMockMode = () => import.meta.env.VITE_MOCK_MODE === 'true';
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

export interface Sensor {
    sensor_id: string;
    tenant_id: string;
    barn_id?: string;
    zone?: string;
    type: string;
    unit: string;
    label: string;
    enabled: boolean;
    last_calibration_at?: string;
    created_at: string;
    updated_at: string;
}

export interface SensorBinding {
    binding_id: string;
    sensor_id: string;
    device_id: string;
    protocol: string;
    channel?: string;
    topic?: string;
    register?: string;
    sampling_rate_seconds?: number;
    effective_from: string;
    effective_to?: string;
    created_at: string;
}

export interface SensorCalibration {
    calibration_id: string;
    sensor_id: string;
    performed_at: string;
    method: string;
    offset?: number;
    gain?: number;
    performed_by: string;
    notes?: string;
    created_at: string;
}

export interface ReportJob {
    id: string;
    tenant_id: string;
    requested_by?: string;
    job_type: string;
    format: string;
    farm_id?: string | null;
    barn_id?: string | null;
    batch_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status: string;
    progress_pct?: number | null;
    created_at: string;
    updated_at: string;
    finished_at?: string | null;
    error_message?: string | null;
}

// API client
export const api = {
    // ==================== Sensors ====================
    sensors: {
        list: (params?: { tenantId?: string; barnId?: string; deviceId?: string; type?: string; enabled?: boolean; q?: string; page?: number; pageSize?: number }) =>
            httpClient.get<ApiResponse<Sensor[]>>(SENSOR_ENDPOINTS.SENSORS, { params }),

        get: (sensorId: string) =>
            httpClient.get<ApiResponse<Sensor>>(SENSOR_ENDPOINTS.SENSOR_BY_ID(sensorId)),

        create: (data: Partial<Sensor>) =>
            httpClient.post<ApiResponse<Sensor>>(SENSOR_ENDPOINTS.SENSORS, data),

        update: (sensorId: string, data: Partial<Sensor>) =>
            httpClient.patch<ApiResponse<Sensor>>(SENSOR_ENDPOINTS.SENSOR_BY_ID(sensorId), data),

        delete: (sensorId: string) =>
            httpClient.delete(SENSOR_ENDPOINTS.SENSOR_BY_ID(sensorId)),

        // Bindings
        bindings: {
            list: (sensorId: string, params?: { page?: number; pageSize?: number }) =>
                httpClient.get<ApiResponse<SensorBinding[]>>(SENSOR_ENDPOINTS.SENSOR_BINDINGS(sensorId), { params }),

            create: (sensorId: string, data: Partial<SensorBinding>) =>
                httpClient.post<ApiResponse<SensorBinding>>(SENSOR_ENDPOINTS.SENSOR_BINDINGS(sensorId), data),
        },

        // Calibrations
        calibrations: {
            list: (sensorId: string, params?: { page?: number; pageSize?: number }) =>
                httpClient.get<ApiResponse<SensorCalibration[]>>(SENSOR_ENDPOINTS.SENSOR_CALIBRATIONS(sensorId), { params }),

            create: (sensorId: string, data: Partial<SensorCalibration>) =>
                httpClient.post<ApiResponse<SensorCalibration>>(SENSOR_ENDPOINTS.SENSOR_CALIBRATIONS(sensorId), data),
        },
    },

    // ==================== Registry (Farms, Barns, Devices) ====================
    tenants: {
        list: (params?: { page?: number; pageSize?: number }) => httpClient.get<ApiResponse<any[]>>(REGISTRY_ENDPOINTS.TENANTS, { params }),
        get: (id: string, params?: { tenantId?: string }) =>
            httpClient.get<ApiResponse<any>>(REGISTRY_ENDPOINTS.TENANT_BY_ID(id), { params }),
    },

    farms: {
        list: (params?: { tenantId?: string; page?: number; pageSize?: number }) =>
            httpClient.get<ApiResponse<any[]>>(REGISTRY_ENDPOINTS.FARMS, { params }),
        get: (id: string, params?: { tenantId?: string }) =>
            httpClient.get<ApiResponse<any>>(REGISTRY_ENDPOINTS.FARM_BY_ID(id), { params }),
        create: (data: any) => httpClient.post<ApiResponse<any>>(REGISTRY_ENDPOINTS.FARMS, data),
    },

    barns: {
        list: (params?: { tenantId?: string; farmId?: string; page?: number; pageSize?: number }) =>
            httpClient.get<ApiResponse<any[]>>(REGISTRY_ENDPOINTS.BARNS, { params }),
        get: (id: string, params?: { tenantId?: string }) =>
            httpClient.get<ApiResponse<any>>(REGISTRY_ENDPOINTS.BARN_BY_ID(id), { params }),
        create: (data: any) => httpClient.post<ApiResponse<any>>(REGISTRY_ENDPOINTS.BARNS, data),
    },

    batches: {
        list: (params?: { tenantId?: string; farmId?: string; barnId?: string; page?: number; pageSize?: number }) =>
            httpClient.get<ApiResponse<any[]>>(REGISTRY_ENDPOINTS.BATCHES, { params }),
        get: (id: string, params?: { tenantId?: string }) =>
            httpClient.get<ApiResponse<any>>(REGISTRY_ENDPOINTS.BATCH_BY_ID(id), { params }),
        create: (data: any) => httpClient.post<ApiResponse<any>>(REGISTRY_ENDPOINTS.BATCHES, data),
    },

    devices: {
        list: (params?: { tenantId?: string; farmId?: string; barnId?: string; page?: number; pageSize?: number }) =>
            httpClient.get<ApiResponse<any[]>>(REGISTRY_ENDPOINTS.DEVICES, { params }),
        get: (id: string, params?: { tenantId?: string }) =>
            httpClient.get<ApiResponse<any>>(REGISTRY_ENDPOINTS.DEVICE_BY_ID(id), { params }),
        create: (data: any) => httpClient.post<ApiResponse<any>>(REGISTRY_ENDPOINTS.DEVICES, data),
    },

    // ==================== Dashboard ====================
    dashboard: {
        overview: () => httpClient.get<ApiResponse<any>>(DASHBOARD_ENDPOINTS.OVERVIEW),
        farm: (farmId: string) => httpClient.get<ApiResponse<any>>(DASHBOARD_ENDPOINTS.FARM(farmId)),
        barn: (barnId: string) => httpClient.get<ApiResponse<any>>(DASHBOARD_ENDPOINTS.BARN(barnId)),
        alerts: () => httpClient.get<ApiResponse<any[]>>(DASHBOARD_ENDPOINTS.ALERTS),
    },

    // ==================== Telemetry ====================
    telemetry: {
        readings: (params: any) => httpClient.get<ApiResponse<any[]>>(TELEMETRY_ENDPOINTS.READINGS, { params }),
        aggregates: (params: any) => httpClient.get<ApiResponse<any[]>>(TELEMETRY_ENDPOINTS.AGGREGATES, { params }),
        metrics: (params: any) => httpClient.get<ApiResponse<any[]>>(TELEMETRY_ENDPOINTS.METRICS, { params }),
    },

    // Legacy/convenience method for latest telemetry readings
    telemetryLatest: (params: { tenantId: string; barn_id?: string; farm_id?: string }) =>
        httpClient.get<ApiResponse<any>>(TELEMETRY_ENDPOINTS.READINGS, { params: { ...params, latest: true } }),

    // ==================== WeighVision ====================
    weighvision: {
        sessions: (params?: any) => httpClient.get<ApiResponse<any[]>>(WEIGHVISION_ENDPOINTS.SESSIONS, { params }),
        session: (id: string, params?: any) =>
            httpClient.get<ApiResponse<any>>(WEIGHVISION_ENDPOINTS.SESSION_BY_ID(id), { params }),
        analytics: (params?: any) => httpClient.get<ApiResponse<any>>(WEIGHVISION_ENDPOINTS.ANALYTICS, { params }),
    },
    // Legacy compatibility - direct access to weighvisionAnalytics
    weighvisionAnalytics: (params?: any) => httpClient.get<ApiResponse<any>>(WEIGHVISION_ENDPOINTS.ANALYTICS, { params }),

    // ==================== Feeding ====================
    feeding: {
        kpi: (params: { tenantId: string; barnId?: string; startDate: string; endDate: string }) =>
            httpClient.get<ApiResponse<any>>(FEEDING_ENDPOINTS.KPI, { params }),

        intakeRecords: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(FEEDING_ENDPOINTS.INTAKE_RECORDS, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(FEEDING_ENDPOINTS.INTAKE_RECORDS, data),
        },

        lots: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(FEEDING_ENDPOINTS.LOTS, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(FEEDING_ENDPOINTS.LOTS, data),
        },

        deliveries: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(FEEDING_ENDPOINTS.DELIVERIES, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(FEEDING_ENDPOINTS.DELIVERIES, data),
        },

        qualityResults: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(FEEDING_ENDPOINTS.QUALITY_RESULTS, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(FEEDING_ENDPOINTS.QUALITY_RESULTS, data),
        },

        formulas: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(FEEDING_ENDPOINTS.FORMULAS, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(FEEDING_ENDPOINTS.FORMULAS, data),
        },

        programs: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(FEEDING_ENDPOINTS.PROGRAMS, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(FEEDING_ENDPOINTS.PROGRAMS, data),
        },
    },

    // ==================== Barn Records ====================
    barnRecords: {
        mortality: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.MORTALITY, data),
        },
        morbidity: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.MORBIDITY, data),
        },
        vaccines: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.VACCINES, data),
        },
        treatments: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.TREATMENTS, data),
        },
        dailyCounts: {
            list: (params?: any) => httpClient.get<ApiResponse<any[]>>(BARN_RECORDS_ENDPOINTS.DAILY_COUNTS, { params }),
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.DAILY_COUNTS, data),
        },
        welfareChecks: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.WELFARE_CHECKS, data),
        },
        housingConditions: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.HOUSING_CONDITIONS, data),
        },
        genetics: {
            create: (data: any) => httpClient.post<ApiResponse<any>>(BARN_RECORDS_ENDPOINTS.GENETICS, data),
        },
    },

    // ==================== Reports ====================
    reports: {
        listJobs: (params?: {
            status?: string;
            job_type?: string;
            created_from?: string;
            created_to?: string;
            cursor?: string;
            limit?: number;
        }) =>
            httpClient.get<ApiResponse<{ items: ReportJob[]; next_cursor?: string | null }>>(
                REPORTS_ENDPOINTS.JOBS,
                { params }
            ),
        getJob: (jobId: string) => httpClient.get<ApiResponse<ReportJob>>(REPORTS_ENDPOINTS.JOB_BY_ID(jobId)),
        createJob: (data: {
            job_type: string;
            format: string;
            farm_id?: string;
            barn_id?: string;
            batch_id?: string;
            start_date?: string;
            end_date?: string;
        }) => httpClient.post<ApiResponse<ReportJob>>(REPORTS_ENDPOINTS.JOBS, data),
        downloadJob: (jobId: string) =>
            httpClient.get<ApiResponse<{ download_url?: string }>>(REPORTS_ENDPOINTS.JOB_DOWNLOAD(jobId)),
    },

    // ==================== Legacy compatibility ====================
    // Keep these for backward compatibility with existing code
    tenantsList: () => httpClient.get<{ data: any[] }>(REGISTRY_ENDPOINTS.TENANTS),
    farmsList: (query?: any) => httpClient.get<{ data: any[] }>(REGISTRY_ENDPOINTS.FARMS, { params: query }),
    barnsList: (query?: any) => httpClient.get<{ data: any[] }>(REGISTRY_ENDPOINTS.BARNS, { params: query }),
    devicesList: (query?: any) => httpClient.get<{ data: any[] }>(REGISTRY_ENDPOINTS.DEVICES, { params: query }),
    telemetryReadingsList: (params?: any) => httpClient.get<{ data: { readings: any[] } }>(TELEMETRY_ENDPOINTS.READINGS, { params }),

    // Additional convenience methods to prevent "is not a function" errors
    telemetryReadings: (params?: any) => httpClient.get<ApiResponse<any[]>>(TELEMETRY_ENDPOINTS.READINGS, { params }),
    opsDataQuality: (params?: any) => httpClient.get<ApiResponse<any>>(OPS_ENDPOINTS.DATA_QUALITY, { params }),
    opsHealth: (params?: any) => httpClient.get<ApiResponse<any>>(OPS_ENDPOINTS.HEALTH, { params }),
    feedingFcr: (params?: any) => httpClient.get<ApiResponse<any>>(FEEDING_ENDPOINTS.KPI, { params }),
    adminAuditList: (params?: any) => httpClient.get<ApiResponse<any[]>>(ADMIN_ENDPOINTS.AUDIT, { params }),
    adminUsersList: (params?: any) => httpClient.get<ApiResponse<any[]>>(ADMIN_ENDPOINTS.USERS, { params }),
    analyticsRecommendationsList: (params?: any) => httpClient.get<ApiResponse<any[]>>(ANALYTICS_ENDPOINTS.RECOMMENDATIONS, { params }),
    analyticsAnomaliesList: (params?: any) => httpClient.get<ApiResponse<any[]>>(ANALYTICS_ENDPOINTS.ANOMALIES, { params }),
    analyticsAnomaliesAcknowledge: (params: { anomalyId: string }, data?: any) =>
        httpClient.post<ApiResponse<any>>(ANALYTICS_ENDPOINTS.ANOMALY_ACKNOWLEDGE(params.anomalyId), data),
    analyticsScenario: (params?: any) => httpClient.post<ApiResponse<any>>(ANALYTICS_ENDPOINTS.SCENARIO, params),
};
