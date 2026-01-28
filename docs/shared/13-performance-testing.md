# Performance Testing Guide

**Purpose**: Performance testing strategy and guidelines for FarmIQ  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

FarmIQ uses k6, Lighthouse, and custom tools for performance and load testing to ensure enterprise-scale performance.

---

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

---

## Test Suites

### 1. API Performance Benchmarks

**Location**: `tools/performance-tests/k6/`

**Tests**:
- `api-benchmark.js` - Comprehensive API benchmarks
- `api-login-flow.js` - Login flow performance
- `api-dashboard.js` - Dashboard endpoint (1000 concurrent users)
- `api-telemetry.js` - Telemetry query performance

**Usage**:
```bash
k6 run k6/api-benchmark.js
k6 run --env BASE_URL=http://localhost:5125 --env TOKEN=token k6/api-dashboard.js
```

**Targets**:
- p50 < 100ms
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%

---

### 2. IoT Scale Testing

**Location**: `tools/performance-tests/iot-simulator/`

**Capabilities**:
- Simulates 1000+ virtual devices
- Configurable message rate
- MQTT message generation
- Reconnection storm simulation

**Usage**:
```bash
node iot-simulator/index.js --devices=5000 --messages-per-minute=12
```

**Targets**:
- 10,000 devices supported
- 10,000 msg/sec throughput
- Graceful handling of reconnection storms

---

### 3. Database Performance Tests

**Location**: `tools/performance-tests/db-performance/`

**Tests**:
- Telemetry 30-day range query (< 100ms)
- WeighVision sessions listing (< 50ms)
- Feed intake aggregation (< 100ms)
- Barn records count (< 50ms)

**Usage**:
```bash
DATABASE_URL=postgresql://... node db-performance/run-tests.js
```

**Optimization**:
- Index optimization
- Query profiling
- Connection pool sizing

---

### 4. Message Queue Performance

**Location**: `tools/performance-tests/mq-performance/`

**Tests**:
- Publish throughput (target: 50,000 msg/sec)
- Consume throughput (target: 20,000 msg/sec)
- Queue depth handling (1M messages)

**Usage**:
```bash
RABBITMQ_URL=amqp://... node mq-performance/run-tests.js
```

---

### 5. Frontend Performance

**Location**: `tools/performance-tests/frontend-performance/`

**Tests**:
- Core Web Vitals (LCP, FID, CLS)
- Page load performance
- Bundle size analysis

**Usage**:
```bash
BASE_URL=http://localhost:5130 node frontend-performance/run-lighthouse.js
```

**Targets**:
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- Bundle size < 500KB gzipped

---

### 6. Stress Testing

**Location**: `tools/performance-tests/k6/stress-test.js`

**Phases**:
1. 50% baseline (5m)
2. 75% (5m)
3. 100% target capacity (10m)
4. 125% over capacity (5m)
5. 150% stress (5m)
6. Recovery to 50% (10m)

**Usage**:
```bash
k6 run k6/stress-test.js
```

**Goals**:
- Identify breaking point
- Test graceful degradation
- Verify recovery after overload

---

## Performance Monitoring

### Grafana Dashboard

**Location**: `tools/performance-tests/grafana/dashboards/performance-dashboard.json`

**Metrics**:
- API response time percentiles
- Throughput (requests/sec)
- Error rates
- MQTT message latency
- Database query performance
- RabbitMQ queue depth
- CPU/Memory utilization

### Prometheus Metrics

Services export performance metrics:
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Request counter
- `mqtt_message_latency_seconds` - MQTT latency
- `db_query_duration_seconds` - Database query duration
- `rabbitmq_queue_messages` - Queue depth

---

## CI Integration

Performance tests run in CI:
- Daily scheduled runs
- On pull requests (non-blocking)
- Performance regression detection

See `.github/workflows/performance-tests.yml`

---

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

---

## Performance Regression Detection

### CI Gates

Performance tests fail if:
- p95 exceeds baseline by > 20%
- Error rate > 1%
- Response time exceeds critical thresholds

### Alerting

Alerts trigger when:
- p99 > 1000ms for > 5 minutes
- Error rate > 5% for > 1 minute
- Queue depth > 100,000 messages

---

## Best Practices

1. **Run tests regularly**: Daily automated runs
2. **Monitor trends**: Track performance over time
3. **Set realistic targets**: Based on actual usage patterns
4. **Test under load**: Use realistic data volumes
5. **Profile bottlenecks**: Use profiling tools to identify issues
6. **Optimize incrementally**: Fix one bottleneck at a time

---

## Troubleshooting

### High API Latency

1. Check database query performance
2. Review service logs for slow operations
3. Check connection pool sizes
4. Review caching strategies

### High Database Query Time

1. Check indexes
2. Review query plans (EXPLAIN ANALYZE)
3. Optimize aggregations
4. Consider read replicas

### High MQTT Latency

1. Check broker capacity
2. Review message processing logic
3. Check network latency
4. Review deduplication overhead

---

## Next Steps

1. ✅ Performance test suites created
2. ✅ CI integration configured
3. ✅ Monitoring dashboards created
4. ⏳ Establish baseline metrics (run tests)
5. ⏳ Set up alerting rules
6. ⏳ Document optimization procedures
