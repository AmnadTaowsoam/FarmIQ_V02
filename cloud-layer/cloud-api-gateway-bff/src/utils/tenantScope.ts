import { Response } from 'express'
import { logger } from './logger'

/**
 * Resolve tenantId for a request.
 *
 * Order of precedence:
 * 1. If user is platform_admin and tenantId is provided in request → use that.
 * 2. In non-production (dev), if tenantId is provided in request → allow it to override JWT tenant scope.
 * 2. JWT-derived tenantId in res.locals.tenantId.
 * 3. Fallback to request tenantId (for dev only, logs a warning).
 */
export function getTenantIdFromRequest(
  res: Response,
  reqTenantId?: string
): string | null {
  if (res.locals.isPlatformAdmin && reqTenantId) {
    logger.debug(`Platform admin querying tenant: ${reqTenantId}`)
    return reqTenantId
  }

  // Dev convenience: allow query-param tenant override even when JWT has a tenant scope.
  // This prevents confusing "no data" situations when the UI switches tenant context but the token is scoped to a different tenant.
  if (process.env.NODE_ENV !== 'production' && reqTenantId) {
    logger.warn('Using tenantId from request (dev override)')
    return reqTenantId
  }

  if (res.locals.tenantId) {
    return res.locals.tenantId
  }

  if (reqTenantId) {
    logger.warn(
      'Using tenantId from request (not from JWT) - should only happen in dev mode'
    )
    return reqTenantId
  }

  return null
}


