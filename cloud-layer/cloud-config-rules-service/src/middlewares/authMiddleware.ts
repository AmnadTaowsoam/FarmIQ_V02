import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * JWT Auth Middleware (pluggable)
 * 
 * MVP:
 * - Requires Authorization: Bearer <JWT> in production
 * - In dev, allows missing token but still parses if present
 * - Extracts tenant scope and roles into res.locals
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

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (process.env.JWT_SECRET) {
      try {
        // Basic base64 decode of payload (NOT secure, MVP only)
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

          const roles = payload.roles || payload.role || []
          const rolesArray = Array.isArray(roles) ? roles : [roles]
          res.locals.roles = rolesArray

          if (payload.tenant_id) {
            res.locals.tenantId = payload.tenant_id
            logger.debug(`Extracted tenantId from JWT: ${payload.tenant_id}`)
          }

          if (rolesArray.includes('platform_admin')) {
            res.locals.isPlatformAdmin = true
            logger.debug('User has platform_admin role - can query any tenant')
          }

          res.locals.userId = payload.sub || payload.user_id
        }
      } catch (parseError) {
        logger.warn('Failed to parse JWT token in cloud-config-rules-service', {
          error: (parseError as Error).message,
        })
      }
    } else {
      logger.warn('JWT_SECRET not set - JWT validation disabled (dev mode)')
    }

    next()
  } catch (error) {
    logger.error('Error in jwtAuthMiddleware (cloud-config-rules-service):', error)
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

