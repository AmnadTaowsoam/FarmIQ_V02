
import { services, ServiceDef, ServiceKey } from '@/config/services';
import { http } from '@/lib/http';
import { EdgeStatus } from '@/types';

// --- Types ---

export interface ServiceHealth {
    key: string;
    name: string;
    status: 'up' | 'down' | 'degraded';
    latencyMs?: number;
    lastChecked: string;
    details?: string;
    type: 'http' | 'tcp';
    version?: string;
}

export interface ProbeResult {
    status: 'up' | 'down';
    host?: string;
    port?: number;
    error?: string;
}

export interface IngressStats {
    messages_total: number;
    messages_deduped_total: number;
    messages_invalid_total: number;
    lastMessageAt?: string;
}

export interface SyncState {
    backlog_count: number;
    dlq_count: number;
    claimed_count?: number;
    oldest_pending_age_seconds?: number | null;
    last_success_at?: string | null;
    // Legacy-friendly field: may contain last_error message OR ISO timestamp (last_error_at)
    last_error?: string | null;
}

export interface DlqEvent {
    event_id: string;
    event_type: string;
    tenant_id: string;
    attempts: number;
    last_error: string;
    updated_at: string;
}

export interface DiagnosticsBundle {
    timestamp: string;
    settings: any;
    edgeStatus: EdgeStatus | { error: string };
    ingressStats: IngressStats | { error: string };
    syncState: SyncState | { error: string };
    dlqHead: DlqEvent[] | { error: string };
    cloudConnectivity: any;
}

export interface TelemetryMetrics {
    ingestionRatePerMinute: number;
    totalReadings: number;
    totalAggregates: number;
}

export interface TelemetryReading {
    id: string;
    tenant_id: string;
    farm_id?: string;
    barn_id?: string;
    device_id: string;
    metric_type: string;
    metric_value: number;
    unit?: string;
    occurred_at: string;
    ingested_at: string;
}

export interface TelemetryReadingsResponse {
    readings: TelemetryReading[];
}

interface AgentEdgeStatusService {
    name: string;
    base_url?: string;
    health_ok: boolean;
    ready_ok: boolean;
    latency_ms?: number;
    last_check_at?: string;
}

interface AgentEdgeStatusResources {
    cpu_load_1m: number;
    cpu_load_5m: number;
    cpu_load_15m: number;
    memory_free_bytes: number;
    memory_total_bytes: number;
    disk_free_bytes: number;
    disk_total_bytes: number;
}

interface AgentSyncState {
    pending_count: number;
    claimed_count?: number;
    dlq_count: number;
    oldest_pending_age_seconds?: number | null;
    last_success_at?: string | null;
    last_error_at?: string | null;
}

interface AgentEdgeStatusResponse {
    data: {
        overall: string;
        last_check_at: string;
        services: AgentEdgeStatusService[];
        resources: AgentEdgeStatusResources;
        sync_state?: AgentSyncState | null;
    };
}

// Reuse existing types
export type { EdgeStatus } from '@/types';
export * from '@/types'; // Export other types

// Mocks
export const MOCK_EDGE_STATUS: EdgeStatus = {
    health: { status: 'ok', uptime: 3600, version: '1.0.0-dev' },
    resources: {
        cpuUsage: 15.5,
        memoryUsage: 42.1,
        diskUsage: { path: '/data', usedPercent: 65, freeGb: 120 }
    },
    services: [],
    sync: { pendingCount: 42, oldestPendingAgeMs: 5000, dlqCount: 0 }
};

interface ApiContext {
    tenantId: string;
    apiKey?: string;
    authMode?: 'none' | 'api-key' | 'hmac';
    hmacSecret?: string;
    getServiceUrl?: (key: ServiceKey) => string;
}

// Helper to resolve URL with fallback to static config
const resolveUrl = (key: ServiceKey, context?: ApiContext): string => {
    if (context?.getServiceUrl) {
        return context.getServiceUrl(key);
    }
    return services[key] || '';
};

// --- API ---

export const edgeOpsApi = {
    /**
     * Fetch Main Edge Node Status (Aggregated by Agent)
     */
    getStatus: async (context?: ApiContext): Promise<EdgeStatus> => {
        const baseUrl = resolveUrl('EDGE_OBSERVABILITY_AGENT', context);
        const response = await http.get<AgentEdgeStatusResponse>(`${baseUrl}/api/v1/ops/edge/status`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey,
        });

        const cores =
            (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4;

        const { resources } = response.data;
        const cpuUsage = Math.max(
            0,
            Math.min(100, (resources.cpu_load_1m / Math.max(1, cores)) * 100)
        );

        const memoryUsedPercent =
            resources.memory_total_bytes > 0
                ? (1 - resources.memory_free_bytes / resources.memory_total_bytes) * 100
                : 0;

        const diskUsedPercent =
            resources.disk_total_bytes > 0
                ? (1 - resources.disk_free_bytes / resources.disk_total_bytes) * 100
                : 0;

        const services = response.data.services.map((svc) => ({
            name: svc.name,
            status: svc.health_ok && svc.ready_ok ? 'up' as const : 'down' as const,
            latencyMs: typeof svc.latency_ms === 'number' ? Math.round(svc.latency_ms) : undefined,
        }));

        const pendingCount = response.data.sync_state?.pending_count ?? 0;
        const dlqCount = response.data.sync_state?.dlq_count ?? 0;
        const oldestPendingAgeMs =
            typeof response.data.sync_state?.oldest_pending_age_seconds === 'number'
                ? response.data.sync_state.oldest_pending_age_seconds * 1000
                : 0;

        return {
            health: {
                status: response.data.overall === 'OK' ? 'ok' : 'error',
                uptime: 0,
                version: 'agent',
            },
            resources: {
                cpuUsage,
                memoryUsage: memoryUsedPercent,
                diskUsage: {
                    path: '/data',
                    usedPercent: diskUsedPercent,
                    freeGb: Math.round(resources.disk_free_bytes / (1024 ** 3)),
                },
            },
            services,
            sync: {
                pendingCount,
                oldestPendingAgeMs,
                dlqCount,
            },
        };
    },

    /**
     * Fetch Telemetry Stats (READINGS COUNT)
     */
    getTelemetryStats: async (context?: ApiContext): Promise<{ totalReadings: number; lastReadingAt?: string }> => {
        const baseUrl = resolveUrl('EDGE_TELEMETRY_TIMESERIES', context);
        const response = await http.get<{ total_readings: number; last_reading_at?: string }>(`${baseUrl}/api/v1/telemetry/stats`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey,
        });

        return {
            totalReadings: response.total_readings || 0,
            lastReadingAt: response.last_reading_at,
        };
    },

    /**
     * Fetch Media Store Stats (OBJECTS COUNT)
     */
    getMediaStats: async (context?: ApiContext): Promise<{ totalObjects: number; lastCreated?: string }> => {
        const baseUrl = resolveUrl('EDGE_MEDIA_STORE', context);
        const response = await http.get<{ total_objects: number; last_created_at?: string }>(`${baseUrl}/api/v1/media/stats`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey,
        });

        return {
            totalObjects: response.total_objects || 0,
            lastCreated: response.last_created_at,
        };
    },

    /**
     * Fetch Vision Inference Stats (RESULTS COUNT)
     */
    getVisionStats: async (context?: ApiContext): Promise<{ totalResults: number; lastResultAt?: string }> => {
        const baseUrl = resolveUrl('EDGE_VISION_INFERENCE', context);
        const response = await http.get<{ total_results: number; last_result_at?: string }>(`${baseUrl}/api/v1/inference/stats`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey,
        });

        return {
            totalResults: response.total_results || 0,
            lastResultAt: response.last_result_at,
        };
    },

    /**
     * Fetch Metrics (with rate)
     */
    getTelemetryMetrics: async (context?: ApiContext): Promise<TelemetryMetrics> => {
        const baseUrl = resolveUrl('EDGE_TELEMETRY_TIMESERIES', context);
        return http.get<TelemetryMetrics>(`${baseUrl}/api/v1/telemetry/metrics`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey,
        });
    },

    getTelemetryReadings: async (
        params: { limit?: number; deviceId?: string },
        context?: ApiContext
    ): Promise<TelemetryReadingsResponse> => {
        const baseUrl = resolveUrl('EDGE_TELEMETRY_TIMESERIES', context);
        return http.get<TelemetryReadingsResponse>(`${baseUrl}/api/v1/telemetry/readings`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey,
            searchParams: {
                tenant_id: context?.tenantId,
                device_id: params.deviceId,
                limit: params.limit ?? 10,
            },
        });
    },

    getCloudDiagnostics: async (context?: ApiContext) => {
        const baseUrl = resolveUrl('EDGE_SYNC_FORWARDER', context);
        return http.get(`${baseUrl}/api/v1/sync/diagnostics/cloud`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey
        });
    },

    getIngressStats: async (context?: ApiContext): Promise<IngressStats> => {
        const baseUrl = resolveUrl('EDGE_INGRESS_GATEWAY', context);
        return http.get<IngressStats>(`${baseUrl}/api/v1/ingress/stats`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey
        });
    },

    getSyncState: async (context?: ApiContext): Promise<SyncState> => {
        const baseUrl = resolveUrl('EDGE_SYNC_FORWARDER', context);
        const raw = await http.get<any>(`${baseUrl}/api/v1/sync/state`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey
        });

        // Normalize across API versions:
        // - current: pending_count / claimed_count / dlq_count / last_error_at
        // - legacy: backlog_count / dlq_count / last_error
        return {
            backlog_count: Number(raw?.backlog_count ?? raw?.pending_count ?? 0),
            dlq_count: Number(raw?.dlq_count ?? 0),
            claimed_count: raw?.claimed_count != null ? Number(raw.claimed_count) : undefined,
            oldest_pending_age_seconds: raw?.oldest_pending_age_seconds ?? undefined,
            last_success_at: raw?.last_success_at ?? undefined,
            last_error: raw?.last_error ?? raw?.last_error_at ?? undefined,
        };
    },

    triggerSync: async (context?: ApiContext) => {
        const baseUrl = resolveUrl('EDGE_SYNC_FORWARDER', context);
        return http.post(`${baseUrl}/api/v1/sync/trigger`, {}, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey
        });
    },

    getDlq: async (limit: number, context?: ApiContext): Promise<DlqEvent[]> => {
        const baseUrl = resolveUrl('EDGE_SYNC_FORWARDER', context);
        const raw = await http.get<any>(`${baseUrl}/api/v1/sync/dlq?limit=${limit}`, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey
        });

        // Current API returns { entries: [...], count: number }
        if (raw && typeof raw === 'object' && Array.isArray(raw.entries)) {
            return raw.entries.map((e: any) => ({
                event_id: String(e.id ?? ''),
                event_type: String(e.event_type ?? ''),
                tenant_id: String(e.tenant_id ?? ''),
                attempts: Number(e.attempt_count ?? 0),
                last_error: String(e.last_error_message ?? e.last_error_code ?? ''),
                updated_at: String(e.failed_at ?? e.created_at ?? new Date().toISOString()),
            }));
        }

        // Legacy API returned DlqEvent[] directly
        if (Array.isArray(raw)) return raw as DlqEvent[];

        return [];
    },

    redriveDlq: async (payload: any, context?: ApiContext) => {
        const baseUrl = resolveUrl('EDGE_SYNC_FORWARDER', context);

        // Normalize payload across UI versions:
        // - UI may send { eventIds: [...] } or { ids: [...] }
        // - UI may send { allDlq: true } or { all_dlq: true }
        const normalized = (() => {
            if (!payload || typeof payload !== 'object') return {};
            const ids = payload.ids ?? payload.eventIds;
            const allDlq = payload.allDlq ?? payload.all_dlq;
            const out: any = {};
            if (Array.isArray(ids)) out.ids = ids;
            if (typeof allDlq === 'boolean') out.allDlq = allDlq;
            return out;
        })();

        return http.post(`${baseUrl}/api/v1/sync/dlq/redrive`, normalized, {
            tenantId: context?.tenantId,
            apiKey: context?.apiKey
        });
    },

    // --- Diagnostics ---

    getDiagnosticsBundle: async (settings: any, context?: ApiContext): Promise<DiagnosticsBundle> => {
        const timestamp = new Date().toISOString();

        // Define helpers to capture errors instead of failing the whole bundle
        const safeFetch = async <T>(promise: Promise<T>): Promise<T | { error: string }> => {
            try {
                return await promise;
            } catch (e: any) {
                return { error: e.message || String(e) };
            }
        };

        const [edgeStatus, ingressStats, syncState, dlqHead, cloudConnectivity] = await Promise.all([
            safeFetch(edgeOpsApi.getStatus(context)),
            safeFetch(edgeOpsApi.getIngressStats(context)),
            safeFetch(edgeOpsApi.getSyncState(context)),
            safeFetch(edgeOpsApi.getDlq(20, context)), // Grab first 20 items
            safeFetch(edgeOpsApi.getCloudDiagnostics(context))
        ]);

        return {
            timestamp,
            settings: { ...settings, apiKey: '***MASKED***', hmacSecret: '***MASKED***' }, // Safety mask
            edgeStatus,
            ingressStats,
            syncState,
            dlqHead,
            cloudConnectivity
        };
    },

    // --- Individual Service Polling ---

    /**
     * Check health of a specific service definition
     */
    checkService: async (svc: ServiceDef, context?: ApiContext): Promise<ServiceHealth> => {
        const start = performance.now();
        // Resolve URL dynamically
        const baseUrl = resolveUrl(svc.key, context);

        try {
            if (svc.hasHttp && baseUrl) {
                // HTTP Check
                await http.get(`${baseUrl}${svc.healthPath || '/api/health'}`);
                // If success (no throw), it's UP
                const latency = Math.round(performance.now() - start);
                return {
                    key: svc.key,
                    name: svc.name,
                    status: 'up',
                    latencyMs: latency,
                    lastChecked: new Date().toISOString(),
                    type: 'http'
                };
            } else if (svc.tcpProbe) {
                // TCP Probe via Backend/Vite
                const { host, port } = svc.tcpProbe;
                // Note: This call goes to our own server (relative path), so no baseUrl needed
                const res = await fetch(`/api/probe/tcp?host=${host}&port=${port}`);
                const json = await res.json() as ProbeResult;

                if (json.status !== 'up') throw new Error(json.error || 'TCP Down');

                const latency = Math.round(performance.now() - start);
                return {
                    key: svc.key,
                    name: svc.name,
                    status: 'up',
                    latencyMs: latency,
                    lastChecked: new Date().toISOString(),
                    type: 'tcp'
                };
            }
            // If hasHttp is true but no baseUrl (e.g. edge profile but no default port?), it's technically unreachable/config error, or down.
            // But we might fall through here.

            // If neither HTTP nor TCP probe logic matched (e.g. hasHttp=false, no probe):
            throw new Error('No valid probe configuration');

        } catch (err: any) {
            return {
                key: svc.key,
                name: svc.name,
                status: 'down',
                lastChecked: new Date().toISOString(),
                details: err.message,
                type: svc.hasHttp ? 'http' : 'tcp'
            };
        }
    }
};
