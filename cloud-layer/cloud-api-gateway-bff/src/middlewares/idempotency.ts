import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

const cache = new Map<string, any>()

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string

    if (!key) {
        return next()
    }

    if (cache.has(key)) {
        logger.info(`Idempotency hit for key: ${key}`)
        return res.json(cache.get(key))
    }

    // Intercept response to cache it
    const originalSend = res.json
    res.json = function (body) {
        cache.set(key, body)
        return originalSend.call(this, body)
    }

    next()
}
