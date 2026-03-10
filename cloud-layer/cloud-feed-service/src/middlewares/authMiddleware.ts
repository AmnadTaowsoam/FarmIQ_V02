import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
    return payload
  } catch {
    return null
  }
}

function applyJwtLocals(payload: any, res: Response): void {
  const roles = payload?.roles || payload?.role || []
  const rolesArray = Array.isArray(roles) ? roles : [roles]
  res.locals.roles = rolesArray

  if (payload?.tenant_id) {
    res.locals.tenantId = payload.tenant_id
  }

  if (rolesArray.includes('platform_admin')) {
    res.locals.isPlatformAdmin = true
  }

  res.locals.userId = payload?.sub || payload?.user_id
}

/**
 * JWT Auth Middleware (for read endpoints)
 */
export function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Missing or invalid Authorization header')
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
            traceId: res.locals.traceId || 'unknown',
          },
        })
        return
      }

      logger.debug('No Authorization header - allowing request (dev mode)')
      next()
      return
    }

    const token = authHeader.substring(7)

    if (process.env.JWT_SECRET) {
      const payload = decodeJwtPayload(token)
      if (payload) {
        applyJwtLocals(payload, res)
      } else {
        logger.warn('Failed to parse JWT token in cloud-feed-service')
      }
    } else {
      logger.warn('JWT_SECRET not set - JWT validation disabled (dev mode)')
      // In local/dev deployments without JWT_SECRET, decode token payload
      // to preserve role-based access checks.
      const payload = decodeJwtPayload(token)
      if (payload) {
        applyJwtLocals(payload, res)
      }
    }

    next()
  } catch (error) {
    logger.error('Error in jwtAuthMiddleware (cloud-feed-service):', error)
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication error',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }
    next()
  }
}

/**
 * RBAC middleware - checks if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const shouldEnforceRbac =
      process.env.NODE_ENV === 'production' && Boolean(process.env.JWT_SECRET)

    if (!shouldEnforceRbac) {
      next()
      return
    }

    const roles = res.locals.roles || []
    const hasRole = allowedRoles.some((role) => roles.includes(role))

    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${allowedRoles.join(' or ')}`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    next()
  }
}

/**
 * Internal service auth middleware
 */
export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.NODE_ENV === 'production') {
    return jwtAuthMiddleware(req, res, next)
  }
  
  next()
}

