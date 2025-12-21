import { Request as ExpressRequest, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export interface Request extends ExpressRequest {
  requestId?: string
}

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] || uuidv4()
  req.requestId = requestId as string
  res.setHeader('x-request-id', requestId as string)
  next()
}

