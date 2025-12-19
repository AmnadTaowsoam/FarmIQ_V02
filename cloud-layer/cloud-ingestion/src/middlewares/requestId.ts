import { Request as ExpressRequest, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Create a new Request type that includes the requestId property
export interface Request extends ExpressRequest {
  requestId?: string
}

export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] || uuidv4()
  req.requestId = Array.isArray(requestId) ? requestId[0] : requestId
  next()
}
