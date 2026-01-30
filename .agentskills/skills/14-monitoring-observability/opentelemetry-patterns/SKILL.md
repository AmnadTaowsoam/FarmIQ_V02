---
name: OpenTelemetry Patterns
description: Implementing vendor-neutral observability with OpenTelemetry for traces, metrics, and logs across distributed systems.
---

# OpenTelemetry Patterns

## Overview

OpenTelemetry (OTel) เป็น vendor-neutral observability framework สำหรับ collecting และ exporting telemetry data (traces, metrics, logs) เป็น CNCF project ที่กลายเป็น industry standard สำหรับ distributed tracing และ observability

## Why This Matters

- **Vendor Neutral**: Switch backends (Jaeger, Zipkin, Datadog) without code changes
- **Unified Standard**: Single SDK for traces, metrics, and logs
- **Auto-instrumentation**: Automatic tracing for popular frameworks
- **Context Propagation**: Trace requests across service boundaries

---

## Core Concepts

### 1. SDK Setup (Node.js)

```typescript
// tracing.ts - Load FIRST before any other imports
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics',
    }),
    exportIntervalMillis: 60000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

### 2. Manual Instrumentation

```typescript
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function processOrder(orderId: string) {
  // Create a span
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      // Add attributes
      span.setAttribute('order.id', orderId);
      span.setAttribute('order.type', 'standard');
      
      // Add event
      span.addEvent('order.validation.started');
      
      const result = await validateOrder(orderId);
      
      span.addEvent('order.validation.completed', {
        'validation.result': result.valid,
      });
      
      if (!result.valid) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Order validation failed',
        });
        throw new Error('Invalid order');
      }
      
      // Nested span
      await tracer.startActiveSpan('chargePayment', async (paymentSpan) => {
        paymentSpan.setAttribute('payment.method', 'card');
        await chargeCustomer(orderId);
        paymentSpan.end();
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 3. Custom Metrics

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-service');

// Counter - for counting things
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total HTTP requests',
});

// Histogram - for measuring distributions
const latencyHistogram = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request latency in milliseconds',
  unit: 'ms',
});

// Gauge - for current values
const activeConnections = meter.createObservableGauge('active_connections', {
  description: 'Number of active connections',
});

activeConnections.addCallback((result) => {
  result.observe(connectionPool.activeCount, { pool: 'main' });
});

// Usage
function handleRequest(req, res) {
  const startTime = Date.now();
  
  requestCounter.add(1, {
    method: req.method,
    route: req.route.path,
  });
  
  res.on('finish', () => {
    latencyHistogram.record(Date.now() - startTime, {
      method: req.method,
      route: req.route.path,
      status_code: res.statusCode,
    });
  });
}
```

### 4. Context Propagation

```typescript
import { context, propagation, trace } from '@opentelemetry/api';

// Extract context from incoming request
function extractContext(req) {
  return propagation.extract(context.active(), req.headers);
}

// Inject context to outgoing request
async function callExternalService(data) {
  const headers = {};
  propagation.inject(context.active(), headers);
  
  return fetch('https://external-service.com/api', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Express middleware
app.use((req, res, next) => {
  const ctx = extractContext(req);
  context.with(ctx, () => next());
});
```

### 5. Baggage (Cross-Service Data)

```typescript
import { propagation, context, baggage } from '@opentelemetry/api';

// Set baggage
function setRequestBaggage(tenantId: string, userId: string) {
  const bag = baggage.setEntry(
    baggage.setEntry(baggage.active(), 'tenant.id', { value: tenantId }),
    'user.id',
    { value: userId }
  );
  return baggage.setActiveBaggage(bag);
}

// Read baggage
function getTenantId(): string | undefined {
  return baggage.getEntry(baggage.active(), 'tenant.id')?.value;
}
```

## Quick Start

1. **Install packages:**
   ```bash
   npm install @opentelemetry/sdk-node \
     @opentelemetry/auto-instrumentations-node \
     @opentelemetry/exporter-trace-otlp-http \
     @opentelemetry/exporter-metrics-otlp-http
   ```

2. **Create tracing.ts** (see SDK Setup above)

3. **Import FIRST in your app:**
   ```typescript
   import './tracing'; // Must be first!
   import express from 'express';
   ```

4. **Set environment variables:**
   ```bash
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   OTEL_SERVICE_NAME=my-service
   ```

5. **Run collector (Docker):**
   ```bash
   docker run -p 4317:4317 -p 4318:4318 otel/opentelemetry-collector
   ```

## Production Checklist

- [ ] Service name and version in resource attributes
- [ ] Environment (dev/staging/prod) tagged
- [ ] Sampling strategy configured (not 100% in prod)
- [ ] Sensitive data redacted from spans
- [ ] Error spans properly recorded
- [ ] Collector deployed and configured
- [ ] Backend (Jaeger/Tempo/etc.) configured
- [ ] Dashboards created for key metrics
- [ ] Alerts configured for SLOs

## Anti-patterns

1. **100% Sampling in Production**: Use head-based or tail-based sampling
2. **Too Many Attributes**: Keep span attributes focused and useful
3. **Sensitive Data in Spans**: Never log PII or credentials
4. **Missing Error Recording**: Always record exceptions on error spans

## Integration Points

- **Backends**: Jaeger, Zipkin, Tempo, Datadog, New Relic, Honeycomb
- **Collector**: OpenTelemetry Collector for processing/routing
- **Frameworks**: Express, Fastify, NestJS, Next.js (auto-instrumented)
- **Databases**: PostgreSQL, MySQL, MongoDB (auto-instrumented)
- **Cloud**: AWS X-Ray, GCP Cloud Trace, Azure Monitor

## Further Reading

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OTel Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)
- [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
