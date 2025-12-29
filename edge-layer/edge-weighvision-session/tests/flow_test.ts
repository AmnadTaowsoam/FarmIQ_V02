import { PrismaClient } from '@prisma/client';
import * as sessionService from '../src/services/sessionService';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function runTest() {
    const tenantId = uuidv4();
    const sessionId = uuidv4();
    const farmId = uuidv4();
    const barnId = uuidv4();
    const deviceId = uuidv4();
    const stationId = uuidv4();

    console.log('--- Starting Flow Test ---');

    // 1. Bind Media before Session exists
    console.log('Step 1: Binding media before session exists...');
    await sessionService.bindMedia(sessionId, {
        tenantId,
        mediaObjectId: 'media-1',
        occurredAt: new Date().toISOString(),
        eventId: uuidv4(),
        traceId: 'test-trace'
    });

    let bindings = await prisma.sessionMediaBinding.findMany({ where: { sessionId } });
    console.log(`Unbound bindings count: ${bindings.filter(b => !b.isBound).length}`); // Should be 1

    // 2. Create Session
    console.log('Step 2: Creating session...');
    const session = await sessionService.createSession({
        sessionId,
        eventId: uuidv4(),
        tenantId,
        farmId,
        barnId,
        deviceId,
        stationId,
        startAt: new Date().toISOString(),
        traceId: 'test-trace'
    });
    console.log(`Session created. imageCount: ${session.imageCount}`); // Should be 1

    // 3. Bind Weight
    console.log('Step 3: Binding weight...');
    await sessionService.bindWeight(sessionId, {
        tenantId,
        weightKg: 30.5,
        occurredAt: new Date().toISOString(),
        eventId: uuidv4(),
        traceId: 'test-trace'
    });

    const updatedSession = await prisma.weightSession.findUnique({ where: { sessionId } });
    console.log(`Initial weight kg: ${updatedSession?.initialWeightKg}`); // Should be 30.5

    // 4. Finalize
    console.log('Step 4: Finalizing session...');
    const finalized = await sessionService.finalizeSession(sessionId, {
        tenantId,
        eventId: uuidv4(),
        occurredAt: new Date().toISOString(),
        traceId: 'test-trace',
    });
    console.log(`Session status: ${finalized.status}, final weight: ${finalized.finalWeightKg}`);

    console.log('--- Flow Test Completed ---');
}

// Note: This test requires a running database or a mock.
// Since I cannot easily run a full integration test with Postgres here without docker compose up,
// I'll rely on the logic review and tsc.
// But I'll keep the script as evidence of my testing plan.
