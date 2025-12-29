import { z } from 'zod'

export const TelemetryReadingPayloadSchema = z.object({
  tenant_id: z.string().min(1),
  farm_id: z.string().min(1).optional(),
  barn_id: z.string().min(1).optional(),
  device_id: z.string().min(1),
  metric_type: z.string().min(1),
  metric_value: z.number(),
  unit: z.string().min(1).optional(),
  occurred_at: z.string().min(1),
})

export type TelemetryReadingPayload = z.infer<typeof TelemetryReadingPayloadSchema>

export const MediaStoredPayloadSchema = z.object({
  media_id: z.string().min(1).optional(),
  object_id: z.string().min(1).optional(),
  object_key: z.string().min(1),
  bucket: z.string().min(1).optional(),
  etag: z.string().min(1).optional(),
  captured_at: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  session_id: z.string().min(1).optional(),
  tenant_id: z.string().min(1).optional(),
  farm_id: z.string().min(1).optional(),
  barn_id: z.string().min(1).optional(),
  device_id: z.string().min(1).optional(),
})

export type MediaStoredPayload = z.infer<typeof MediaStoredPayloadSchema>

export const MediaImageCompleteRequestSchema = z.object({
  tenant_id: z.string().min(1),
  farm_id: z.string().min(1),
  barn_id: z.string().min(1),
  device_id: z.string().min(1),
  object_key: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().nonnegative().optional(),
  captured_at: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
})

export type MediaImageCompleteRequest = z.infer<
  typeof MediaImageCompleteRequestSchema
>

export const MediaImagePresignRequestSchema = z.object({
  tenant_id: z.string().min(1),
  farm_id: z.string().min(1),
  barn_id: z.string().min(1),
  device_id: z.string().min(1),
  content_type: z.string().min(1),
  filename: z.string().min(1),
})

export type MediaImagePresignRequest = z.infer<
  typeof MediaImagePresignRequestSchema
>

export const InferenceCompletedPayloadSchema = z.object({
  inference_result_id: z.string().min(1),
  predicted_weight_kg: z.number(),
  confidence: z.number().min(0).max(1),
  model_version: z.string().min(1),
  occurred_at: z.string().min(1),
  media_id: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  tenant_id: z.string().min(1).optional(),
  farm_id: z.string().min(1).optional(),
  barn_id: z.string().min(1).optional(),
  device_id: z.string().min(1).optional(),
})

export type InferenceCompletedPayload = z.infer<typeof InferenceCompletedPayloadSchema>

export const WeighVisionSessionCreatedPayloadSchema = z.object({
  session_id: z.string().min(1),
  start_at: z.string().min(1),
  device_id: z.string().min(1),
  tenant_id: z.string().min(1).optional(),
  farm_id: z.string().min(1).optional(),
  barn_id: z.string().min(1).optional(),
  station_id: z.string().min(1).optional(),
  batch_id: z.string().min(1).optional(),
})

export type WeighVisionSessionCreatedPayload = z.infer<
  typeof WeighVisionSessionCreatedPayloadSchema
>

export const WeighVisionSessionFinalizedPayloadSchema = z.object({
  session_id: z.string().min(1),
  end_at: z.string().min(1),
  final_weight_kg: z.number().optional(),
  device_id: z.string().min(1).optional(),
  image_count: z.number().int().nonnegative().optional(),
  tenant_id: z.string().min(1).optional(),
})

export type WeighVisionSessionFinalizedPayload = z.infer<
  typeof WeighVisionSessionFinalizedPayloadSchema
>

export const WeighVisionSessionAttachRequestSchema = z.object({
  media_id: z.string().min(1).optional(),
  inference_result_id: z.string().min(1).optional(),
  captured_at: z.string().min(1).optional(),
}).refine((v: { media_id?: string; inference_result_id?: string }) => v.media_id || v.inference_result_id, {
  message: 'media_id or inference_result_id is required',
})

export type WeighVisionSessionAttachRequest = z.infer<
  typeof WeighVisionSessionAttachRequestSchema
>
