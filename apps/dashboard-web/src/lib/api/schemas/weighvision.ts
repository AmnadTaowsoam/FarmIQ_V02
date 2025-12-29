import { z } from 'zod';

// GET /api/v1/weighvision/sessions
export const WeighVisionSessionSchema = z.object({
  session_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  farm_id: z.string().uuid().optional(),
  barn_id: z.string().uuid().optional(),
  station_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
  status: z.string(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime().optional(),
  initial_weight_kg: z.number().optional(),
  final_weight_kg: z.number().optional(),
  image_count: z.number().int().nonnegative().optional(),
  created_at: z.string().datetime(),
});

export const WeighVisionSessionsListResponseSchema = z.object({
  data: z.array(WeighVisionSessionSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasNext: z.boolean(),
  }),
});

// GET /api/v1/weighvision/sessions/:sessionId
export const PredictionSchema = z.object({
  image_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  predicted_weight_kg: z.number(),
  confidence_score: z.number().min(0).max(1),
  size_proxy: z.string().optional(),
  is_outlier: z.boolean(),
});

export const WeighVisionSessionDetailResponseSchema = z.object({
  data: WeighVisionSessionSchema.extend({
    predictions: z.array(PredictionSchema).optional(),
    statistics: z.object({
      min_weight_kg: z.number().optional(),
      max_weight_kg: z.number().optional(),
      avg_weight_kg: z.number().optional(),
      stddev_kg: z.number().optional(),
      outlier_count: z.number().int().nonnegative().optional(),
    }).optional(),
    images: z.array(z.object({
      image_id: z.string().uuid(),
      presigned_url: z.string().url(),
      expires_at: z.string().datetime(),
      timestamp: z.string().datetime(),
    })).optional(),
  }),
});

// GET /api/v1/weighvision/analytics
export const WeightTrendDataPointSchema = z.object({
  date: z.string(),
  avg_weight_kg: z.number(),
  min_weight_kg: z.number().optional(),
  max_weight_kg: z.number().optional(),
  p10_weight_kg: z.number().optional(),
  p25_weight_kg: z.number().optional(),
  p50_weight_kg: z.number().optional(),
  p75_weight_kg: z.number().optional(),
  p90_weight_kg: z.number().optional(),
});

export const WeighVisionAnalyticsResponseSchema = z.object({
  data: z.object({
    weight_trend: z.array(WeightTrendDataPointSchema),
    statistics: z.object({
      current_avg_weight_kg: z.number().optional(),
      current_stddev_kg: z.number().optional(),
      uniformity_percent: z.number().optional(),
      cv: z.number().optional(),
      iqr_kg: z.number().optional(),
    }).optional(),
    distribution: z.object({
      bins: z.array(z.object({
        range: z.string(),
        count: z.number().int().nonnegative(),
      })).optional(),
    }).optional(),
  }),
});

