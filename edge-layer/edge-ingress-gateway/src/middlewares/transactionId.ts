import { Request as ExpressRequest, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Create a new Request type that includes the id property
interface Request extends ExpressRequest {
  id?: string
}

export const transactionIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  req.id = uuidv4()
  next()
}
