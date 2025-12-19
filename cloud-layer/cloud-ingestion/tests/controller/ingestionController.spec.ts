import { ingestBatch } from '../../src/controllers/ingestionController';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { publishEvent } from '../../src/utils/rabbitmq';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma = {
        cloudDedupe: {
            create: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

// Mock RabbitMQ
jest.mock('../../src/utils/rabbitmq', () => ({
    publishEvent: jest.fn(),
}));

describe('Ingestion Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let prisma: any;

    beforeEach(() => {
        prisma = new PrismaClient();
        mockRequest = {
            body: {},
            headers: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    it('should reject invalid batch format', async () => {
        mockRequest.body = { invalid: 'batch' };
        await ingestBatch(mockRequest as Request, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should process a valid batch and skip duplicates', async () => {
        const tenantId = '018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002';
        const eventId1 = 'event-1';
        const eventId2 = 'event-2';

        mockRequest.body = {
            tenant_id: tenantId,
            events: [
                {
                    event_id: eventId1,
                    event_type: 'telemetry.temp',
                    tenant_id: tenantId,
                    farm_id: 'farm-1',
                    barn_id: 'barn-1',
                    device_id: 'dev-1',
                    occurred_at: '2025-01-01T10:00:00Z',
                    trace_id: 'trace-1',
                    schema_version: '1.0',
                    payload: { val: 1 },
                },
                {
                    event_id: eventId2,
                    event_type: 'telemetry.temp',
                    tenant_id: tenantId,
                    farm_id: 'farm-1',
                    barn_id: 'barn-1',
                    device_id: 'dev-1',
                    occurred_at: '2025-01-01T10:00:00Z',
                    trace_id: 'trace-2',
                    schema_version: '1.0',
                    payload: { val: 2 },
                },
            ],
        };

        // Mock first event success, second event duplicate
        prisma.cloudDedupe.create
            .mockResolvedValueOnce({}) // event 1 created
            .mockRejectedValueOnce({ code: 'P2002' }); // event 2 duplicate

        await ingestBatch(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            accepted: 1,
            duplicated: 1,
            rejected: 0,
        }));
        expect(publishEvent).toHaveBeenCalledTimes(1);
    });

    it('should reject events with missing fields', async () => {
        const tenantId = 'tenant-1';
        mockRequest.body = {
            tenant_id: tenantId,
            events: [
                {
                    event_id: 'event-1',
                    // missing event_type
                    tenant_id: tenantId,
                },
            ],
        };

        await ingestBatch(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            accepted: 0,
            duplicated: 0,
            rejected: 1,
            errors: expect.arrayContaining([
                expect.objectContaining({ error: 'Missing event_type' })
            ]),
        }));
    });
});
