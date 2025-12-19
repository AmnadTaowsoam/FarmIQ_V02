import { Request as ExpressRequest, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Create a new Request type that includes the id property
interface Request extends ExpressRequest {
  id?: string
}

export const transactionIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()
  const traceId = (req.headers['x-trace-id'] as string) || requestId
  
  req.id = requestId
  res.locals.transactionId = requestId
  res.locals.requestId = requestId // Map to requestId for consistency
  res.locals.traceId = traceId
  
  // Set response headers
  res.setHeader('x-request-id', requestId)
  if (traceId) {
    res.setHeader('x-trace-id', traceId)
  }
  
  next()
}
