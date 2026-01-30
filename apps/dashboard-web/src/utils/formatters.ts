/**
 * Date and Number Formatting Utilities
 * Provides consistent formatting across the application
 */

/**
 * Format a date string or Date object
 * @param value - Date string or Date object to format
 * @param pattern - Format pattern (default: 'MMM d, yyyy')
 * @returns Formatted date string or '—' if value is falsy
 */
export const formatDate = (value?: string | Date, pattern = 'MMM d, yyyy'): string => {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    // Check if date is valid
    if (isNaN(date.getTime())) return '—';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    // Adjust options based on pattern
    if (pattern.includes('HH:mm')) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }
    
    return date.toLocaleDateString('en-US', options);
  } catch {
    return String(value);
  }
};

/**
 * Format a date string or Date object with time
 * @param value - Date string or Date object to format
 * @returns Formatted date-time string (e.g., 'Jan 15, 2025 14:30')
 */
export const formatDateTime = (value?: string | Date): string => {
  return formatDate(value, 'MMM d, yyyy HH:mm');
};

/**
 * Format a number with specified decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param fallback - Fallback value if value is null/undefined (default: '—')
 * @returns Formatted number string or fallback
 */
export const formatNumber = (
  value: number | null | undefined,
  decimals = 2,
  fallback = '—'
): string => {
  if (value === null || value === undefined) return fallback;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format a percentage value
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @param fallback - Fallback value if value is null/undefined (default: '—')
 * @returns Formatted percentage string (e.g., '85.5%')
 */
export const formatPercent = (
  value: number | null | undefined,
  decimals = 1,
  fallback = '—'
): string => {
  if (value === null || value === undefined) return fallback;
  return `${formatNumber(value, decimals, '')}%`;
};

/**
 * Format a temperature value
 * @param value - Temperature in Celsius
 * @param fallback - Fallback value if value is null/undefined (default: '—')
 * @returns Formatted temperature string (e.g., '25.5°C')
 */
export const formatTemperature = (
  value: number | null | undefined,
  fallback = '—'
): string => {
  if (value === null || value === undefined) return fallback;
  return `${formatNumber(value, 1, '')}°C`;
};

/**
 * Format a humidity value
 * @param value - Humidity percentage
 * @param fallback - Fallback value if value is null/undefined (default: '—')
 * @returns Formatted humidity string (e.g., '85%')
 */
export const formatHumidity = (
  value: number | null | undefined,
  fallback = '—'
): string => {
  if (value === null || value === undefined) return fallback;
  return `${formatNumber(value, 0, '')}%`;
};

/**
 * Format a weight value in kg
 * @param value - Weight in kg
 * @param decimals - Number of decimal places (default: 2)
 * @param fallback - Fallback value if value is null/undefined (default: '—')
 * @returns Formatted weight string (e.g., '2.45 kg')
 */
export const formatWeight = (
  value: number | null | undefined,
  decimals = 2,
  fallback = '—'
): string => {
  if (value === null || value === undefined) return fallback;
  return `${formatNumber(value, decimals, '')} kg`;
};

/**
 * Format a time duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., '2h 30m 15s')
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};
