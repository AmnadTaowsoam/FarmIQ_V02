import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Format metric value with unit
 */
export const formatMetric = (
  value: number | null | undefined,
  unit: string,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(decimals)} ${unit}`;
};

/**
 * Format weight (kg)
 */
export const formatWeight = (kg: number | null | undefined): string => {
  return formatMetric(kg, 'kg', 2);
};

/**
 * Format temperature (°C)
 */
export const formatTemperature = (celsius: number | null | undefined): string => {
  return formatMetric(celsius, '°C', 1);
};

/**
 * Format humidity (%)
 */
export const formatHumidity = (percent: number | null | undefined): string => {
  return formatMetric(percent, '%', 0);
};

/**
 * Format FCR (dimensionless, 2 decimals)
 */
export const formatFCR = (fcr: number | null | undefined): string => {
  return formatMetric(fcr, '', 2);
};

/**
 * Format date/time with timezone
 */
export const formatDateTime = (
  date: Date | string | null | undefined,
  formatStr: string = 'dd MMM yyyy HH:mm'
): string => {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: th });
  } catch {
    return '—';
  }
};

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export const formatRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: th });
  } catch {
    return '—';
  }
};

/**
 * Calculate data freshness (age in seconds)
 */
export const calculateDataAge = (timestamp: Date | string | null | undefined): number | null => {
  if (!timestamp) return null;
  
  try {
    const dateObj = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    const ageMs = Date.now() - dateObj.getTime();
    return Math.floor(ageMs / 1000);
  } catch {
    return null;
  }
};

/**
 * Get data freshness class (fresh/warn/stale)
 */
export const getDataFreshnessClass = (ageSeconds: number | null): 'fresh' | 'warn' | 'stale' => {
  if (ageSeconds === null) return 'stale';
  
  if (ageSeconds < 60) return 'fresh';
  if (ageSeconds < 300) return 'warn'; // 5 minutes
  return 'stale';
};

/**
 * Format data freshness display
 */
export const formatDataFreshness = (ageSeconds: number | null): string => {
  if (ageSeconds === null) return 'Unknown';
  
  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }
  
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(decimals)}%`;
};

