import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ConnectionProfile, SERVICE_REGISTRY, ServiceKey } from '@/config/services';

export type AuthMode = 'none' | 'api-key' | 'hmac';

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  details?: string;
  status: 'success' | 'failure';
  reqId?: string;
}

interface SettingsContextType {
  // Tenant & App Settings
  tenantId: string;
  setTenantId: (id: string) => void;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;
  lastRefresh: Date;
  triggerRefresh: () => void;

  // Connectivity Settings
  connectionProfile: ConnectionProfile;
  setConnectionProfile: (profile: ConnectionProfile) => void;
  edgeHost: string;
  setEdgeHost: (host: string) => void;
  serviceOverrides: Record<string, string>;
  setServiceOverrides: (overrides: Record<string, string>) => void;
  
  // Auth Settings
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  hmacSecret: string;
  setHmacSecret: (secret: string) => void;

  // Safety & Audit
  enableDangerousActions: boolean;
  setEnableDangerousActions: (enabled: boolean) => void;
  auditLog: AuditLogEntry[];
  logAction: (action: string, status: 'success' | 'failure', details?: string, reqId?: string) => void;
  exportAuditLog: () => void;
  
  // Helpers
  getServiceUrl: (key: ServiceKey) => string;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SCHEMA_VERSION: 'edge-ops-schema-version',
  TENANT_ID: 'edge-ops-tenant-id',
  REFRESH_INTERVAL: 'edge-ops-refresh-interval',
  API_KEY: 'edge-ops-api-key',
  CONNECTION_PROFILE: 'edge-ops-connection-profile',
  EDGE_HOST: 'edge-ops-edge-host',
  SERVICE_OVERRIDES: 'edge-ops-service-overrides',
  AUTH_MODE: 'edge-ops-auth-mode',
  HMAC_SECRET: 'edge-ops-hmac-secret',
  ENABLE_DANGEROUS: 'edge-ops-enable-dangerous',
  AUDIT_LOG: 'edge-ops-audit-log',
};

const CURRENT_SCHEMA_VERSION = '1.0';
const isDev = import.meta.env.DEV;

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Migration / Initialization ---
  useEffect(() => {
    const version = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
    if (version !== CURRENT_SCHEMA_VERSION) {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    }
  }, []);

  // --- State ---
  const [tenantId, setTenantId] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TENANT_ID) || 't-001'
  );
  
  const [refreshInterval, setRefreshInterval] = useState(() => 
    parseInt(localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL) || '5000', 10)
  );

  const [connectionProfile, setConnectionProfile] = useState<ConnectionProfile>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CONNECTION_PROFILE);
    if (stored === 'local' || stored === 'cluster' || stored === 'edge-device') {
      return stored as ConnectionProfile;
    }
    return isDev ? 'local' : 'cluster';
  });

  const [edgeHost, setEdgeHost] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.EDGE_HOST) || '192.168.1.50'
  );

  const [serviceOverrides, setServiceOverrides] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVICE_OVERRIDES);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Auth State
  const [authMode, setAuthMode] = useState<AuthMode>(() => 
    (localStorage.getItem(STORAGE_KEYS.AUTH_MODE) as AuthMode) || 'none'
  );
  
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
  );
  
  const [hmacSecret, setHmacSecret] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.HMAC_SECRET) || ''
  );

  // Safety State
  const [enableDangerousActions, setEnableDangerousActions] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.ENABLE_DANGEROUS) === 'true'
  );

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [lastRefresh, setLastRefresh] = useState(new Date());

  // --- Persistence Effects ---
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId), [tenantId]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, refreshInterval.toString()), [refreshInterval]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.CONNECTION_PROFILE, connectionProfile), [connectionProfile]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.EDGE_HOST, edgeHost), [edgeHost]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SERVICE_OVERRIDES, JSON.stringify(serviceOverrides)), [serviceOverrides]);
  
  useEffect(() => localStorage.setItem(STORAGE_KEYS.AUTH_MODE, authMode), [authMode]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey), [apiKey]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.HMAC_SECRET, hmacSecret), [hmacSecret]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.ENABLE_DANGEROUS, String(enableDangerousActions)), [enableDangerousActions]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(auditLog)), [auditLog]);

  // --- Actions ---
  const triggerRefresh = useCallback(() => {
    setLastRefresh(new Date());
  }, []);

  const resetSettings = useCallback(() => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setTenantId('t-001');
      setRefreshInterval(5000);
      setConnectionProfile(isDev ? 'local' : 'cluster');
      setEdgeHost('192.168.1.50');
      setServiceOverrides({});
      setAuthMode('none');
      setApiKey('');
      setHmacSecret('');
      setEnableDangerousActions(false);
      // We purposefully DO NOT clear audit log on reset, usually users want that history.
      // But clearing localStorage below will wipe it. Let's persist it if we want, but requirement says "reset to defaults".
      // Let's clear it for true reset.
      setAuditLog([]);
      
      localStorage.clear(); 
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    }
  }, []);

  const logAction = useCallback((action: string, status: 'success' | 'failure', details?: string, reqId?: string) => {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      status,
      details,
      reqId
    };
    setAuditLog(prev => [entry, ...prev].slice(0, 100)); // Keep last 100
  }, []);

  const exportAuditLog = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `edge_ops_audit_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [auditLog]);

  // --- Resolver ---
  const getServiceUrl = useCallback((key: ServiceKey): string => {
    if (serviceOverrides[key]) return serviceOverrides[key];
    const svc = SERVICE_REGISTRY.find(s => s.key === key);
    if (!svc) return '';

    switch (connectionProfile) {
      case 'local':
        return svc.defaultPort ? `http://localhost:${svc.defaultPort}` : '';
      case 'edge-device':
        return svc.defaultPort && edgeHost ? `http://${edgeHost}:${svc.defaultPort}` : '';
      case 'cluster':
      default:
        return svc.clusterPath || '';
    }
  }, [connectionProfile, edgeHost, serviceOverrides]);

  return (
    <SettingsContext.Provider value={{
      tenantId, setTenantId,
      refreshInterval, setRefreshInterval,
      lastRefresh, triggerRefresh,
      connectionProfile, setConnectionProfile,
      edgeHost, setEdgeHost,
      serviceOverrides, setServiceOverrides,
      authMode, setAuthMode,
      apiKey, setApiKey,
      hmacSecret, setHmacSecret,
      enableDangerousActions, setEnableDangerousActions,
      auditLog, logAction, exportAuditLog,
      getServiceUrl, resetSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
