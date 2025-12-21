import { Response } from 'express'
import { logger } from './logger'

export function getTenantIdFromRequest(
  res: Response,
  reqTenantId?: string
): string | null {
  if (res.locals.isPlatformAdmin && reqTenantId) {
    logger.debug(`Platform admin querying tenant: ${reqTenantId}`)
    return reqTenantId
  }

  if (res.locals.tenantId) {
    return res.locals.tenantId
  }

  if (reqTenantId) {
    logger.warn('Using tenantId from request (not from JWT) - should only happen in dev mode')
    return reqTenantId
  }

  return null
}
