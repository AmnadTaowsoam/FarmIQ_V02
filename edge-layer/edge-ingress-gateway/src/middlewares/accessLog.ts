import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 *
 * @param req
 * @param res
 * @param next
 */
export function accessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startedAt = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    logger.info('http_request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      requestId: res.locals.requestId,
      traceId: res.locals.traceId,
    })
  })
  next()
}
