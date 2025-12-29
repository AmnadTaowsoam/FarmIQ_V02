import { z } from 'zod';

// Common schemas used across multiple endpoints

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  hasNext: z.boolean(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    traceId: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
});

export const TenantSchema = z.object({
  tenant_id: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  created_at: z.string().datetime(),
});

export const FarmSchema = z.object({
  farm_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  location: z.string().optional(),
  barn_count: z.number().int().nonnegative().optional(),
  device_count: z.number().int().nonnegative().optional(),
  status: z.string(),
  last_activity: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

export const BarnSchema = z.object({
  barn_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  farm_id: z.string().uuid(),
  name: z.string(),
  type: z.string().optional(),
  device_count: z.number().int().nonnegative().optional(),
  current_temperature: z.number().optional(),
  current_humidity: z.number().optional(),
  status: z.string(),
  last_activity: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

export const DeviceSchema = z.object({
  device_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  farm_id: z.string().uuid().optional(),
  barn_id: z.string().uuid().optional(),
  name: z.string(),
  serial_number: z.string().optional(),
  type: z.string(),
  status: z.string(),
  last_seen: z.string().datetime().optional(),
  uptime_percent_24h: z.number().optional(),
  uptime_percent_7d: z.number().optional(),
  uptime_percent_30d: z.number().optional(),
  firmware_version: z.string().optional(),
  telemetry_count_today: z.number().int().nonnegative().optional(),
  created_at: z.string().datetime(),
});

