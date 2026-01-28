# Phase 10: Integration Testing (IoT → Edge → Cloud)

**Owner**: Antigravity
**Priority**: P0 - Critical for Enterprise
**Status**: Completed
**Created**: 2025-01-26
**Completed**: 2026-01-26

---

## Objective

สร้างระบบ Integration Testing ที่ทดสอบการไหลของข้อมูลครบทั้ง 3 Layers (IoT → Edge → Cloud) เพื่อยืนยันว่าระบบทำงานได้จริง ไม่ใช่ hardcode

---

## Architecture Under Test

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           TEST FLOW                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [IoT Simulator]                                                         │
│       │                                                                  │
│       │ MQTT (telemetry, events, weighvision)                           │
│       ▼                                                                  │
│  [Edge Layer]                                                            │
│       ├── edge-mqtt-broker ──► edge-ingress-gateway                     │
│       │                              │                                   │
│       │                    ┌─────────┼─────────┐                        │
│       │                    ▼         ▼         ▼                        │
│       │              telemetry  weighvision  media                      │
│       │                    │         │         │                        │
│       │                    └─────────┼─────────┘                        │
│       │                              ▼                                   │
│       │                    edge-sync-forwarder                          │
│       │                              │                                   │
│       │                    ┌─────────┴─────────┐                        │
│       ▼                    ▼                   ▼                        │
│  [Cloud Layer]      cloud-ingestion ──► RabbitMQ                        │
│       │                                    │                            │
│       │              ┌─────────────────────┼─────────────────────┐      │
│       │              ▼                     ▼                     ▼      │
│       │        telemetry-svc      analytics-svc        weighvision-rm   │
│       │              │                     │                     │      │
│       │              └─────────────────────┼─────────────────────┘      │
│       │                                    ▼                            │
│       │                           cloud-api-gateway-bff                 │
│       │                                    │                            │
│       ▼                                    ▼                            │
│  [Dashboard]                        dashboard-web                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Deliverables

### 10.1 IoT Layer Integration Tests

**Description**: ทดสอบ IoT Simulator ส่งข้อมูลผ่าน MQTT ไปยัง Edge

**Tasks**:
- [x] สร้าง IoT Simulator สำหรับ test (Python/Node)
- [x] ทดสอบ MQTT publish: `iot/telemetry/{tenant}/{farm}/{barn}/{device}/{metric}`
- [x] ทดสอบ MQTT publish: `iot/event/{tenant}/{farm}/{barn}/{device}/{eventType}`
- [x] ทดสอบ MQTT publish: `iot/weighvision/{tenant}/{farm}/{barn}/{station}/session/{session}/{eventType}`
- [x] ทดสอบ Device status LWT: `iot/status/{tenant}/{farm}/{barn}/{device}`
- [x] Verify message arrives at edge-ingress-gateway
- [x] ทดสอบ Invalid payload rejection

**Test Cases**:
```yaml
TC-IOT-001: Valid telemetry message → Edge receives and routes
TC-IOT-002: Invalid schema → Edge rejects with error
TC-IOT-003: Duplicate event_id → Edge dedupes
TC-IOT-004: Device not in allowlist → Edge rejects
TC-IOT-005: LWT message on disconnect → Status updated
```

**Required Skills**:
```
08-messaging-queue/mqtt-integration
16-testing/integration-testing
16-testing/event-driven-testing
36-iot-integration/iot-protocols
67-codegen-scaffolding-automation/bruno-smoke-test-generator
```

**Acceptance Criteria**:
- IoT Simulator สร้างเสร็จ
- MQTT topics ทั้งหมดทดสอบผ่าน
- Invalid payloads ถูก reject
- Evidence: Test report + logs

---

### 10.2 Edge Layer Integration Tests

**Description**: ทดสอบ Edge services รับ-ส่งข้อมูลถูกต้อง

**Tasks**:
- [x] ทดสอบ edge-ingress-gateway → edge-telemetry-timeseries
- [x] ทดสอบ edge-ingress-gateway → edge-weighvision-session
- [x] ทดสอบ edge-media-store presigned upload flow
- [x] ทดสอบ edge-vision-inference job creation
- [x] ทดสอบ edge-sync-forwarder → cloud-ingestion
- [x] ทดสอบ outbox pattern: event written → synced to cloud
- [x] ทดสอบ DLQ: failed sync → moved to DLQ → redrive

**Test Cases**:
```yaml
TC-EDGE-001: Telemetry message → stored in timeseries DB → outbox written
TC-EDGE-002: WeighVision event → session created → outbox written
TC-EDGE-003: Media upload → file stored → inference triggered
TC-EDGE-004: Inference complete → result bound to session
TC-EDGE-005: Sync forwarder → batch sent to cloud → ACK received → outbox marked
TC-EDGE-006: Cloud unavailable → retry with backoff → DLQ after max retries
TC-EDGE-007: DLQ redrive → events reprocessed successfully
```

**Required Skills**:
```
16-testing/integration-testing
16-testing/event-driven-testing
09-microservices/event-driven
40-system-resilience/retry-timeout-strategies
16-testing/test-data-factory
```

**Acceptance Criteria**:
- ทุก service ในEdge layer ทดสอบผ่าน
- Outbox → Cloud sync ทำงานถูกต้อง
- DLQ mechanism ทดสอบผ่าน
- Evidence: Test report + DB snapshots

---

### 10.3 Edge → Cloud Integration Tests

**Description**: ทดสอบการส่งข้อมูลจาก Edge ไป Cloud ผ่าน sync-forwarder

**Tasks**:
- [x] ทดสอบ POST /api/v1/edge/batch (cloud-ingestion)
- [x] Verify events published to RabbitMQ
- [x] Verify consumers receive events:
  - cloud-telemetry-service
  - cloud-analytics-service
  - cloud-weighvision-readmodel
- [x] ทดสอบ idempotency: duplicate event_id ignored
- [x] ทดสอบ header propagation: x-request-id, x-trace-id
- [x] ทดสอบ backpressure: slow consumer handling

**Test Cases**:
```yaml
TC-E2C-001: Batch of 100 events → all published to RabbitMQ
TC-E2C-002: Duplicate event_id → deduplicated at cloud-ingestion
TC-E2C-003: Telemetry event → cloud-telemetry-service receives and stores
TC-E2C-004: WeighVision event → cloud-weighvision-readmodel updates
TC-E2C-005: Analytics event → cloud-analytics-service computes KPIs
TC-E2C-006: Trace ID propagated end-to-end
TC-E2C-007: Consumer slow → queue backlog monitored → no data loss
```

**Required Skills**:
```
08-messaging-queue/rabbitmq-patterns
16-testing/integration-testing
09-microservices/event-driven
14-monitoring-observability/distributed-tracing
40-system-resilience/bulkhead-patterns
```

**Acceptance Criteria**:
- Edge → Cloud sync ทำงานถูกต้อง
- RabbitMQ routing ถูกต้อง
- Consumers process events correctly
- Evidence: RabbitMQ stats + DB records

---

### 10.4 Cloud Layer Integration Tests

**Description**: ทดสอบ Cloud services internal communication

**Tasks**:
- [x] ทดสอบ cloud-api-gateway-bff → cloud-identity-access (auth)
- [x] ทดสอบ cloud-api-gateway-bff → cloud-tenant-registry (registry)
- [x] ทดสอบ cloud-api-gateway-bff → cloud-telemetry-service (telemetry)
- [x] ทดสอบ cloud-api-gateway-bff → cloud-analytics-service (analytics/insights)
- [x] ทดสอบ cloud-api-gateway-bff → cloud-feed-service (feeding)
- [x] ทดสอบ cloud-api-gateway-bff → cloud-barn-records-service (barn records)
- [x] ทดสอบ cloud-api-gateway-bff → cloud-reporting-export-service (reports)
- [x] ทดสอบ cloud-analytics-service → cloud-llm-insights-service (AI insights)
- [x] ทดสอบ multi-tenant data isolation

**Test Cases**:
```yaml
TC-CLOUD-001: Login → JWT issued → subsequent requests authenticated
TC-CLOUD-002: BFF calls registry → tenant/farm/barn data returned
TC-CLOUD-003: BFF calls telemetry → readings returned with correct tenant scope
TC-CLOUD-004: BFF calls analytics → KPIs computed from actual data
TC-CLOUD-005: BFF calls LLM insights → AI analysis generated
TC-CLOUD-006: Tenant A cannot see Tenant B data
TC-CLOUD-007: Error from downstream → BFF returns proper error envelope
TC-CLOUD-008: Downstream timeout → circuit breaker opens → fallback response
```

**Required Skills**:
```
16-testing/integration-testing
09-microservices/circuit-breaker
62-scale-operations/multi-tenancy-saas
03-backend-api/error-handling
14-monitoring-observability/distributed-tracing
```

**Acceptance Criteria**:
- BFF → all downstream services ทดสอบผ่าน
- Multi-tenant isolation verified
- Error handling tested
- Evidence: API test report + traces

---

### 10.5 End-to-End Flow Tests

**Description**: ทดสอบ flow ตั้งแต่ IoT → Dashboard UI

**Tasks**:
- [x] E2E Flow 1: Telemetry → Dashboard Overview
- [x] E2E Flow 2: WeighVision Session → Dashboard WeighVision page
- [x] E2E Flow 3: Feed Intake → Dashboard Feeding KPI
- [x] E2E Flow 4: Barn Record → Dashboard Barn Records
- [x] E2E Flow 5: AI Insight Request → Dashboard AI page
- [x] Verify data consistency across all layers
- [x] Verify timestamps preserved correctly
- [x] Verify tenant_id propagated correctly

**Test Cases**:
```yaml
TC-E2E-001: IoT sends temperature=25.5 → Dashboard shows 25.5 within 5 seconds
TC-E2E-002: WeighVision session created → Dashboard shows new session
TC-E2E-003: Feed intake recorded → Dashboard KPI updated
TC-E2E-004: Mortality event → Barn records page shows event
TC-E2E-005: User requests insight → AI generates response → Dashboard displays
TC-E2E-006: Data flows through all 3 layers with consistent tenant_id
```

**Required Skills**:
```
16-testing/e2e-playwright
16-testing/integration-testing
16-testing/event-driven-testing
14-monitoring-observability/distributed-tracing
34-real-time-features/real-time-dashboard
```

**Acceptance Criteria**:
- ทุก E2E flow ทดสอบผ่าน
- Data consistency verified
- Latency < 5 seconds for critical paths
- Evidence: Playwright recordings + screenshots

---

### 10.6 Integration Test Infrastructure

**Description**: สร้าง infrastructure สำหรับ run integration tests

**Tasks**:
- [x] สร้าง Docker Compose สำหรับ integration test environment
- [x] สร้าง CI pipeline สำหรับ integration tests
- [x] สร้าง test data cleanup scripts
- [x] สร้าง test reporting dashboard
- [x] Implement test parallelization

**Required Skills**:
```
15-devops-infrastructure/docker-compose
15-devops-infrastructure/ci-cd-github-actions
16-testing/test-data-factory
67-codegen-scaffolding-automation/ci-pipeline-generator
45-developer-experience/hot-reload-fast-feedback
```

**Acceptance Criteria**:
- Integration test suite runs in CI
- Test environment isolated
- Test data cleaned up after each run
- Results visible in dashboard

---

## Test Data Requirements

ต้องมี Mock/Seed data ในทุก database (ดู Phase 11)

---

## Dependencies

- Phase 11 (Mock Data) ต้องเสร็จก่อน
- ทุก services ต้อง healthy

## Timeline Estimate

- **10.1 IoT Tests**: 1-2 sprints
- **10.2 Edge Tests**: 2 sprints
- **10.3 Edge→Cloud Tests**: 2 sprints
- **10.4 Cloud Tests**: 2 sprints
- **10.5 E2E Tests**: 2-3 sprints
- **10.6 Infrastructure**: 1-2 sprints

**Total**: 10-13 sprints

---

## Evidence Requirements

- [x] IoT Simulator source code
- [x] Test case documentation
- [x] CI pipeline configuration
- [x] Test execution reports
- [x] Distributed trace examples
- [x] Playwright recordings for E2E
