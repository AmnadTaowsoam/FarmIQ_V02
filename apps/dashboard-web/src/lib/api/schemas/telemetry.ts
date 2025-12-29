import { z } from 'zod';

// GET /api/v1/telemetry/readings
export const TelemetryReadingSchema = z.object({
  timestamp: z.string().datetime(),
  tenant_id: z.string().uuid(),
  farm_id: z.string().uuid().optional(),
  barn_id: z.string().uuid().optional(),
  device_id: z.string().uuid(),
  metric_type: z.string(),
  metric_value: z.number(),
  unit: z.string().optional(),
});

export const TelemetryReadingsResponseSchema = z.object({
  data: z.object({
    readings: z.array(TelemetryReadingSchema),
    statistics: z.object({
      count: z.number().int().nonnegative(),
      min: z.number().optional(),
      max: z.number().optional(),
      avg: z.number().optional(),
      stddev: z.number().optional(),
    }).optional(),
    coverage_percent: z.number().optional(),
  }),
});

// GET /api/v1/telemetry/latest
export const SensorMetricSchema = z.object({
  metric_type: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  status: z.string(),
  timestamp: z.string().datetime(),
});

export const SensorDeviceSchema = z.object({
  device_id: z.string().uuid(),
  device_name: z.string(),
  metrics: z.array(SensorMetricSchema),
  mini_trend: z.array(z.number()).optional(),
});

export const TelemetryLatestResponseSchema = z.object({
  data: z.object({
    sensors: z.array(SensorDeviceSchema),
  }),
});

