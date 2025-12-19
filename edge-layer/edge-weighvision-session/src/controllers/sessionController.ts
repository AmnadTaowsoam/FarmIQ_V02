import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as sessionService from '../services/sessionService';
import { z } from 'zod';

// Validation schemas
const createSessionSchema = z.object({
    sessionId: z.string().uuid(),
    tenantId: z.string().uuid(),
    farmId: z.string().uuid(),
    barnId: z.string().uuid(),
    deviceId: z.string().uuid(),
    stationId: z.string().uuid(),
    batchId: z.string().uuid().optional(),
    startAt: z.string().datetime(),
});

const bindWeightSchema = z.object({
    tenantId: z.string().uuid(),
    weightKg: z.number(),
    occurredAt: z.string().datetime(),
    eventId: z.string().uuid(),
});

const bindMediaSchema = z.object({
    tenantId: z.string().uuid(),
    mediaObjectId: z.string(),
    occurredAt: z.string().datetime(),
    eventId: z.string().uuid(),
});

export const createSession = async (req: Request, res: Response) => {
    const { requestId } = req as any;
    try {
        const validated = createSessionSchema.parse(req.body);
        const session = await sessionService.createSession({ ...validated, traceId: requestId });
        return res.status(201).json(session);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors, traceId: requestId } });
        }
        logger.error('Failed to create session', error, { requestId });
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create session', traceId: requestId } });
    }
};

export const getSession = async (req: Request, res: Response) => {
    const { requestId } = req as any;
    const { sessionId } = req.params;
    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found', traceId: requestId } });
        }
        return res.status(200).json(session);
    } catch (error: any) {
        logger.error('Failed to get session', error, { requestId });
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get session', traceId: requestId } });
    }
};

export const bindWeight = async (req: Request, res: Response) => {
    const { requestId } = req as any;
    const { sessionId } = req.params;
    try {
        const validated = bindWeightSchema.parse(req.body);
        const weight = await sessionService.bindWeight(sessionId, { ...validated, traceId: requestId });
        return res.status(200).json(weight);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors, traceId: requestId } });
        }
        logger.error('Failed to bind weight', error, { requestId });
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to bind weight', traceId: requestId } });
    }
};

export const bindMedia = async (req: Request, res: Response) => {
    const { requestId } = req as any;
    const { sessionId } = req.params;
    try {
        const validated = bindMediaSchema.parse(req.body);
        const binding = await sessionService.bindMedia(sessionId, { ...validated, traceId: requestId });
        return res.status(200).json(binding);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors, traceId: requestId } });
        }
        logger.error('Failed to bind media', error, { requestId });
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to bind media', traceId: requestId } });
    }
};

export const finalizeSession = async (req: Request, res: Response) => {
    const { requestId } = req as any;
    const { sessionId } = req.params;
    try {
        const session = await sessionService.finalizeSession(sessionId, requestId);
        return res.status(200).json(session);
    } catch (error: any) {
        if (error.message === 'Session not found') {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found', traceId: requestId } });
        }
        logger.error('Failed to finalize session', error, { requestId });
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to finalize session', traceId: requestId } });
    }
};

export const getHealth = async (req: Request, res: Response) => {
    return res.status(200).json({ status: 'healthy' });
};

export const getReady = async (req: Request, res: Response) => {
    // Basic readiness check - can be expanded to check DB
    return res.status(200).json({ status: 'ready' });
};
