import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TimeRangePreset = '24h' | '7d' | '30d' | '90d' | 'custom';

export interface TimeRange {
  start: Date;
  end: Date;
  preset: TimeRangePreset;
}

export interface ActiveContextType {
  tenantId: string | null;
  farmId: string | null;
  barnId: string | null;
  batchId: string | null;
  species: string | null;
  timeRange: TimeRange;
  
  setTenantId: (id: string | null) => void;
  setFarmId: (id: string | null) => void;
  setBarnId: (id: string | null) => void;
  setBatchId: (id: string | null) => void;
  setSpecies: (species: string | null) => void;
  setTimeRange: (range: TimeRange) => void;
  setTimeRangePreset: (preset: TimeRangePreset) => void;
  
  clearContext: () => void;
  hasRequiredContext: boolean;
}

const ActiveContext = createContext<ActiveContextType | undefined>(undefined);

const STORAGE_KEY = 'farmiq_active_context';

const getDefaultTimeRange = (preset: TimeRangePreset = '7d'): TimeRange => {
  const end = new Date();
  const start = new Date();
  
  switch (preset) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'custom':
      // Keep existing range or default to 7d
      start.setDate(start.getDate() - 7);
      break;
  }
  
  return { start, end, preset };
};

const loadContextFromStorage = (): Partial<ActiveContextType> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored);
    // Only restore timeRange, not context IDs (tenant/farm/barn)
    // This prevents hardcoded UUIDs from persisting in URL
    return {
      timeRange: parsed.timeRange 
        ? {
            ...parsed.timeRange,
            start: new Date(parsed.timeRange.start),
            end: new Date(parsed.timeRange.end),
          }
        : getDefaultTimeRange(),
    };
  } catch {
    return {};
  }
};

const saveContextToStorage = (context: Partial<ActiveContextType>) => {
  try {
    // Only save timeRange, not context IDs
    // This prevents hardcoded UUIDs from persisting across sessions
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      timeRange: context.timeRange,
    }));
  } catch (error) {
    console.warn('Failed to save context to storage', error);
  }
};


export const ActiveContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Migration: Clean up old localStorage data with hardcoded context IDs
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If old data contains context IDs, migrate to new format (timeRange only)
        if (parsed.tenantId || parsed.farmId || parsed.barnId || parsed.batchId || parsed.species) {
          saveContextToStorage({ timeRange: parsed.timeRange || getDefaultTimeRange() });
        }
      } catch {
        // Invalid data, clear it
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []); // Run once on mount
  
  // Load from URL params first, then localStorage
  const urlTenantId = searchParams.get('tenant_id');
  const urlFarmId = searchParams.get('farm_id');
  const urlBarnId = searchParams.get('barn_id');
  const urlBatchId = searchParams.get('batch_id');
  
  const storedContext = loadContextFromStorage();
  
  // Don't use storedContext for IDs anymore (only timeRange)
  const [tenantId, setTenantIdState] = useState<string | null>(urlTenantId || null);
  const [farmId, setFarmIdState] = useState<string | null>(urlFarmId || null);
  const [barnId, setBarnIdState] = useState<string | null>(urlBarnId || null);
  const [batchId, setBatchIdState] = useState<string | null>(urlBatchId || null);
  const [species, setSpeciesState] = useState<string | null>(null);
  const [timeRange, setTimeRangeState] = useState<TimeRange>(
    storedContext.timeRange || getDefaultTimeRange()
  );
  const defaultTenantId = import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_TENANT_ID : undefined;


  // Sync state to URL params when context changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    const currentTenant = params.get('tenant_id');
    const currentFarm = params.get('farm_id');
    const currentBarn = params.get('barn_id');
    const currentBatch = params.get('batch_id');
    
    // Only update if values actually changed to avoid unnecessary updates
    let hasChanges = false;
    
    if (tenantId !== currentTenant) {
      if (tenantId) {
        params.set('tenant_id', tenantId);
      } else {
        params.delete('tenant_id');
      }
      hasChanges = true;
    }
    
    if (farmId !== currentFarm) {
      if (farmId) {
        params.set('farm_id', farmId);
      } else {
        params.delete('farm_id');
      }
      hasChanges = true;
    }
    
    if (barnId !== currentBarn) {
      if (barnId) {
        params.set('barn_id', barnId);
      } else {
        params.delete('barn_id');
      }
      hasChanges = true;
    }
    
    if (batchId !== currentBatch) {
      if (batchId) {
        params.set('batch_id', batchId);
      } else {
        params.delete('batch_id');
      }
      hasChanges = true;
    }
    
    if (hasChanges) {
      setSearchParams(params, { replace: true });
    }
  }, [tenantId, farmId, barnId, batchId, setSearchParams]); // Removed searchParams from deps to prevent loop

  // Sync URL params to state on mount or when URL changes externally (e.g., browser back/forward)
  useEffect(() => {
    const urlTenant = searchParams.get('tenant_id');
    const urlFarm = searchParams.get('farm_id');
    const urlBarn = searchParams.get('barn_id');
    const urlBatch = searchParams.get('batch_id');
    
    // Only update state if URL param exists and differs from current state
    // This handles browser navigation (back/forward) without causing loops
    if (urlTenant !== null && urlTenant !== tenantId) {
      setTenantIdState(urlTenant);
    }
    if (urlFarm !== null && urlFarm !== farmId) {
      setFarmIdState(urlFarm);
    }
    if (urlBarn !== null && urlBarn !== barnId) {
      setBarnIdState(urlBarn);
    }
    if (urlBatch !== null && urlBatch !== batchId) {
      setBatchIdState(urlBatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams, not state values

  // Persist to localStorage
  useEffect(() => {
    saveContextToStorage({
      tenantId,
      farmId,
      barnId,
      batchId,
      species,
      timeRange,
    });
  }, [tenantId, farmId, barnId, batchId, species, timeRange]);

  const setTenantId = useCallback((id: string | null) => {
    setTenantIdState(id);
    // Clear dependent context when tenant changes
    if (id !== tenantId) {
      setFarmIdState(null);
      setBarnIdState(null);
      setBatchIdState(null);
    }
  }, [tenantId]);

  const setFarmId = useCallback((id: string | null) => {
    setFarmIdState(id);
    // Clear dependent context when farm changes
    if (id !== farmId) {
      setBarnIdState(null);
      setBatchIdState(null);
    }
  }, [farmId]);

  const setBarnId = useCallback((id: string | null) => {
    setBarnIdState(id);
    // Clear dependent context when barn changes
    if (id !== barnId) {
      setBatchIdState(null);
    }
  }, [barnId]);

  const setTimeRangePreset = useCallback((preset: TimeRangePreset) => {
    setTimeRangeState(getDefaultTimeRange(preset));
  }, []);

  useEffect(() => {
    if (!tenantId && defaultTenantId) {
      setTenantId(defaultTenantId);
    }
  }, [tenantId, defaultTenantId, setTenantId]);

  const clearContext = useCallback(() => {
    setTenantIdState(null);
    setFarmIdState(null);
    setBarnIdState(null);
    setBatchIdState(null);
    setSpeciesState(null);
    setTimeRangeState(getDefaultTimeRange());
  }, []);

  const hasRequiredContext = !!tenantId;

  const value: ActiveContextType = {
    tenantId,
    farmId,
    barnId,
    batchId,
    species,
    timeRange,
    setTenantId,
    setFarmId,
    setBarnId,
    setBatchId: setBatchIdState,
    setSpecies: setSpeciesState,
    setTimeRange: setTimeRangeState,
    setTimeRangePreset,
    clearContext,
    hasRequiredContext,
  };

  return <ActiveContext.Provider value={value}>{children}</ActiveContext.Provider>;
};

export const useActiveContext = () => {
  const context = useContext(ActiveContext);
  if (!context) {
    throw new Error('useActiveContext must be used within ActiveContextProvider');
  }
  return context;
};

