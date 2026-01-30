import {
  recordUsageMetric,
  getUsageMetrics,
  aggregateUsageMetrics,
} from '../../src/services/usageMeteringService';
import { PrismaClient } from '@prisma/client';

// @ts-ignore
const mockPrisma = new PrismaClient() as any;

describe('UsageMeteringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordUsageMetric', () => {
    it('should record new usage metric', async () => {
      const mockMetric = {
        id: 'metric-1',
        tenantId: 'tenant-1',
        metricType: 'devices',
        value: 10,
        period: 'daily',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-02'),
      };

      mockPrisma.usageMetric.upsert.mockResolvedValue(mockMetric);

      const result = await recordUsageMetric(
        'tenant-1',
        'devices',
        10,
        'daily',
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(mockPrisma.usageMetric.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_metricType_period_periodStart: {
            tenantId: 'tenant-1',
            metricType: 'devices',
            period: 'daily',
            periodStart: new Date('2025-01-01'),
          },
        },
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          metricType: 'devices',
          value: 10,
          period: 'daily',
        }),
        update: {
          value: {
            increment: 10,
          },
        },
      });
      expect(result).toEqual(mockMetric);
    });

    it('should update existing usage metric', async () => {
      const mockMetric = {
        id: 'metric-1',
        tenantId: 'tenant-1',
        metricType: 'devices',
        value: 20,
      };

      mockPrisma.usageMetric.upsert.mockResolvedValue(mockMetric);

      const result = await recordUsageMetric(
        'tenant-1',
        'devices',
        10,
        'daily',
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(mockPrisma.usageMetric.upsert).toHaveBeenCalledWith({
        where: expect.any(Object),
        update: {
          value: {
            increment: 10,
          },
        },
      });
      expect(result).toEqual(mockMetric);
    });

    it('should handle hourly period', async () => {
      const mockMetric = {
        id: 'metric-1',
        tenantId: 'tenant-1',
        metricType: 'api_calls',
        value: 1000,
        period: 'hourly',
      };

      mockPrisma.usageMetric.upsert.mockResolvedValue(mockMetric);

      const result = await recordUsageMetric(
        'tenant-1',
        'api_calls',
        1000,
        'hourly',
        new Date('2025-01-01T00:00:00'),
        new Date('2025-01-01T01:00:00')
      );

      expect(mockPrisma.usageMetric.upsert).toHaveBeenCalledWith({
        where: expect.objectContaining({
          period: 'hourly',
        }),
        create: expect.objectContaining({
          period: 'hourly',
        }),
      });
      expect(result).toEqual(mockMetric);
    });

    it('should handle monthly period', async () => {
      const mockMetric = {
        id: 'metric-1',
        tenantId: 'tenant-1',
        metricType: 'storage_gb',
        value: 5,
        period: 'monthly',
      };

      mockPrisma.usageMetric.upsert.mockResolvedValue(mockMetric);

      const result = await recordUsageMetric(
        'tenant-1',
        'storage_gb',
        5,
        'monthly',
        new Date('2025-01-01'),
        new Date('2025-02-01')
      );

      expect(mockPrisma.usageMetric.upsert).toHaveBeenCalledWith({
        where: expect.objectContaining({
          period: 'monthly',
        }),
        create: expect.objectContaining({
          period: 'monthly',
        }),
      });
      expect(result).toEqual(mockMetric);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.usageMetric.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        recordUsageMetric('tenant-1', 'devices', 10, 'daily', new Date(), new Date())
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUsageMetrics', () => {
    it('should return all usage metrics for tenant', async () => {
      const mockMetrics = [
        { id: 'metric-1', tenantId: 'tenant-1', metricType: 'devices', value: 10 },
        { id: 'metric-2', tenantId: 'tenant-1', metricType: 'api_calls', value: 1000 },
      ];

      mockPrisma.usageMetric.findMany.mockResolvedValue(mockMetrics);

      const result = await getUsageMetrics('tenant-1');

      expect(mockPrisma.usageMetric.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { periodStart: 'desc' },
      });
      expect(result).toEqual(mockMetrics);
    });

    it('should filter by metric type', async () => {
      const mockMetrics = [
        { id: 'metric-1', tenantId: 'tenant-1', metricType: 'devices', value: 10 },
      ];

      mockPrisma.usageMetric.findMany.mockResolvedValue(mockMetrics);

      const result = await getUsageMetrics('tenant-1', 'devices');

      expect(mockPrisma.usageMetric.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', metricType: 'devices' },
        orderBy: { periodStart: 'desc' },
      });
      expect(result).toEqual(mockMetrics);
    });

    it('should filter by period', async () => {
      const mockMetrics = [
        { id: 'metric-1', tenantId: 'tenant-1', metricType: 'devices', period: 'daily' },
      ];

      mockPrisma.usageMetric.findMany.mockResolvedValue(mockMetrics);

      const result = await getUsageMetrics('tenant-1', undefined, 'daily');

      expect(mockPrisma.usageMetric.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', period: 'daily' },
        orderBy: { periodStart: 'desc' },
      });
      expect(result).toEqual(mockMetrics);
    });

    it('should filter by date range', async () => {
      const mockMetrics = [
        { id: 'metric-1', tenantId: 'tenant-1', metricType: 'devices' },
      ];

      mockPrisma.usageMetric.findMany.mockResolvedValue(mockMetrics);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await getUsageMetrics('tenant-1', undefined, undefined, startDate, endDate);

      expect(mockPrisma.usageMetric.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          periodStart: { gte: startDate },
          periodEnd: { lte: endDate },
        },
        orderBy: { periodStart: 'desc' },
      });
      expect(result).toEqual(mockMetrics);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.usageMetric.findMany.mockRejectedValue(new Error('Database error'));

      await expect(getUsageMetrics('tenant-1')).rejects.toThrow('Database error');
    });
  });

  describe('aggregateUsageMetrics', () => {
    it('should aggregate usage metrics by type', async () => {
      const mockMetrics = [
        { id: 'metric-1', tenantId: 'tenant-1', metricType: 'devices', value: 10 },
        { id: 'metric-2', tenantId: 'tenant-1', metricType: 'devices', value: 5 },
        { id: 'metric-3', tenantId: 'tenant-1', metricType: 'api_calls', value: 1000 },
      ];

      mockPrisma.usageMetric.findMany.mockResolvedValue(mockMetrics);

      const result = await aggregateUsageMetrics(
        'tenant-1',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(mockPrisma.usageMetric.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          periodStart: { gte: new Date('2025-01-01') },
          periodEnd: { lte: new Date('2025-01-31') },
        },
      });
      expect(result).toEqual({
        devices: 15,
        api_calls: 1000,
      });
    });

    it('should handle empty metrics', async () => {
      mockPrisma.usageMetric.findMany.mockResolvedValue([]);

      const result = await aggregateUsageMetrics(
        'tenant-1',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(result).toEqual({});
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.usageMetric.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        aggregateUsageMetrics('tenant-1', new Date('2025-01-01'), new Date('2025-01-31'))
      ).rejects.toThrow('Database error');
    });
  });
});
