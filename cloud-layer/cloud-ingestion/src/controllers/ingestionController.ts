import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { publishEvent } from '../utils/rabbitmq';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface IngestionEvent {
    event_id: string;
    event_type: string;
    tenant_id: string;
    farm_id: string;
    barn_id: string;
    device_id?: string;
    station_id?: string;
    occurred_at: string;
    trace_id: string;
    schema_version: string;
    payload: any;
    session_id?: string;
}

interface IngestionBatch {
    tenant_id: string;
    edge_id?: string;
    sent_at: string;
    events: IngestionEvent[];
}

export const ingestBatch = async (req: Request, res: Response) => {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const requestId = (req as any).requestId || uuidv4();
    const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

    const batch: IngestionBatch = req.body;

    if (!batch || !batch.tenant_id || !Array.isArray(batch.events)) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid batch format. tenant_id and events array are required.',
                traceId,
            },
        });
    }

    if (tenantHeader && tenantHeader !== batch.tenant_id) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'x-tenant-id header does not match batch.tenant_id',
                traceId,
            },
        });
    }

    let accepted = 0;
    let duplicated = 0;
    let rejected = 0;
    const errors: any[] = [];

    for (const event of batch.events) {
        try {
            // 1. Validation
            const validationError = validateEvent(event);
            if (validationError) {
                rejected++;
                errors.push({ event_id: event.event_id, error: validationError });
                continue;
            }

            // 2. Deduplication
            const isDuplicate = await checkAndMarkDedupe(event.tenant_id, event.event_id);
            if (isDuplicate) {
                duplicated++;
                continue;
            }

            // 3. Publish to RabbitMQ
            const domain = event.event_type.split('.')[0];
            const exchange = `farmiq.${domain}.exchange`;
            const routingKey = event.event_type;

            await publishEvent(exchange, routingKey, event, {
                tenant_id: event.tenant_id,
                trace_id: event.trace_id || traceId,
            });

            accepted++;
        } catch (error: any) {
            logger.error(`Error processing event ${event.event_id}`, error);
            rejected++;
            errors.push({ event_id: event.event_id, error: error.message });
        }
    }

    logger.info(`Batch processed: accepted=${accepted}, duplicated=${duplicated}, rejected=${rejected}`, {
        requestId,
        traceId,
        tenantId: batch.tenant_id,
    });

    return res.status(200).json({
        accepted,
        duplicated,
        rejected,
        errors: errors.length > 0 ? errors : undefined,
    });
};

export const handshake = async (req: Request, res: Response) => {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const requestId = (req as any).requestId || uuidv4();
    res.status(200).json({
        ok: true,
        service: 'cloud-ingestion',
        auth_mode: (process.env.CLOUD_AUTH_MODE || 'none').toLowerCase(),
        request_id: requestId,
        trace_id: traceId,
        time: new Date().toISOString(),
    });
};

export const getDedupeEntries = async (req: Request, res: Response) => {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const tenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : undefined;

    try {
        const [entries, total] = await Promise.all([
            prisma.cloudDedupe.findMany({
            where: tenantId ? { tenantId } : undefined,
            orderBy: { firstSeenAt: 'desc' },
            take: limit,
            }),
            prisma.cloudDedupe.count({
                where: tenantId ? { tenantId } : undefined,
            }),
        ]);

        res.status(200).json({
            count: total,
            entries: entries.map((entry: { tenantId: string; eventId: string; firstSeenAt: Date }) => ({
                tenant_id: entry.tenantId,
                event_id: entry.eventId,
                first_seen_at: entry.firstSeenAt.toISOString(),
            })),
        });
    } catch (error: any) {
        logger.error('Error fetching dedupe entries', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch dedupe entries',
                traceId,
            },
        });
    }
};

function validateEvent(event: IngestionEvent): string | null {
    if (!event.event_id) return 'Missing event_id';
    if (!event.event_type) return 'Missing event_type';
    if (!event.tenant_id) return 'Missing tenant_id';
    if (!event.farm_id) return 'Missing farm_id';
    if (!event.barn_id) return 'Missing barn_id';
    if (!event.device_id && !event.station_id) return 'Missing device_id or station_id';
    if (!event.occurred_at) return 'Missing occurred_at';
    if (!event.trace_id) return 'Missing trace_id';
    if (!event.schema_version) return 'Missing schema_version';
    if (!event.payload) return 'Missing payload';
    return null;
}

async function checkAndMarkDedupe(tenantId: string, eventId: string): Promise<boolean> {
    try {
        await prisma.cloudDedupe.create({
            data: {
                tenantId,
                eventId,
            },
        });
        return false;
    } catch (error: any) {
        if (error.code === 'P2002') {
            // Unique constraint failed
            return true;
        }
        throw error;
    }
}
