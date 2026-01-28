import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export function transactionIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || uuidv4()
  const traceId = req.headers['x-trace-id'] as string || uuidv4()

  res.locals.requestId = requestId
  res.locals.traceId = traceId

  res.setHeader('x-request-id', requestId)
  res.setHeader('x-trace-id', traceId)

  next()
}
