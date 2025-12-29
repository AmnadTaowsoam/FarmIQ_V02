import { describe, it, expect } from 'vitest';
import {
  formatWeight,
  formatTemperature,
  formatHumidity,
  formatFCR,
  formatDataFreshness,
  getDataFreshnessClass,
  calculateDataAge,
} from '../formatting';

describe('Formatting Utils', () => {
  describe('formatWeight', () => {
    it('formats weight with 2 decimals', () => {
      expect(formatWeight(2.567)).toBe('2.57 kg');
    });

    it('handles null/undefined', () => {
      expect(formatWeight(null)).toBe('—');
      expect(formatWeight(undefined)).toBe('—');
    });
  });

  describe('formatTemperature', () => {
    it('formats temperature with 1 decimal', () => {
      expect(formatTemperature(25.567)).toBe('25.6 °C');
    });
  });

  describe('formatHumidity', () => {
    it('formats humidity as integer', () => {
      expect(formatHumidity(60.7)).toBe('61 %');
    });
  });

  describe('formatFCR', () => {
    it('formats FCR with 2 decimals', () => {
      expect(formatFCR(1.856)).toBe('1.86 ');
    });
  });

  describe('Data Freshness', () => {
    it('calculates age correctly', () => {
      const timestamp = new Date(Date.now() - 120 * 1000); // 2 minutes ago
      const age = calculateDataAge(timestamp);
      expect(age).toBeGreaterThanOrEqual(119);
      expect(age).toBeLessThanOrEqual(121);
    });

    it('returns correct freshness class', () => {
      expect(getDataFreshnessClass(30)).toBe('fresh');
      expect(getDataFreshnessClass(120)).toBe('warn');
      expect(getDataFreshnessClass(600)).toBe('stale');
    });

    it('formats freshness display', () => {
      expect(formatDataFreshness(30)).toBe('30s ago');
      expect(formatDataFreshness(120)).toBe('2m ago');
      expect(formatDataFreshness(7200)).toBe('2h ago');
    });
  });
});

