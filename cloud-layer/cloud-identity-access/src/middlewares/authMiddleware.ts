import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// IMPORTANT: JWT_SECRET must be set in environment variables
// Generate a secure secret using: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'No token provided',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'farmiq',
            audience: 'farmiq-api',
        });
        (req as any).user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token has expired',
                    traceId: req.headers['x-trace-id'] || 'trace-id',
                },
            });
        } else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid token',
                    traceId: req.headers['x-trace-id'] || 'trace-id',
                },
            });
        }
        return res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication failed',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }
};
