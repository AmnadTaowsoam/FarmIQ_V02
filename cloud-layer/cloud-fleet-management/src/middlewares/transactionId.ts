import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export const transactionIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const transactionId = req.headers['x-request-id'] || uuidv4()
    // @ts-ignore
    req.transactionId = transactionId
    next()
}
