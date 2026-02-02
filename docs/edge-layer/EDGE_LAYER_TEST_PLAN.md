# Edge-Layer Comprehensive Test Plan

## Document Information
- **Document Version**: 1.0
- **Created**: 2026-02-02
- **Purpose**: Comprehensive test plan for Edge-Layer services to verify IoT → Edge → Cloud data flow

---

## 1. Test Overview

### 1.1 Objective
Verify that all Edge-Layer services are functioning correctly and can:
1. Receive data from IoT layer via MQTT
2. Process data through all edge services
3. Forward data to Cloud-Layer

### 1.2 Scope
- **Services to Test**:
  - edge-mqtt-broker (Port 5100)
  - edge-ingress-gateway (Port 5103)
  - edge-telemetry-timeseries (Port 5104)
  - edge-weighvision-session (Port 5105)
  - edge-media-store (Port 5106)
  - edge-vision-inference (Port 5107)
  - edge-sync-forwarder (Port 5108)
  - edge-policy-sync (Port 5109)
  - edge-observability-agent (Port 5111)
  - edge-feed-intake (Port 5112)
  - edge-ops-web (Port 5113)
  - edge-retention-janitor (Port 5114)
  - edge-cloud-ingestion-mock (Port 5102) - Mock Cloud-Layer

### 1.3 Test Data Flow

```
IoT Layer (Simulator)
    ↓ MQTT
edge-mqtt-broker
    ↓ MQTT Subscriptions
edge-ingress-gateway
    ↓ HTTP
├── edge-telemetry-timeseries
├── edge-weighvision-session
├── edge-media-store
├── edge-vision-inference
└── edge-feed-intake
    ↓ Outbox Pattern
edge-sync-forwarder
    ↓ HTTP
edge-cloud-ingestion-mock (Cloud-Layer Mock)
```

---

## 2. Test Scenarios

### 2.1 Health Check Tests
Verify all services are running and healthy.

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| edge-ingress-gateway | GET http://localhost:5103/api/health | 200 OK |
| edge-telemetry-timeseries | GET http://localhost:5104/api/health | 200 OK |
| edge-weighvision-session | GET http://localhost:5105/api/health | 200 OK |
| edge-media-store | GET http://localhost:5106/api/health | 200 OK |
| edge-vision-inference | GET http://localhost:5107/api/health | 200 OK |
| edge-sync-forwarder | GET http://localhost:5108/api/health | 200 OK |
| edge-policy-sync | GET http://localhost:5109/api/health | 200 OK |
| edge-observability-agent | GET http://localhost:5111/api/health | 200 OK |
| edge-feed-intake | GET http://localhost:5112/api/health | 200 OK |
| edge-retention-janitor | GET http://localhost:5114/api/health | 200 OK |
| edge-cloud-ingestion-mock | GET http://localhost:5102/api/health | 200 OK |

### 2.2 MQTT Telemetry Tests
Test telemetry data flow from IoT → Edge.

| Test Case | Description | Topic | Expected Behavior |
|-----------|-------------|-------|-------------------|
| TC-TELEM-01 | Single temperature reading | iot/telemetry/{tenant}/{farm}/{barn}/{device}/temperature | Ingress receives, forwards to telemetry service |
| TC-TELEM-02 | Multiple telemetry readings | Same topic, multiple messages | Deduplication works correctly |
| TC-TELEM-03 | Invalid device ID | iot/telemetry/{tenant}/{farm}/{barn}/{invalid-device}/temperature | Rejected by ingress allowlist |

### 2.3 WeighVision Session Tests
Test WeighVision data flow.

| Test Case | Description | Topic | Expected Behavior |
|-----------|-------------|-------|-------------------|
| TC-WV-01 | Create session | iot/weighvision/{tenant}/{farm}/{barn}/{station}/session/{session_id}/weighvision.session.created | Session created in database |
| TC-WV-02 | Session update | iot/weighvision/{tenant}/{farm}/{barn}/{station}/session/{session_id}/weighvision.session.updated | Session updated in database |
| TC-WV-03 | Frame uploaded | HTTP POST to media store | Image stored, inference triggered |

### 2.4 Media Store & Vision Inference Tests
Test media handling and AI inference.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-MEDIA-01 | Presign upload | POST /api/v1/media/images/presign | Returns upload URL |
| TC-MEDIA-02 | Upload image | PUT to presigned URL | Image stored in MinIO |
| TC-MEDIA-03 | Complete upload | POST /api/v1/media/images/complete | Media record created |
| TC-INFER-01 | Create inference job | POST /api/v1/inference/jobs | Job created, inference executed |
| TC-INFER-02 | Get inference result | GET /api/v1/inference/jobs/{job_id} | Returns inference results |

### 2.5 Feed Intake Tests
Test feed management data flow.

| Test Case | Description | Topic | Expected Behavior |
|-----------|-------------|-------|-------------------|
| TC-FEED-01 | Feed delivery | iot/feed/{tenant}/{farm}/{barn}/delivery | Feed intake processes, stores in database |
| TC-FEED-02 | Silo delta | iot/feed/{tenant}/{farm}/{barn}/silo/delta | Silo level updated |

### 2.6 Sync Forwarder Tests
Test data forwarding to Cloud-Layer.

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| TC-SYNC-01 | Check sync state | GET /api/v1/sync/state | Returns pending/processed counts |
| TC-SYNC-02 | Verify cloud ingestion | Cloud mock receives batch | Data forwarded successfully |
| TC-SYNC-03 | Retry mechanism | Simulate failure | Retry with exponential backoff |

### 2.7 Observability Tests
Test observability and monitoring.

| Test Case | Description | API | Expected Behavior |
|-----------|-------------|-----|-------------------|
| TC-OBS-01 | Get ingress stats | GET /api/v1/ingress/stats | Returns message counts |
| TC-OBS-02 | Get service health | GET /api/v1/observability/health | Returns all service statuses |

---

## 3. Test Data

### 3.1 Test Tenant/Farm/Barn Configuration
```json
{
  "tenant_id": "t-001",
  "farm_id": "f-001",
  "barn_id": "b-001",
  "device_id": "d-001",
  "station_id": "st-01",
  "wv_device_id": "wv-001"
}
```

### 3.2 Sample Telemetry Event
```json
{
  "schema_version": "1.0",
  "event_id": "evt-telemetry-001",
  "trace_id": "trace-001",
  "tenant_id": "t-001",
  "device_id": "d-001",
  "event_type": "telemetry.reading",
  "ts": "2026-02-02T06:00:00Z",
  "payload": {
    "value": 26.4,
    "unit": "C"
  }
}
```

### 3.3 Sample WeighVision Session Event
```json
{
  "schema_version": "1.0",
  "event_id": "evt-wv-001",
  "trace_id": "trace-001",
  "tenant_id": "t-001",
  "device_id": "wv-001",
  "event_type": "weighvision.session.created",
  "ts": "2026-02-02T06:00:00Z",
  "payload": {
    "batch_id": "batch-test-001"
  }
}
```

---

## 4. Test Execution

### 4.1 Prerequisites
- Docker services running: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
- Node.js installed (for simulator)
- MQTT client available (mosquitto_pub or Node.js mqtt package)

### 4.2 Test Execution Steps

#### Step 1: Health Checks
Run health check script to verify all services are ready.

#### Step 2: Seed Database Allowlists
Add test devices and stations to allowlists.

#### Step 3: Run MQTT Telemetry Tests
Publish telemetry messages via MQTT.

#### Step 4: Run WeighVision Tests
Create sessions and upload frames.

#### Step 5: Run Feed Intake Tests
Publish feed-related events.

#### Step 6: Verify Sync Forwarder
Check data forwarded to cloud mock.

#### Step 7: Collect Results
Generate test report.

---

## 5. Expected Results

### 5.1 Success Criteria
- ✅ All health checks pass
- ✅ Telemetry data stored in edge-telemetry-timeseries
- ✅ WeighVision sessions stored in edge-weighvision-session
- ✅ Media stored in MinIO via edge-media-store
- ✅ Inference results generated by edge-vision-inference
- ✅ Feed data processed by edge-feed-intake
- ✅ Data forwarded to edge-cloud-ingestion-mock
- ✅ Observability data collected

### 5.2 Failure Criteria
- ❌ Any service health check fails
- ❌ MQTT connection fails
- ❌ Data not stored in databases
- ❌ Sync forwarder not forwarding data
- ❌ Cloud mock not receiving data

---

## 6. Test Automation

### 6.1 Automated Test Scripts
- `edge-layer-test-runner.ps1` - PowerShell test runner for Windows
- `edge-layer-test-runner.sh` - Bash test runner for Linux/Mac
- `iot-simulator.js` - Node.js IoT simulator

### 6.2 Test Execution Commands

**Windows (PowerShell):**
```powershell
cd edge-layer
.\scripts\edge-layer-test-runner.ps1
```

**Linux/Mac (Bash):**
```bash
cd edge-layer
./scripts/edge-layer-test-runner.sh
```

---

## 7. Test Report Template

### 7.1 Test Execution Summary
| Metric | Value |
|--------|-------|
| Test Start Time | |
| Test End Time | |
| Total Duration | |
| Services Tested | 12 |
| Tests Passed | |
| Tests Failed | |
| Success Rate | |

### 7.2 Service Health Summary
| Service | Status | Response Time (ms) |
|---------|--------|-------------------|
| edge-mqtt-broker | | |
| edge-ingress-gateway | | |
| edge-telemetry-timeseries | | |
| edge-weighvision-session | | |
| edge-media-store | | |
| edge-vision-inference | | |
| edge-sync-forwarder | | |
| edge-policy-sync | | |
| edge-observability-agent | | |
| edge-feed-intake | | |
| edge-retention-janitor | | |
| edge-cloud-ingestion-mock | | |

### 7.3 Test Case Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-TELEM-01 | | |
| TC-TELEM-02 | | |
| TC-TELEM-03 | | |
| TC-WV-01 | | |
| TC-WV-02 | | |
| TC-WV-03 | | |
| TC-MEDIA-01 | | |
| TC-MEDIA-02 | | |
| TC-MEDIA-03 | | |
| TC-INFER-01 | | |
| TC-INFER-02 | | |
| TC-FEED-01 | | |
| TC-FEED-02 | | |
| TC-SYNC-01 | | |
| TC-SYNC-02 | | |
| TC-SYNC-03 | | |
| TC-OBS-01 | | |
| TC-OBS-02 | | |

---

## 8. Troubleshooting

### 8.1 Common Issues

#### Issue: MQTT Connection Failed
**Solution:**
- Verify edge-mqtt-broker is running: `docker ps | grep mqtt`
- Check port 5100 is available
- Check firewall settings

#### Issue: Service Health Check Failed
**Solution:**
- Check service logs: `docker logs <container_name>`
- Verify database connection
- Check environment variables

#### Issue: Data Not Synced to Cloud
**Solution:**
- Check edge-sync-forwarder logs
- Verify CLOUD_INGESTION_URL is correct
- Check edge-cloud-ingestion-mock is running

### 8.2 Log Locations
- Service logs: `docker logs <container_name>`
- Test logs: `edge-layer/logs/`
- Cloud mock logs: Check edge-cloud-ingestion-mock container

---

## 9. Appendix

### 9.1 Service Port Mapping
| Service | Internal Port | External Port |
|---------|---------------|---------------|
| edge-mqtt-broker | 1883 | 5100 |
| edge-cloud-ingestion-mock | 3000 | 5102 |
| edge-ingress-gateway | 3000 | 5103 |
| edge-telemetry-timeseries | 3000 | 5104 |
| edge-weighvision-session | 3000 | 5105 |
| edge-media-store | 3000 | 5106 |
| edge-vision-inference | 8000 | 5107 |
| edge-sync-forwarder | 3000 | 5108 |
| edge-policy-sync | 3000 | 5109 |
| edge-observability-agent | 3000 | 5111 |
| edge-feed-intake | 5109 | 5112 |
| edge-retention-janitor | 3000 | 5114 |
| postgres | 5432 | 5141 |
| minio | 9000/9001 | 9000/9001 |

### 9.2 API Documentation Links
- Edge Ingress Gateway: http://localhost:5103/docs
- Edge Telemetry: http://localhost:5104/docs
- Edge WeighVision: http://localhost:5105/docs
- Edge Media Store: http://localhost:5106/docs
- Edge Sync Forwarder: http://localhost:5108/docs
- Edge Feed Intake: http://localhost:5112/docs

---

## 10. Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Roo Code | Initial test plan |
