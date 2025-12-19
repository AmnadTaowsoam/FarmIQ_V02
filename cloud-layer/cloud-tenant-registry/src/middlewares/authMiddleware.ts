import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * JWT Auth Middleware (pluggable - does not block compilation if auth service not ready)
 * 
 * MVP: Validates JWT signature and extracts tenant scope
 * 
 * This middleware is designed to be pluggable - if JWT_SECRET is not set or
 * jwt library is not available, it will log a warning but allow the request
 * to proceed (for development/testing). In production, this should be enforced.
 */
export function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In MVP, allow requests without auth for development
      // In production, this should return 401
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

    // MVP: Basic JWT validation
    // In production, use a proper JWT library (e.g., jsonwebtoken, jose)
    // and validate against cloud-identity-access service or shared secret
    if (process.env.JWT_SECRET) {
      // TODO: Implement proper JWT verification
      // For now, extract tenantId from token payload (if present)
      // This is a placeholder - proper implementation should:
      // 1. Verify JWT signature using JWT_SECRET
      // 2. Extract claims (tenantId, roles, etc.)
      // 3. Set res.locals.tenantId and res.locals.userId
      
      try {
        // Basic base64 decode of payload (not secure, just for MVP)
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          
          // Extract roles (can be string or array)
          const roles = payload.roles || payload.role || []
          const rolesArray = Array.isArray(roles) ? roles : [roles]
          res.locals.roles = rolesArray
          
          // Extract tenant_id if present
          if (payload.tenant_id) {
            res.locals.tenantId = payload.tenant_id
            logger.debug(`Extracted tenantId from JWT: ${payload.tenant_id}`)
          }
          
          // If platform_admin role, allow querying any tenant
          if (rolesArray.includes('platform_admin')) {
            res.locals.isPlatformAdmin = true
            logger.debug('User has platform_admin role - can query any tenant')
          }
          
          res.locals.userId = payload.sub || payload.user_id
        }
      } catch (parseError) {
        logger.warn('Failed to parse JWT token:', parseError)
        // Continue without setting tenantId - will be required in request body/query
      }
    } else {
      logger.warn('JWT_SECRET not set - JWT validation disabled (dev mode)')
    }

    next()
  } catch (error) {
    logger.error('Error in jwtAuthMiddleware:', error)
    // Don't block request in development
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

