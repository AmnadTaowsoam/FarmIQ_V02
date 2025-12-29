import { z } from 'zod'

export const StandardHeadersSchema = z.object({
  'x-tenant-id': z.string().min(1).optional(),
  'x-request-id': z.string().min(1).optional(),
  'x-trace-id': z.string().min(1).optional(),
})

export type StandardHeaders = z.infer<typeof StandardHeadersSchema>

