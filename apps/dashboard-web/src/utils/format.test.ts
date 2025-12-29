import { describe, it, expect } from 'vitest';
import { formatMetric, formatDateTime } from './format';

describe('Formatting Utils', () => {
    describe('formatMetric', () => {
        it('formats number with unit', () => {
            expect(formatMetric(23.5, '°C', 1)).toBe('23.5 °C');
        });

        it('handles zero precision', () => {
            expect(formatMetric(100, '%')).toBe('100 %');
        });

        it('returns em-dash for null/undefined', () => {
            // @ts-ignore
            expect(formatMetric(null, 'kg')).toBe('—');
        });
    });

    describe('formatDateTime', () => {
        it('formats valid date string', () => {
            const d = new Date('2025-12-25T10:00:00');
            expect(formatDateTime(d, 'dd MMM')).toBe('25 Dec');
        });
    });
});
