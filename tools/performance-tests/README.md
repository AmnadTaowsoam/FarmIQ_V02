# Performance & Load Testing Tools

This directory contains performance and load testing tools for FarmIQ.

## Setup

```bash
cd tools/performance-tests
npm install
```

## Prerequisites

- **k6**: Install from https://k6.io/docs/getting-started/installation/
- **Node.js**: v20+
- **Docker**: For running services locally

## Test Suites

### 1. API Performance Benchmarks

Tests critical API endpoints for performance.

```bash
# Run all API benchmarks
npm run test:api

# Run specific tests
npm run test:api:login
npm run test:api:dashboard
npm run test:api:telemetry

# With custom configuration
k6 run --env BASE_URL=http://localhost:5125 --env TOKEN=your-token k6/api-benchmark.js
```

**Targets**:
- p50 < 100ms
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%

### 2. IoT Scale Testing

Simulates 1000+ virtual devices sending MQTT messages.

```bash
cd iot-simulator
npm install
npm start

# Custom configuration
node index.js --devices=5000 --messages-per-minute=12

# Reconnection storm scenario
node index.js --devices=1000 --scenario=reconnection-storm
```

**Targets**:
- 10,000 devices supported
- 10,000 msg/sec throughput
- Graceful handling of reconnection storms

**Scenarios**:
- Normal Operation: 1000 devices, 12 msg/min/device
- Peak Load: 5000 devices, 12 msg/min/device
- Reconnection Storm: Simultaneous reconnection of all devices
- Scale Test: 10,000 devices (target capacity)

### 3. Database Performance Tests

Profiles database queries and measures performance.

```bash
npm run test:db

# With custom database URL
DATABASE_URL=postgresql://user:pass@host:port/db node db-performance/run-tests.js
```

**Targets**:
- All critical queries < 100ms
- Indexes optimized
- Connection pools sized correctly

**Tests**:
- Telemetry 30-day range query (< 100ms)
- WeighVision sessions listing (< 50ms)
- Feed intake aggregation (< 100ms)
- Barn records count (< 50ms)

### 4. Message Queue Performance

Tests RabbitMQ publish/consume throughput.

```bash
npm run test:mq

# With custom RabbitMQ URL
RABBITMQ_URL=amqp://user:pass@host:port node mq-performance/run-tests.js
```

**Targets**:
- 50,000 msg/sec publish
- 20,000 msg/sec consume
- No message loss under load

**Tests**:
- Publish throughput
- Consume throughput
- Queue depth handling (1M messages)

### 5. Frontend Performance

Uses Lighthouse to measure Core Web Vitals.

```bash
npm run test:frontend

# With custom base URL
BASE_URL=http://localhost:5130 node frontend-performance/run-lighthouse.js
```

**Targets**:
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- Bundle size < 500KB gzipped

**Pages Tested**:
- Dashboard
- Telemetry
- WeighVision
- Feed

### 6. Stress Testing

Gradually increases load to find breaking point.

```bash
npm run test:stress

# With custom configuration
k6 run --env BASE_URL=http://localhost:5125 --env TOKEN=your-token k6/stress-test.js
```

**Phases**:
1. 50% baseline (5m)
2. 75% (5m)
3. 100% target capacity (10m)
4. 125% over capacity (5m)
5. 150% stress (5m)
6. Recovery to 50% (10m)

## Performance Requirements

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time (p50) | < 100ms | < 200ms |
| API Response Time (p99) | < 500ms | < 1000ms |
| MQTT Message Latency | < 50ms | < 100ms |
| Edge→Cloud Sync Latency | < 5s | < 30s |
| Dashboard Page Load | < 2s | < 5s |
| Concurrent Users | 1000 | 500 |
| IoT Devices | 10,000 | 5,000 |
| Messages/Second | 10,000 | 5,000 |

## CI Integration

Add to CI pipeline:

```yaml
- name: Performance Tests
  run: |
    cd tools/performance-tests
    npm install
    npm run test:api
    npm run test:db
```

See `.github/workflows/performance-tests.yml` for full CI configuration.

## Monitoring

Performance metrics are exported to Prometheus and visualized in Grafana.

### Grafana Dashboard

Import `grafana/dashboards/performance-dashboard.json` to Grafana.

**Panels**:
- API response time percentiles (p50, p95, p99)
- Throughput (requests/sec)
- Error rates
- MQTT message latency
- Database query performance
- RabbitMQ queue depth
- CPU/Memory utilization

### Prometheus Alerts

Configure alerts using `prometheus/alerts.yml`.

**Alerts**:
- High API response time (p99 > 1000ms)
- High API error rate (> 5%)
- High MQTT latency (> 100ms)
- High database query time (> 200ms)
- High RabbitMQ queue depth (> 100,000)
- High CPU/Memory utilization

## Results

Test results are saved to:
- `frontend-performance/lighthouse-results.json` - Lighthouse results
- k6 results can be exported to InfluxDB or other backends

## Troubleshooting

### k6 not found
Install k6: https://k6.io/docs/getting-started/installation/

### Database connection errors
Ensure PostgreSQL is running and DATABASE_URL is correct.

### RabbitMQ connection errors
Ensure RabbitMQ is running and RABBITMQ_URL is correct.

### MQTT broker connection errors
Ensure MQTT broker is running and accessible.

### High latency
1. Check service logs for slow operations
2. Review database query performance
3. Check connection pool sizes
4. Review caching strategies

## Baseline Metrics

### API Endpoints

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `/api/v1/auth/login` | 80ms | 150ms | 300ms |
| `/api/v1/dashboard/overview` | 90ms | 400ms | 800ms |
| `/api/v1/telemetry/readings` | 70ms | 180ms | 350ms |
| `/api/v1/weighvision/sessions` | 60ms | 150ms | 300ms |

### Database Queries

| Query | Target | Baseline |
|-------|--------|----------|
| Telemetry 30-day range | < 100ms | 85ms |
| Sessions listing | < 50ms | 35ms |
| Feed aggregation | < 100ms | 75ms |

## Next Steps

1. Run baseline tests to establish metrics
2. Set up Prometheus metrics export
3. Configure Grafana alerts
4. Add performance regression detection in CI
5. Create performance test reports
6. Document optimization procedures
