import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: true },
        });

        if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid email or password',
                    traceId: req.headers['x-trace-id'] || 'trace-id',
                },
            });
        }

        const payload = {
            sub: user.id,
            roles: user.roles.map((r) => r.name),
            tenant_id: user.tenantId,
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

        return res.status(200).json({
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 3600,
        });
    } catch (error) {
        return res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }
};

export const refresh = async (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'refresh_token is required',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }

    try {
        const decoded = jwt.verify(refresh_token, REFRESH_TOKEN_SECRET) as any;
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            include: { roles: true },
        });

        if (!user) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not found',
                    traceId: req.headers['x-trace-id'] || 'trace-id',
                },
            });
        }

        const payload = {
            sub: user.id,
            roles: user.roles.map((r) => r.name),
            tenant_id: user.tenantId,
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        return res.status(200).json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
        });
    } catch (error) {
        return res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid refresh token',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }
};

export const me = async (req: Request, res: Response) => {
    // Assuming authMiddleware has already attached the user info to req
    const userId = (req as any).user?.sub;

    if (!userId) {
        return res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'No user info in request',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { roles: true },
        });

        if (!user) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found',
                    traceId: req.headers['x-trace-id'] || 'trace-id',
                },
            });
        }

        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
    } catch (error) {
        return res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
                traceId: req.headers['x-trace-id'] || 'trace-id',
            },
        });
    }
};
