import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * API Versioning Middleware
 * Extracts API version from URL path or Accept header
 * Sets res.locals.apiVersion for downstream use
 */
export function apiVersioningMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract version from URL path: /api/v1/..., /api/v2/...
    const pathMatch = req.path.match(/^\/api\/(v\d+)\//)
    if (pathMatch) {
      res.locals.apiVersion = pathMatch[1]
      res.setHeader('x-api-version', pathMatch[1])
    } else {
      // Default to v1 if no version in path
      res.locals.apiVersion = 'v1'
      res.setHeader('x-api-version', 'v1')
    }

    next()
  } catch (error) {
    logger.error('Error in apiVersioningMiddleware:', error)
    next()
  }
}

/**
 * Deprecation Notice Middleware
 * Adds X-Sunset header for deprecated endpoints
 */
export function deprecationMiddleware(
  sunsetDate: string, // ISO 8601 date
  migrationGuide?: string
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Sunset', sunsetDate)
    res.setHeader('X-API-Deprecated', 'true')
    
    if (migrationGuide) {
      res.setHeader('X-API-Migration-Guide', migrationGuide)
    }

    // Log deprecation usage
    logger.warn('Deprecated endpoint accessed', {
      path: req.path,
      method: req.method,
      sunsetDate,
      requestId: res.locals.requestId,
    })

    next()
  }
}

/**
 * Version routing helper
 * Routes requests to version-specific handlers
 */
export function versionRouter(
  handlers: Record<string, (req: Request, res: Response, next: NextFunction) => void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = res.locals.apiVersion || 'v1'
    const handler = handlers[version]

    if (handler) {
      handler(req, res, next)
    } else {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `API version ${version} not supported`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
  }
}
