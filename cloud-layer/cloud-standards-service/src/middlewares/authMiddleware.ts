import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV === 'production') {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
            traceId: res.locals.traceId || 'unknown',
          },
        })
        return
      }

      next()
      return
    }

    const token = authHeader.substring(7)

    if (process.env.JWT_SECRET) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          const roles = payload.roles || payload.role || []
          const rolesArray = Array.isArray(roles) ? roles : [roles]
          res.locals.roles = rolesArray

          if (payload.tenant_id) {
            res.locals.tenantId = payload.tenant_id
          }

          if (rolesArray.includes('platform_admin')) {
            res.locals.isPlatformAdmin = true
          }

          res.locals.userId = payload.sub || payload.user_id
        }
      } catch (parseError) {
        logger.warn('Failed to parse JWT token in cloud-standards-service', {
          error: (parseError as Error).message,
        })
      }
    } else {
      logger.warn('JWT_SECRET not set - JWT validation disabled (dev mode)')
    }

    next()
  } catch (error) {
    logger.error('Error in jwtAuthMiddleware (cloud-standards-service):', error)
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

export function requireRole(...allowedRoles: string[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const roles = res.locals.roles || []
    const hasRole = allowedRoles.some((role) => roles.includes(role))

    if (!hasRole && process.env.NODE_ENV === 'production') {
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

