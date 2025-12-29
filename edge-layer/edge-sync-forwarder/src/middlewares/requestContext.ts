import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.header('x-request-id') || uuidv4()).toString()
  const traceId = (req.header('x-trace-id') || requestId).toString()

  res.locals.requestId = requestId
  res.locals.traceId = traceId

  res.setHeader('x-request-id', requestId)
  res.setHeader('x-trace-id', traceId)

  next()
}

