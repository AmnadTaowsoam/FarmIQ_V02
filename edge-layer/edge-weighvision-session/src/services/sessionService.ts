import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const pingDb = async () => {
    await prisma.$queryRaw`SELECT 1`;
};

export const createSession = async (data: any) => {
    const { sessionId, eventId, tenantId, farmId, barnId, deviceId, stationId, batchId, startAt, traceId } = data;

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

        // Emit sync_outbox event (idempotent by eventId).
        try {
            await tx.$executeRawUnsafe(
                `
                INSERT INTO sync_outbox (
                    id, tenant_id, farm_id, barn_id, device_id, session_id,
                    event_type, occurred_at, trace_id, payload_json,
                    status, next_attempt_at, priority, attempt_count, created_at, updated_at
                ) VALUES (
                    $1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text,
                    'weighvision.session.created', $7::timestamptz, $8::text, $9::jsonb,
                    'pending', NOW(), 0, 0, NOW(), NOW()
                )
                ON CONFLICT (id) DO NOTHING
                `,
                eventId,
                tenantId,
                farmId,
                barnId,
                deviceId,
                sessionId,
                new Date(startAt),
                traceId || null,
                JSON.stringify({
                    session_id: sessionId,
                    tenant_id: tenantId,
                    farm_id: farmId,
                    barn_id: barnId,
                    device_id: deviceId,
                    station_id: stationId,
                    batch_id: batchId,
                    start_at: startAt
                })
            );
        } catch (error: any) {
            logger.error('Failed to write sync_outbox weighvision.session.created', {
                error: error?.message ?? String(error),
                eventId,
                traceId
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

export const finalizeSession = async (sessionId: string, data: { tenantId: string, eventId: string, occurredAt: string, traceId: string }) => {
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

        // Emit sync_outbox finalized event (idempotent by eventId).
        try {
            await tx.$executeRawUnsafe(
                `
                INSERT INTO sync_outbox (
                    id, tenant_id, device_id, session_id,
                    event_type, occurred_at, trace_id, payload_json,
                    status, next_attempt_at, priority, attempt_count, created_at, updated_at
                ) VALUES (
                    $1::uuid, $2::text, $3::text, $4::text,
                    'weighvision.session.finalized', $5::timestamptz, $6::text, $7::jsonb,
                    'pending', NOW(), 0, 0, NOW(), NOW()
                )
                ON CONFLICT (id) DO NOTHING
                `,
                data.eventId,
                session.tenantId,
                session.deviceId,
                sessionId,
                new Date(data.occurredAt),
                data.traceId || null,
                JSON.stringify({
                    session_id: sessionId,
                    tenant_id: session.tenantId,
                    device_id: session.deviceId,
                    final_weight_kg: finalWeight,
                    image_count: updatedSession.imageCount,
                    end_at: endTime.toISOString()
                })
            );
        } catch (error: any) {
            logger.error('Failed to write sync_outbox weighvision.session.finalized', {
                error: error?.message ?? String(error),
                eventId: data.eventId,
                traceId: data.traceId
            });
        }

        return updatedSession;
    });
};
