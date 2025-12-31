export type ServiceKey =
    | 'EDGE_INGRESS_GATEWAY'
    | 'EDGE_TELEMETRY_TIMESERIES'
    | 'EDGE_WEIGHVISION_SESSION'
    | 'EDGE_MEDIA_STORE'
    | 'EDGE_VISION_INFERENCE'
    | 'EDGE_SYNC_FORWARDER'
    | 'EDGE_OBSERVABILITY_AGENT'
    | 'EDGE_POLICY_SYNC'
    | 'EDGE_RETENTION_JANITOR'
    | 'EDGE_FEED_INTAKE'
    | 'EDGE_MQTT_BROKER';

const isDev = import.meta.env.DEV;

export type ConnectionProfile = 'local' | 'cluster' | 'edge-device';

export interface ServiceDef {
    key: ServiceKey;
    name: string;
    description: string;
    hasHttp: boolean;
    defaultPort?: number; // Port for Local/Edge profiles
    clusterPath?: string; // Path for Cluster/Ingress profile (e.g., /svc/foo)
    tcpProbe?: { host: string; port: number }; // For TCP
    healthPath?: string;
    readyPath?: string;
    docsPath?: string;
    baseUrl?: string; // Legacy/Fallback
}

// Service Dictionary
export const SERVICE_REGISTRY: ServiceDef[] = [
    {
        key: 'EDGE_INGRESS_GATEWAY',
        name: 'Ingress Gateway',
        description: 'Entry point for device telemetry (HTTP/MQTT adapter)',
        hasHttp: true,
        defaultPort: 5103,
        clusterPath: '/svc/ingress',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_TELEMETRY_TIMESERIES',
        name: 'Telemetry Timeseries',
        description: 'Time-series storage and retrieval',
        hasHttp: true,
        defaultPort: 5104,
        clusterPath: '/svc/telemetry',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_WEIGHVISION_SESSION',
        name: 'WeighVision Session',
        description: 'Session management for weighing events',
        hasHttp: true,
        defaultPort: 5105,
        clusterPath: '/svc/weighvision',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_MEDIA_STORE',
        name: 'Media Store',
        description: 'Blob storage (MinIO) wrapper',
        hasHttp: true,
        defaultPort: 5106,
        clusterPath: '/svc/media',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_VISION_INFERENCE',
        name: 'Vision Inference',
        description: 'ML Inference API (Python)',
        hasHttp: true,
        defaultPort: 5107,
        clusterPath: '/svc/vision',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_SYNC_FORWARDER',
        name: 'Sync Forwarder',
        description: 'Reliable cloud data synchronization',
        hasHttp: true,
        defaultPort: 5108,
        clusterPath: '/svc/sync',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_OBSERVABILITY_AGENT',
        name: 'Observability Agent',
        description: 'System health and status aggregator',
        hasHttp: true,
        defaultPort: 5111,
        clusterPath: '/svc/ops',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_POLICY_SYNC',
        name: 'Policy Sync',
        description: 'Synchronizes cloud configuration down to edge',
        hasHttp: true,
        defaultPort: 5109,
        clusterPath: '/svc/policy',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_RETENTION_JANITOR',
        name: 'Retention Janitor',
        description: 'Disk cleanup and policy enforcement',
        hasHttp: true,
        defaultPort: 5115,
        clusterPath: '/svc/janitor',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_FEED_INTAKE',
        name: 'Feed Intake',
        description: 'Feed management inputs',
        hasHttp: true,
        defaultPort: 5112,
        clusterPath: '/svc/feed',
        healthPath: '/api/health',
        readyPath: '/api/ready',
        docsPath: '/api-docs/openapi.json'
    },
    {
        key: 'EDGE_MQTT_BROKER',
        name: 'MQTT Broker',
        description: 'Message Bus (Mosquitto)',
        hasHttp: false,
        tcpProbe: {
            host: isDev ? 'localhost' : 'edge-mqtt-broker',
            port: 1883
        }
    }
];

// Map for quick lookup if needed
export const services = SERVICE_REGISTRY.reduce((acc, svc) => {
    if (svc.baseUrl) acc[svc.key] = svc.baseUrl;
    return acc;
}, {} as Record<ServiceKey, string>);
