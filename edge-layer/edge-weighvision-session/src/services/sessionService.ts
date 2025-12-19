import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const createSession = async (data: any) => {
    const { sessionId, tenantId, farmId, barnId, deviceId, stationId, batchId, startAt, traceId } = data;

    return await prisma.$transaction(async (tx) => {
        // Idempotent upsert
        const session = await tx.weightSession.upsert({
            where: { sessionId },
            create: {
                sessionId,
                tenantId,
                farmId,
                barnId,
                deviceId,
                stationId,
                batchId,
                status: 'created',
                startAt: new Date(startAt),
            },
            update: {} // No-op if exists
        });

        // Reconcile pending media bindings
        const unboundMedia = await tx.sessionMediaBinding.findMany({
            where: { sessionId, isBound: false }
        });

        if (unboundMedia.length > 0) {
            await tx.sessionMediaBinding.updateMany({
                where: { id: { in: unboundMedia.map(m => m.id) } },
                data: { isBound: true }
            });

            await tx.weightSession.update({
                where: { sessionId },
                data: { imageCount: { increment: unboundMedia.length } }
            });

            logger.info(`Reconciled ${unboundMedia.length} media bindings for session ${sessionId}`);
        }

        // Reconcile pending weight records if any (not strictly required but good for consistency)
        const weights = await tx.sessionWeight.findMany({
            where: { sessionId }
        });

        if (weights.length > 0 && !session.initialWeightKg) {
            const firstWeight = weights.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())[0];
            await tx.weightSession.update({
                where: { sessionId },
                data: { initialWeightKg: firstWeight.weightKg }
            });
        }

        // Emit outbox event if status is 'created' and not already emitted
        // Using a check on the event type and session_id in payload
        const outboxExists = await tx.outbox.findFirst({
            where: {
                tenantId,
                eventType: 'weighvision.session.created',
                payload: {
                    path: ['session_id'],
                    equals: sessionId
                }
            }
        });

        if (!outboxExists) {
            await tx.outbox.create({
                data: {
                    eventType: 'weighvision.session.created',
                    tenantId,
                    traceId: traceId || 'internal',
                    payload: {
                        session_id: sessionId,
                        tenant_id: tenantId,
                        farm_id: farmId,
                        barn_id: barnId,
                        device_id: deviceId,
                        station_id: stationId,
                        batch_id: batchId,
                        occurred_at: startAt
                    }
                }
            });
        }

        return session;
    });
};

export const getSession = async (sessionId: string) => {
    return await prisma.weightSession.findUnique({
        where: { sessionId },
        include: {
            weights: {
                orderBy: { occurredAt: 'asc' }
            }
        }
    });
};

export const bindWeight = async (sessionId: string, data: any) => {
    const { tenantId, weightKg, occurredAt, eventId, traceId } = data;

    return await prisma.$transaction(async (tx) => {
        // Create weight record (unique by tenantId + eventId handles idempotency)
        const weight = await tx.sessionWeight.upsert({
            where: { tenantId_eventId: { tenantId, eventId } },
            create: {
                sessionId,
                tenantId,
                weightKg,
                occurredAt: new Date(occurredAt),
                eventId,
                traceId
            },
            update: {}
        });

        // Update initial weight if first
        const session = await tx.weightSession.findUnique({ where: { sessionId } });
        if (session && !session.initialWeightKg) {
            await tx.weightSession.update({
                where: { sessionId },
                data: { initialWeightKg: weightKg }
            });
        }

        return weight;
    });
};

export const bindMedia = async (sessionId: string, data: any) => {
    const { tenantId, mediaObjectId, occurredAt, eventId, traceId } = data;

    return await prisma.$transaction(async (tx) => {
        // Create media binding
        const binding = await tx.sessionMediaBinding.upsert({
            where: { tenantId_eventId: { tenantId, eventId } },
            create: {
                sessionId,
                tenantId,
                mediaObjectId,
                occurredAt: new Date(occurredAt),
                eventId,
                traceId,
                isBound: false // Will be updated if session exists
            },
            update: {}
        });

        // Check if session exists to update imageCount
        const session = await tx.weightSession.findUnique({ where: { sessionId } });
        if (session && !binding.isBound) {
            await tx.sessionMediaBinding.update({
                where: { id: binding.id },
                data: { isBound: true }
            });

            await tx.weightSession.update({
                where: { sessionId },
                data: { imageCount: { increment: 1 } }
            });
        }

        return binding;
    });
};

export const finalizeSession = async (sessionId: string, traceId: string) => {
    return await prisma.$transaction(async (tx) => {
        const session = await tx.weightSession.findUnique({
            where: { sessionId },
            include: { weights: { orderBy: { occurredAt: 'desc' }, take: 1 } }
        });

        if (!session) throw new Error('Session not found');
        if (session.status === 'finalized') return session;

        const finalWeight = session.weights[0]?.weightKg || session.initialWeightKg;
        const endTime = new Date();

        const updatedSession = await tx.weightSession.update({
            where: { sessionId },
            data: {
                status: 'finalized',
                endAt: endTime,
                finalWeightKg: finalWeight
            }
        });

        // Emit finalized event
        await tx.outbox.create({
            data: {
                eventType: 'weighvision.session.finalized',
                tenantId: session.tenantId,
                traceId: traceId || 'internal',
                payload: {
                    session_id: sessionId,
                    tenant_id: session.tenantId,
                    final_weight_kg: finalWeight,
                    image_count: updatedSession.imageCount,
                    end_at: endTime
                }
            }
        });

        return updatedSession;
    });
};
