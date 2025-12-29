import { z } from 'zod';
import { TenantSchema, FarmSchema, BarnSchema, DeviceSchema, PaginationMetaSchema } from './common';

// GET /api/v1/registry/tenants
export const TenantsListResponseSchema = z.object({
  data: z.array(TenantSchema),
  meta: PaginationMetaSchema,
});

// GET /api/v1/registry/farms
export const FarmsListResponseSchema = z.object({
  data: z.array(FarmSchema),
  meta: PaginationMetaSchema,
});

// GET /api/v1/registry/farms/:farmId
export const FarmDetailResponseSchema = z.object({
  data: FarmSchema.extend({
    barns: z.array(BarnSchema.pick({ barn_id: true, name: true, device_count: true })).optional(),
  }),
});

// GET /api/v1/registry/barns
export const BarnsListResponseSchema = z.object({
  data: z.array(BarnSchema),
  meta: PaginationMetaSchema,
});

// GET /api/v1/registry/barns/:barnId
export const BarnDetailResponseSchema = z.object({
  data: BarnSchema.extend({
    devices: z.array(DeviceSchema.pick({
      device_id: true,
      name: true,
      type: true,
      status: true,
      last_seen: true,
    })).optional(),
  }),
});

// GET /api/v1/registry/devices
export const DevicesListResponseSchema = z.object({
  data: z.array(DeviceSchema),
  meta: PaginationMetaSchema,
});

// GET /api/v1/registry/devices/:deviceId
export const DeviceDetailResponseSchema = z.object({
  data: DeviceSchema,
});

