import { format } from 'date-fns';

export const formatMetric = (value: number, unit: string, precision: number = 0): string => {
    if (value === undefined || value === null) return '—';
    return `${value.toFixed(precision)} ${unit}`;
};

export const formatDateTime = (dateStr: string | Date, fmt: string = 'dd MMM yyyy HH:mm'): string => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), fmt);
};

export const formatDate = (dateStr: string | Date, fmt: string = 'dd MMM yyyy'): string => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), fmt);
};