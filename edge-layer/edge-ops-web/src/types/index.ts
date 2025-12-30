export interface EdgeHealth {
    status: 'ok' | 'error';
    uptime: number;
    version: string;
}

export interface DriveUsage {
    path: string;
    usedPercent: number;
    freeGb: number;
}

export interface EdgeResources {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: DriveUsage;
}

export interface EdgeServiceStatus {
    name: string;
    status: 'up' | 'down' | 'unknown';
    latencyMs?: number;
}

export interface EdgeSyncStatus {
    pendingCount: number;
    oldestPendingAgeMs: number;
    dlqCount: number;
}

export interface EdgeStatus {
    health: EdgeHealth;
    resources: EdgeResources;
    services: EdgeServiceStatus[];
    sync: EdgeSyncStatus;
}
