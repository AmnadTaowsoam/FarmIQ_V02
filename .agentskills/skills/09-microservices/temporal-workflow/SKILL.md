---
name: Temporal Workflow
description: Building reliable distributed workflows with Temporal.io for long-running processes, retries, and durable execution.
---

# Temporal Workflow

## Overview

Temporal เป็น durable execution platform สำหรับ building reliable distributed applications โดย workflows จะ survive failures, restarts, และ deployments อัตโนมัติ เหมาะสำหรับ long-running processes, saga patterns, และ complex business workflows

## Why This Matters

- **Durable Execution**: Workflows survive crashes and continue from where they left off
- **Built-in Retries**: Automatic retry with configurable policies
- **Visibility**: Full history and state of all workflows
- **Scalability**: Handle millions of concurrent workflows

---

## Core Concepts

### 1. Workflow Definition

```typescript
// workflows.ts
import { proxyActivities, sleep, condition, setHandler } from '@temporalio/workflow';
import type * as activities from './activities';

const { sendEmail, chargePayment, reserveInventory, shipOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1s',
    maximumInterval: '1m',
    backoffCoefficient: 2,
    maximumAttempts: 5,
  },
});

export async function orderWorkflow(order: Order): Promise<OrderResult> {
  // Step 1: Reserve inventory
  const reservation = await reserveInventory(order.items);
  
  // Step 2: Charge payment (will auto-retry on failure)
  const payment = await chargePayment({
    amount: order.total,
    customerId: order.customerId,
  });
  
  // Step 3: Wait for confirmation or timeout
  const confirmed = await condition(
    () => isConfirmed,
    '24 hours' // timeout
  );
  
  if (!confirmed) {
    // Compensate: refund and release inventory
    await refundPayment(payment.id);
    await releaseInventory(reservation.id);
    return { status: 'cancelled', reason: 'timeout' };
  }
  
  // Step 4: Ship order
  const shipment = await shipOrder(order.id);
  
  // Step 5: Send confirmation
  await sendEmail({
    to: order.email,
    template: 'order-shipped',
    data: { trackingNumber: shipment.trackingNumber },
  });
  
  return { status: 'completed', shipment };
}

// Signal handler for external events
let isConfirmed = false;
setHandler('confirmOrder', () => {
  isConfirmed = true;
});
```

### 2. Activities

```typescript
// activities.ts
import { Context } from '@temporalio/activity';

export async function chargePayment(params: ChargeParams): Promise<PaymentResult> {
  const ctx = Context.current();
  
  // Heartbeat for long-running activities
  const heartbeatInterval = setInterval(() => {
    ctx.heartbeat();
  }, 10000);
  
  try {
    const result = await paymentGateway.charge({
      amount: params.amount,
      customerId: params.customerId,
    });
    
    return {
      id: result.transactionId,
      status: 'success',
    };
  } finally {
    clearInterval(heartbeatInterval);
  }
}

export async function reserveInventory(items: OrderItem[]): Promise<Reservation> {
  // Idempotency key from workflow context
  const ctx = Context.current();
  const idempotencyKey = `${ctx.info.workflowExecution.workflowId}-reserve`;
  
  return inventoryService.reserve(items, idempotencyKey);
}

export async function sendEmail(params: EmailParams): Promise<void> {
  await emailService.send(params);
}
```

### 3. Worker Setup

```typescript
// worker.ts
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    namespace: 'production',
    taskQueue: 'orders',
    workflowsPath: require.resolve('./workflows'),
    activities,
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 100,
  });

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 4. Client Usage

```typescript
// Start workflow
import { Client, Connection } from '@temporalio/client';

const connection = await Connection.connect();
const client = new Client({ connection, namespace: 'production' });

// Start workflow
const handle = await client.workflow.start(orderWorkflow, {
  taskQueue: 'orders',
  workflowId: `order-${orderId}`,
  args: [orderData],
});

console.log(`Started workflow ${handle.workflowId}`);

// Send signal
await handle.signal('confirmOrder');

// Query workflow state
const status = await handle.query('getStatus');

// Wait for result
const result = await handle.result();
```

### 5. Saga Pattern with Compensation

```typescript
export async function sagaWorkflow(data: SagaData): Promise<SagaResult> {
  const compensations: (() => Promise<void>)[] = [];
  
  try {
    // Step 1
    const reservation = await reserveInventory(data.items);
    compensations.push(() => releaseInventory(reservation.id));
    
    // Step 2
    const payment = await chargePayment(data.payment);
    compensations.push(() => refundPayment(payment.id));
    
    // Step 3
    const shipment = await createShipment(data.shipping);
    compensations.push(() => cancelShipment(shipment.id));
    
    return { status: 'success' };
    
  } catch (error) {
    // Run compensations in reverse order
    for (const compensate of compensations.reverse()) {
      try {
        await compensate();
      } catch (compError) {
        // Log but continue with other compensations
        console.error('Compensation failed:', compError);
      }
    }
    throw error;
  }
}
```

## Quick Start

1. **Install packages:**
   ```bash
   npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
   ```

2. **Start Temporal server (Docker):**
   ```bash
   docker run -d --name temporal -p 7233:7233 -p 8080:8080 temporalio/auto-setup
   ```

3. **Create workflow, activities, and worker files**

4. **Start worker:**
   ```bash
   npx ts-node worker.ts
   ```

5. **Start workflow from client:**
   ```bash
   npx ts-node start-workflow.ts
   ```

6. **View in UI:**
   Open http://localhost:8080

## Production Checklist

- [ ] Workflow IDs are deterministic and meaningful
- [ ] Activities have appropriate timeouts
- [ ] Retry policies configured per activity type
- [ ] Heartbeats for long-running activities
- [ ] Idempotency keys for external calls
- [ ] Proper error handling and compensation
- [ ] Workers scaled appropriately
- [ ] Namespace per environment
- [ ] Archival configured for completed workflows
- [ ] Alerts on workflow failures

## Anti-patterns

1. **Non-deterministic Workflow Code**: No random(), Date.now(), or external calls in workflow
2. **Skipping Idempotency**: External calls must be idempotent or use idempotency keys
3. **Long-running Activities Without Heartbeat**: Activities > 10s should heartbeat
4. **Workflow Doing Activity Work**: Keep workflows as orchestrators only

## Integration Points

- **Event Sourcing**: Natural fit for event-sourced systems
- **Saga Pattern**: Built-in support for distributed transactions
- **Cron Schedules**: Scheduled workflow executions
- **Observability**: OpenTelemetry integration

## Further Reading

- [Temporal Documentation](https://docs.temporal.io/)
- [Temporal TypeScript SDK](https://typescript.temporal.io/)
- [Temporal Patterns](https://docs.temporal.io/dev-guide/typescript/features)
