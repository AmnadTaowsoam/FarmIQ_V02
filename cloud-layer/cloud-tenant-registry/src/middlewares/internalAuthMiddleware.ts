import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN
  const traceId = res.locals.traceId || 'unknown'

  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('INTERNAL_SERVICE_TOKEN is not configured in production')
      res.status(500).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'Internal authentication is not configured',
          traceId,
        },
      })
      return
    }
    logger.warn('INTERNAL_SERVICE_TOKEN is not configured; allowing internal request in non-production')
    next()
    return
  }

  const incoming = req.headers['x-internal-token']
  const providedToken = Array.isArray(incoming) ? incoming[0] : incoming

  if (typeof providedToken !== 'string' || providedToken !== expectedToken) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid internal authentication token',
        traceId,
      },
    })
    return
  }

  next()
}
