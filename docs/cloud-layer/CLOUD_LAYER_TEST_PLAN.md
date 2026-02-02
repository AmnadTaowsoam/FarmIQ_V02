# Cloud-Layer Comprehensive Test Plan

## Document Information
- **Document Version**: 1.0
- **Created**: 2026-02-02
- **Purpose**: Comprehensive test plan for Cloud-Layer services to verify Edge → Cloud → Web data flow

---

## 1. Test Overview

### 1.1 Objective
Verify that all Cloud-Layer services are functioning correctly and can:
1. Receive data from Edge-Layer via HTTP (cloud-ingestion)
2. Process data through all cloud services
3. Store data in databases
4. Forward events via RabbitMQ to appropriate services
5. Serve data to admin-web and dashboard-web via cloud-api-gateway-bff

### 1.2 Scope

#### 1.2.1 Infrastructure Services
| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5140 | Main database |
| vault | 8200 | Secrets management |
| rabbitmq | 5150, 5151 | Message broker |
| datadog | 8126, 8125 | Monitoring |

#### 1.2.2 Core Cloud Services
| Service | Port | Purpose |
|---------|------|---------|
| cloud-identity-access | 5120 | Authentication & Authorization |
| cloud-tenant-registry | 5121 | Tenant management |
| cloud-ingestion | 5122 | Edge data ingestion endpoint |
| cloud-telemetry-service | 5123 | Telemetry data processing |
| cloud-analytics-service | 5124 | Analytics & KPI calculations |
| cloud-api-gateway-bff | 5125 | API Gateway for frontend apps |
| cloud-config-rules-service | 5126 | Configuration rules |
| cloud-audit-log-service | 5127 | Audit logging |
| cloud-notification-service | 5128 | Notifications |
| cloud-reporting-export-service | 5129 | Report generation |
| cloud-feed-service | 5130 | Feed management |
| cloud-barn-records-service | 5131 | Barn records |
| cloud-weighvision-readmodel | 5132 | WeighVision read model |
| cloud-standards-service | 5133 | Standards management |
| cloud-llm-insights-service | 5134 | LLM insights |
| cloud-ml-model-service | 5135 | ML model service |
| cloud-fleet-management | 5144 | Fleet management |
| cloud-billing-service | 5145 | Billing |
| cloud-advanced-analytics | 5146 | Advanced analytics |
| cloud-data-pipeline | 5147 | Data pipeline |
| cloud-bi-metabase | 5148 | BI tool |

#### 1.2.3 MLOps Services
| Service | Port | Purpose |
|---------|------|---------|
| cloud-mlflow-registry | 5136 | ML model registry |
| cloud-feature-store | 5137 | Feature store |
| cloud-drift-detection | 5138 | Drift detection |
| cloud-inference-server | 5139 | Inference server |
| cloud-hybrid-router | 5141 | Hybrid router |

#### 1.2.4 Frontend Applications
| Service | Port | Purpose |
|---------|------|---------|
| dashboard-web | 5142 | Dashboard UI |
| admin-web | 5143 | Admin UI |

### 1.3 Test Data Flow

```
Edge-Layer (Simulated)
    ↓ HTTP POST
cloud-ingestion (Port 5122)
    ↓ Store in Database + Publish to RabbitMQ
├── cloud-telemetry-service (consumes telemetry events)
├── cloud-feed-service (consumes feed events)
├── cloud-barn-records-service (consumes barn events)
├── cloud-weighvision-readmodel (consumes weighvision events)
├── cloud-analytics-service (consumes events for KPI calculation)
└── cloud-llm-insights-service (consumes events for insights)
    ↓ Data Available in Databases
cloud-api-gateway-bff (Port 5125)
    ↓ REST API
├── admin-web (Port 5143)
└── dashboard-web (Port 5142)
```

---

## 2. Test Scenarios

### 2.1 Health Check Tests
Verify all services are running and healthy.

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| postgres | TCP localhost:5140 | Connection successful |
| vault | TCP localhost:8200 | Connection successful |
| rabbitmq | TCP localhost:5150 | Connection successful |
| cloud-identity-access | GET http://localhost:5120/api/health | 200 OK |
| cloud-tenant-registry | GET http://localhost:5121/api/health | 200 OK |
| cloud-ingestion | GET http://localhost:5122/api/health | 200 OK |
| cloud-telemetry-service | GET http://localhost:5123/api/health | 200 OK |
| cloud-analytics-service | GET http://localhost:5124/api/health | 200 OK |
| cloud-api-gateway-bff | GET http://localhost:5125/api/health | 200 OK |
| cloud-config-rules-service | GET http://localhost:5126/api/health | 200 OK |
| cloud-audit-log-service | GET http://localhost:5127/api/health | 200 OK |
| cloud-notification-service | GET http://localhost:5128/api/health | 200 OK |
| cloud-reporting-export-service | GET http://localhost:5129/api/health | 200 OK |
| cloud-feed-service | GET http://localhost:5130/api/health | 200 OK |
| cloud-barn-records-service | GET http://localhost:5131/api/health | 200 OK |
| cloud-weighvision-readmodel | GET http://localhost:5132/api/health | 200 OK |
| cloud-standards-service | GET http://localhost:5133/api/health | 200 OK |
| cloud-llm-insights-service | GET http://localhost:5134/api/health | 200 OK |
| cloud-ml-model-service | GET http://localhost:5135/api/health | 200 OK |
| cloud-mlflow-registry | GET http://localhost:5136/health | 200 OK |
| cloud-feature-store | GET http://localhost:5137/health | 200 OK |
| cloud-drift-detection | GET http://localhost:5138/health | 200 OK |
| cloud-inference-server | GET http://localhost:5139/health | 200 OK |
| cloud-hybrid-router | GET http://localhost:5141/health | 200 OK |
| cloud-fleet-management | GET http://localhost:5144/api/health | 200 OK |
| cloud-billing-service | GET http://localhost:5145/api/health | 200 OK |
| cloud-advanced-analytics | GET http://localhost:5146/api/health | 200 OK |
| cloud-data-pipeline | GET http://localhost:5147/api/health | 200 OK |
| cloud-bi-metabase | GET http://localhost:5148/api/health | 200 OK |

### 2.2 Authentication Tests
Test authentication and authorization flow.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-AUTH-01 | Register new user | POST /api/v1/auth/register | User created, returns token |
| TC-AUTH-02 | Login with valid credentials | POST /api/v1/auth/login | Returns JWT token |
| TC-AUTH-03 | Login with invalid credentials | POST /api/v1/auth/login | Returns 401 Unauthorized |
| TC-AUTH-04 | Verify token | GET /api/v1/auth/verify | Returns user info |
| TC-AUTH-05 | Refresh token | POST /api/v1/auth/refresh | Returns new access token |

### 2.3 Edge Data Ingestion Tests
Test data ingestion from Edge-Layer.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-INGEST-01 | Ingest telemetry data | POST /api/v1/ingestion/telemetry | 201 Created, event stored |
| TC-INGEST-02 | Ingest feed intake data | POST /api/v1/ingestion/feed | 201 Created, event stored |
| TC-INGEST-03 | Ingest barn records | POST /api/v1/ingestion/barn-records | 201 Created, event stored |
| TC-INGEST-04 | Ingest weighvision session | POST /api/v1/ingestion/weighvision | 201 Created, event stored |
| TC-INGEST-05 | Batch ingestion | POST /api/v1/ingestion/batch | 201 Created, all events stored |
| TC-INGEST-06 | Invalid API key | POST /api/v1/ingestion/telemetry (no key) | 401 Unauthorized |
| TC-INGEST-07 | Invalid event schema | POST /api/v1/ingestion/telemetry (bad schema) | 400 Bad Request |

### 2.4 Telemetry Service Tests
Test telemetry data processing and retrieval.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-TELEM-01 | Query latest telemetry | GET /api/v1/telemetry/latest | Returns latest readings |
| TC-TELEM-02 | Query by time range | GET /api/v1/telemetry?from=X&to=Y | Returns filtered readings |
| TC-TELEM-03 | Query by device | GET /api/v1/telemetry/device/{device_id} | Returns device readings |
| TC-TELEM-04 | Query aggregated data | GET /api/v1/telemetry/aggregated | Returns aggregated stats |
| TC-TELEM-05 | Query historical data | GET /api/v1/telemetry/historical | Returns historical data |

### 2.5 Feed Service Tests
Test feed management functionality.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-FEED-01 | Get feed deliveries | GET /api/v1/feed/deliveries | Returns delivery list |
| TC-FEED-02 | Get feed intake | GET /api/v1/feed/intake | Returns intake records |
| TC-FEED-03 | Get silo levels | GET /api/v1/feed/silo/levels | Returns current silo levels |
| TC-FEED-04 | Calculate FCR | GET /api/v1/feed/fcr | Returns Feed Conversion Ratio |
| TC-FEED-05 | Calculate ADG | GET /api/v1/feed/adg | Returns Average Daily Gain |
| TC-FEED-06 | Calculate SGR | GET /api/v1/feed/sgr | Returns Specific Growth Rate |

### 2.6 Barn Records Service Tests
Test barn records functionality.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-BARN-01 | Get barn list | GET /api/v1/barns | Returns barn list |
| TC-BARN-02 | Get barn details | GET /api/v1/barns/{barn_id} | Returns barn details |
| TC-BARN-03 | Get barn batches | GET /api/v1/barns/{barn_id}/batches | Returns batch list |
| TC-BARN-04 | Get batch details | GET /api/v1/batches/{batch_id} | Returns batch details |
| TC-BARN-05 | Get batch performance | GET /api/v1/batches/{batch_id}/performance | Returns performance metrics |

### 2.7 WeighVision Read Model Tests
Test WeighVision data retrieval.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-WV-01 | Get sessions | GET /api/v1/weighvision/sessions | Returns session list |
| TC-WV-02 | Get session details | GET /api/v1/weighvision/sessions/{session_id} | Returns session details |
| TC-WV-03 | Get session frames | GET /api/v1/weighvision/sessions/{session_id}/frames | Returns frame list |
| TC-WV-04 | Get inference results | GET /api/v1/weighvision/sessions/{session_id}/inference | Returns inference results |

### 2.8 Analytics Service Tests
Test analytics and KPI calculations.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-ANALYTICS-01 | Get KPI summary | GET /api/v1/analytics/kpi/summary | Returns KPI summary |
| TC-ANALYTICS-02 | Get daily KPI | GET /api/v1/analytics/kpi/daily | Returns daily KPIs |
| TC-ANALYTICS-03 | Get trend analysis | GET /api/v1/analytics/trends | Returns trend data |
| TC-ANALYTICS-04 | Get cohort analysis | GET /api/v1/analytics/cohort | Returns cohort data |
| TC-ANALYTICS-05 | Get data quality | GET /api/v1/analytics/data-quality | Returns quality metrics |

### 2.9 Notification Service Tests
Test notification functionality.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-NOTIF-01 | Get notifications | GET /api/v1/notifications | Returns notification list |
| TC-NOTIF-02 | Mark as read | PUT /api/v1/notifications/{id}/read | Notification marked as read |
| TC-NOTIF-03 | Get unread count | GET /api/v1/notifications/unread-count | Returns unread count |
| TC-NOTIF-04 | Create notification | POST /api/v1/notifications | Notification created |

### 2.10 BFF (API Gateway) Tests
Test BFF routing to backend services.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-BFF-01 | Get telemetry via BFF | GET /bff/api/v1/telemetry/latest | Returns telemetry data |
| TC-BFF-02 | Get feed data via BFF | GET /bff/api/v1/feed/deliveries | Returns feed data |
| TC-BFF-03 | Get barn data via BFF | GET /bff/api/v1/barns | Returns barn data |
| TC-BFF-04 | Get analytics via BFF | GET /bff/api/v1/analytics/kpi/summary | Returns analytics data |
| TC-BFF-05 | Get weighvision via BFF | GET /bff/api/v1/weighvision/sessions | Returns weighvision data |

### 2.11 Frontend Application Tests
Test frontend applications.

| Test Case | Description | URL | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-FE-01 | Dashboard web loads | http://localhost:5142 | Page loads successfully |
| TC-FE-02 | Admin web loads | http://localhost:5143 | Page loads successfully |
| TC-FE-03 | Dashboard login | POST http://localhost:5142/api/auth/login | Login successful |
| TC-FE-04 | Admin login | POST http://localhost:5143/api/auth/login | Login successful |
| TC-FE-05 | Dashboard API calls | GET http://localhost:5142/api/telemetry/latest | Returns data |
| TC-FE-06 | Admin API calls | GET http://localhost:5143/api/barns | Returns data |

### 2.12 RabbitMQ Integration Tests
Test RabbitMQ event publishing and consumption.

| Test Case | Description | Queue/Exchange | Expected Behavior |
|-----------|-------------|----------------|-------------------|
| TC-RMQ-01 | Telemetry events published | telemetry.events | Events published to queue |
| TC-RMQ-02 | Feed events published | feed.events | Events published to queue |
| TC-RMQ-03 | Barn events published | barn.events | Events published to queue |
| TC-RMQ-04 | WeighVision events published | weighvision.events | Events published to queue |
| TC-RMQ-05 | Dead letter queue | dlq.events | Failed events routed to DLQ |

### 2.13 Database Persistence Tests
Test data persistence in PostgreSQL.

| Test Case | Description | Database | Expected Behavior |
|-----------|-------------|----------|-------------------|
| TC-DB-01 | Telemetry stored | cloud_telemetry | Records found in database |
| TC-DB-02 | Feed data stored | cloud_feed | Records found in database |
| TC-DB-03 | Barn records stored | cloud_barn_records | Records found in database |
| TC-DB-04 | WeighVision stored | cloud_weighvision_readmodel | Records found in database |
| TC-DB-05 | Audit logs stored | cloud_audit_log | Records found in database |

---

## 3. Test Data

### 3.1 Test Tenant/Farm/Barn Configuration
```json
{
  "tenant_id": "t-001",
  "farm_id": "f-001",
  "barn_id": "b-001",
  "batch_id": "batch-test-001",
  "device_id": "d-001",
  "station_id": "st-01",
  "wv_device_id": "wv-001"
}
```

### 3.2 Sample Telemetry Event (from Edge)
```json
{
  "schema_version": "1.0",
  "event_id": "evt-telemetry-cloud-001",
  "trace_id": "trace-cloud-001",
  "tenant_id": "t-001",
  "device_id": "d-001",
  "event_type": "telemetry.reading",
  "ts": "2026-02-02T10:00:00Z",
  "payload": {
    "value": 26.4,
    "unit": "C",
    "sensor_type": "temperature"
  }
}
```

### 3.3 Sample Feed Intake Event
```json
{
  "schema_version": "1.0",
  "event_id": "evt-feed-cloud-001",
  "trace_id": "trace-cloud-001",
  "tenant_id": "t-001",
  "barn_id": "b-001",
  "event_type": "feed.intake",
  "ts": "2026-02-02T10:00:00Z",
  "payload": {
    "feed_type": "starter",
    "quantity_kg": 150.5,
    "silo_id": "silo-001"
  }
}
```

### 3.4 Sample WeighVision Session Event
```json
{
  "schema_version": "1.0",
  "event_id": "evt-wv-cloud-001",
  "trace_id": "trace-cloud-001",
  "tenant_id": "t-001",
  "device_id": "wv-001",
  "event_type": "weighvision.session.created",
  "ts": "2026-02-02T10:00:00Z",
  "payload": {
    "batch_id": "batch-test-001",
    "station_id": "st-01"
  }
}
```

### 3.5 Sample Barn Record Event
```json
{
  "schema_version": "1.0",
  "event_id": "evt-barn-cloud-001",
  "trace_id": "trace-cloud-001",
  "tenant_id": "t-001",
  "barn_id": "b-001",
  "event_type": "barn.record.created",
  "ts": "2026-02-02T10:00:00Z",
  "payload": {
    "batch_id": "batch-test-001",
    "bird_count": 5000,
    "average_weight_g": 1200
  }
}
```

### 3.6 Sample Authentication Credentials
```json
{
  "email": "test@farmiq.com",
  "password": "TestPassword123!",
  "username": "testuser"
}
```

---

## 4. Test Execution

### 4.1 Prerequisites
- Docker services running: `docker compose -f docker-compose.yml up -d`
- Node.js installed (for test runner)
- curl or Postman available (for API testing)

### 4.2 Test Execution Steps

#### Step 1: Verify Infrastructure
Check that all infrastructure services are running.

#### Step 2: Health Checks
Run health check script to verify all services are ready.

#### Step 3: Seed Test Data
Seed databases with test data (tenants, users, devices).

#### Step 4: Run Authentication Tests
Test user registration and login.

#### Step 5: Run Ingestion Tests
Simulate Edge-Layer sending data to cloud-ingestion.

#### Step 6: Run Service Tests
Test each cloud service individually.

#### Step 7: Run BFF Tests
Test API Gateway routing.

#### Step 8: Run Frontend Tests
Test admin-web and dashboard-web.

#### Step 9: Verify Data Persistence
Check databases for stored data.

#### Step 10: Verify RabbitMQ Events
Check RabbitMQ queues for published events.

---

## 5. Test Tools

### 5.1 Health Check Script
A PowerShell/Node.js script to check all service health endpoints.

### 5.2 Ingestion Simulator
A script to simulate Edge-Layer sending data to cloud-ingestion.

### 5.3 API Test Runner
A script to run API tests against all services.

### 5.4 Database Query Scripts
SQL scripts to verify data persistence.

### 5.5 RabbitMQ Inspector
Tool to inspect RabbitMQ queues and exchanges.

---

## 6. Success Criteria

### 6.1 All Services Healthy
- All services return 200 OK on health check

### 6.2 Data Ingestion Working
- cloud-ingestion accepts data from Edge-Layer
- Data is stored in databases
- Events are published to RabbitMQ

### 6.3 Service Processing Working
- All services consume events from RabbitMQ
- All services process data correctly
- All services store processed data

### 6.4 API Gateway Working
- BFF routes requests correctly
- BFF returns data from backend services
- BFF handles authentication

### 6.5 Frontend Applications Working
- admin-web loads and authenticates
- dashboard-web loads and authenticates
- Both applications can fetch data from BFF

### 6.6 Data Flow Complete
- Edge → Cloud → Database flow complete
- Edge → Cloud → RabbitMQ → Service flow complete
- Database → BFF → Frontend flow complete

---

## 7. Expected Test Duration
- Health Checks: 2 minutes
- Authentication Tests: 3 minutes
- Ingestion Tests: 5 minutes
- Service Tests: 10 minutes
- BFF Tests: 5 minutes
- Frontend Tests: 5 minutes
- Data Verification: 5 minutes
- **Total**: ~35 minutes

---

## 8. Test Environment
- **Environment**: Development
- **Base URL**: http://localhost
- **Database**: PostgreSQL on port 5140
- **Message Broker**: RabbitMQ on port 5150
- **Test Tenant**: t-001
- **Test Farm**: f-001
- **Test Barn**: b-001

---

## 9. Known Issues & Limitations
- Some services may require additional configuration
- ML services may require models to be loaded
- LLM services may require API keys
- BI Metabase may require initial setup

---

## 10. Test Report Template
After test execution, a report will be generated containing:
- Test execution summary
- Test case results (pass/fail)
- Screenshots of frontend applications
- Database query results
- RabbitMQ queue status
- Issues found and recommendations
