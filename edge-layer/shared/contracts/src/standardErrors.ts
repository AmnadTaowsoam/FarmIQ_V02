import { z } from 'zod'

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.unknown(),
    traceId: z.string().min(1),
  }),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

