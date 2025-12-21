import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export function transactionIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] || randomUUID()
  res.locals.requestId = requestId as string
  res.setHeader('x-request-id', requestId as string)

  const traceId = req.headers['x-trace-id'] || randomUUID()
  res.locals.traceId = traceId as string
  res.setHeader('x-trace-id', traceId as string)

  next()
}
