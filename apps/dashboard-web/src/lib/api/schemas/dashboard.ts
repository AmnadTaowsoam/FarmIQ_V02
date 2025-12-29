import { z } from 'zod';

// GET /api/v1/dashboard/overview
export const OverviewKPIsSchema = z.object({
  total_farms: z.number().int().nonnegative(),
  total_barns: z.number().int().nonnegative(),
  active_devices: z.number().int().nonnegative(),
  critical_alerts: z.number().int().nonnegative(),
  avg_weight_today_kg: z.number().optional(),
  fcr_7day_avg: z.number().optional(),
});

export const OverviewAlertSchema = z.object({
  alert_id: z.string().uuid(),
  severity: z.string(),
  type: z.string(),
  message: z.string(),
  occurred_at: z.string().datetime(),
});

export const OverviewActivitySchema = z.object({
  type: z.string(),
  barn_id: z.string().uuid().optional(),
  barn_name: z.string().optional(),
  occurred_at: z.string().datetime(),
});

export const OverviewWeightTrendSchema = z.object({
  date: z.string(),
  avg_weight_kg: z.number(),
});

export const DashboardOverviewResponseSchema = z.object({
  data: z.object({
    kpis: OverviewKPIsSchema,
    recent_alerts: z.array(OverviewAlertSchema).optional(),
    recent_activity: z.array(OverviewActivitySchema).optional(),
    weight_trend: z.array(OverviewWeightTrendSchema).optional(),
    sensor_status: z.object({
      temperature: z.object({
        current: z.number(),
        status: z.string(),
      }).optional(),
      humidity: z.object({
        current: z.number(),
        status: z.string(),
      }).optional(),
    }).optional(),
  }),
});

