import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
/**
 *
 /**
 * Handle GET request to get examples
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Next function
 */
export function exampleMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.info('Example middleware executed')
  next()
}
