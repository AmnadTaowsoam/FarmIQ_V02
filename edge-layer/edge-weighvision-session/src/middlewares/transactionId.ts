import { Request as ExpressRequest, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export interface Request extends ExpressRequest {
  requestId?: string
  traceId?: string
}

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req.header('x-request-id') || uuidv4()).toString()
  const traceId = (req.header('x-trace-id') || requestId).toString()

  req.requestId = requestId
  req.traceId = traceId

  res.locals.requestId = requestId
  res.locals.traceId = traceId

  res.setHeader('x-request-id', requestId)
  res.setHeader('x-trace-id', traceId)
  next()
}
