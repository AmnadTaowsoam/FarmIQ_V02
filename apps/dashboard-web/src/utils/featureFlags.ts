/**
 * Feature flags system
 * Flags can be set via environment variables or remote config (future)
 */

type FeatureFlag = 
  | 'ENABLE_SCENARIO_PLANNER'
  | 'ENABLE_MODEL_DRIFT'
  | 'ENABLE_ADVANCED_ANALYTICS'
  | 'ENABLE_IMAGE_ACCESS'
  | 'ENABLE_EXPORT_PARQUET'
  | 'ENABLE_REAL_TIME_UPDATES';

const featureFlags: Record<FeatureFlag, boolean> = {
  ENABLE_SCENARIO_PLANNER: import.meta.env.VITE_ENABLE_SCENARIO_PLANNER === 'true',
  ENABLE_MODEL_DRIFT: import.meta.env.VITE_ENABLE_MODEL_DRIFT === 'true',
  ENABLE_ADVANCED_ANALYTICS: import.meta.env.VITE_ENABLE_ADVANCED_ANALYTICS === 'true',
  ENABLE_IMAGE_ACCESS: import.meta.env.VITE_ENABLE_IMAGE_ACCESS !== 'false', // Default true
  ENABLE_EXPORT_PARQUET: import.meta.env.VITE_ENABLE_EXPORT_PARQUET === 'true',
  ENABLE_REAL_TIME_UPDATES: import.meta.env.VITE_ENABLE_REAL_TIME_UPDATES === 'true',
};

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return featureFlags[flag] || false;
};

/**
 * Get all feature flags (for debugging)
 */
export const getAllFeatureFlags = (): Record<FeatureFlag, boolean> => {
  return { ...featureFlags };
};

