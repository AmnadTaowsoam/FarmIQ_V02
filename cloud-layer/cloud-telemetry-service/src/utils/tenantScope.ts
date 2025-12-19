import { Response } from 'express'
import { logger } from './logger'

/**
 * Get tenant ID from request (JWT, query, or body)
 * Supports platform_admin role to query any tenant
 */
export function getTenantIdFromRequest(
  res: Response,
  reqTenantId?: string
): string | null {
  // If user is platform_admin, they can query any tenant
  if (res.locals.isPlatformAdmin && reqTenantId) {
    logger.debug(`Platform admin querying tenant: ${reqTenantId}`)
    return reqTenantId
  }

  // Otherwise, use tenantId from JWT (enforced)
  if (res.locals.tenantId) {
    return res.locals.tenantId
  }

  // Fallback to request parameter (for development/testing)
  if (reqTenantId) {
    logger.warn('Using tenantId from request (not from JWT) - should only happen in dev mode')
    return reqTenantId
  }

  return null
}

