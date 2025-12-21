# Tenant Registry Sensors Module Contract

## Purpose
Define the HTTP contract for sensor management endpoints exposed by cloud-tenant-registry (sensor module, Phase 1).

## Scope
- Sensor catalog management
- Sensor-device bindings
- Sensor calibration history

## Non-goals
- Sensor threshold rules (future: may reference cloud-config-rules-service)
- Device heartbeat tracking
- Telemetry storage (owned by cloud-telemetry-service)

## Architecture and Data Flow
- Service owner: `cloud-tenant-registry`
- All endpoints follow `../shared/01-api-standards.md`
- All requests must go through BFF (frontend does not call tenant-registry directly)

---

## Endpoints

| method | path | auth scope/role | idempotency key usage | request schema summary | response schema summary | errors |
|---|---|---|---|---|---|---|
| GET | /api/health | public | n/a | none | 200 OK string | 500 |
| GET | /api/ready | internal | n/a | none | 200 OK string | 500 |
| GET | /api-docs | public | n/a | none | Swagger UI | 500 |
| GET | /api-docs/openapi.json | public | n/a | none | OpenAPI JSON | 500 |
| POST | /api/v1/sensors | tenant_admin, farm_manager | required | sensor payload | sensor record | 400,401,403,409,422 |
| GET | /api/v1/sensors | viewer+ | n/a | filters + pagination | list of sensors | 400,401,403 |
| GET | /api/v1/sensors/{sensorId} | viewer+ | n/a | none | sensor record | 400,401,403,404 |
| PATCH | /api/v1/sensors/{sensorId} | tenant_admin, farm_manager | n/a | partial sensor payload | sensor record | 400,401,403,404,422 |
| POST | /api/v1/sensors/{sensorId}/bindings | tenant_admin, farm_manager | required | binding payload | binding record | 400,401,403,409,422 |
| GET | /api/v1/sensors/{sensorId}/bindings | viewer+ | n/a | pagination | list of bindings | 400,401,403,404 |
| POST | /api/v1/sensors/{sensorId}/calibrations | tenant_admin, farm_manager | required | calibration payload | calibration record | 400,401,403,409,422 |
| GET | /api/v1/sensors/{sensorId}/calibrations | viewer+ | n/a | pagination | list of calibrations | 400,401,403,404 |

---

## Request / Response Schemas

### Sensor

#### Create Sensor (POST /api/v1/sensors)

**Request Headers**:
```
Authorization: Bearer <jwt>
Idempotency-Key: <uuid-or-string>
Content-Type: application/json
x-request-id: <uuid>
```

**Request Body**:
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "zone": "north",
  "enabled": true
}
```

**Response 201 Created**:
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "zone": "north",
  "enabled": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

#### List Sensors (GET /api/v1/sensors)

**Query Parameters**:
- `tenantId` (required): Tenant identifier
- `barnId` (optional): Filter by barn
- `deviceId` (optional): Filter by device (joins via bindings)
- `type` (optional): Filter by sensor type
- `enabled` (optional): Filter by enabled status (true/false)
- `q` (optional): Search in label or sensorId
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "sensorId": "temp-001",
      "type": "temperature",
      "unit": "C",
      "label": "Barn 1 Temperature Sensor",
      "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
      "zone": "north",
      "enabled": true,
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Get Sensor (GET /api/v1/sensors/{sensorId})

**Response 200 OK**: Same as create response (single sensor object)

#### Update Sensor (PATCH /api/v1/sensors/{sensorId})

**Request Body** (partial):
```json
{
  "label": "Updated Label",
  "enabled": false,
  "zone": "south"
}
```

**Response 200 OK**: Updated sensor object

### Sensor Binding

#### Create Binding (POST /api/v1/sensors/{sensorId}/bindings)

**Request Body**:
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "bindingId": "bind-001",
  "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "protocol": "mqtt",
  "channel": "temperature",
  "samplingRate": 60,
  "effectiveFrom": "2025-01-20T10:00:00Z",
  "enabled": true
}
```

**Response 201 Created**:
```json
{
  "id": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "bindingId": "bind-001",
  "sensorId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "protocol": "mqtt",
  "channel": "temperature",
  "samplingRate": 60,
  "effectiveFrom": "2025-01-20T10:00:00Z",
  "effectiveTo": null,
  "enabled": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

#### List Bindings (GET /api/v1/sensors/{sensorId}/bindings)

**Query Parameters**:
- `tenantId` (required)
- `page` (optional, default: 1)
- `pageSize` (optional, default: 20, max: 100)

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "bindingId": "bind-001",
      "sensorId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
      "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
      "protocol": "mqtt",
      "channel": "temperature",
      "samplingRate": 60,
      "effectiveFrom": "2025-01-20T10:00:00Z",
      "effectiveTo": null,
      "enabled": true,
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### Sensor Calibration

#### Add Calibration (POST /api/v1/sensors/{sensorId}/calibrations)

**Request Body**:
```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "calibrationId": "cal-001",
  "method": "two-point",
  "offset": 0.5,
  "gain": 1.02,
  "performedAt": "2025-01-20T10:00:00Z",
  "performedBy": "user123",
  "notes": "Calibrated using reference thermometer"
}
```

**Response 201 Created**:
```json
{
  "id": "0190a1d1-cccc-7d3f-b2e4-9e8b5f8e0003",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "calibrationId": "cal-001",
  "sensorId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "method": "two-point",
  "offset": 0.5,
  "gain": 1.02,
  "performedAt": "2025-01-20T10:00:00Z",
  "performedBy": "user123",
  "notes": "Calibrated using reference thermometer",
  "createdAt": "2025-01-20T10:00:00Z"
}
```

#### List Calibrations (GET /api/v1/sensors/{sensorId}/calibrations) [OPTIONAL]

**Query Parameters**:
- `tenantId` (required)
- `page` (optional, default: 1)
- `pageSize` (optional, default: 20, max: 100)

**Response 200 OK**: Similar to bindings list, returns array of calibration records with pagination

**Note**: This endpoint is optional for Phase 1. If not implemented, calibrations are only accessible via sensor details or history query.

---

## Examples

### Example 1: Create Sensor (Happy Path)

**Request**:
```http
POST /api/v1/sensors
Idempotency-Key: idem-sensor-001
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-001
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "zone": "north",
  "enabled": true
}
```

**Response (201 Created)**:
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "zone": "north",
  "enabled": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

---

### Example 2: Create Sensor (Idempotency Retry)

**Request** (same Idempotency-Key as Example 1):
```http
POST /api/v1/sensors
Idempotency-Key: idem-sensor-001
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-002
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "zone": "north",
  "enabled": true
}
```

**Response (200 OK)** - Returns existing sensor (not 201, not duplicate):
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
  "zone": "north",
  "enabled": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

---

### Example 3: List Sensors (Filter by BarnId + Type + Pagination)

**Request**:
```http
GET /api/v1/sensors?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&barnId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003&type=temperature&enabled=true&page=1&pageSize=10
Authorization: Bearer <jwt>
x-request-id: req-003
```

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "sensorId": "temp-001",
      "type": "temperature",
      "unit": "C",
      "label": "Barn 1 Temperature Sensor",
      "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
      "zone": "north",
      "enabled": true,
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-20T10:00:00Z"
    },
    {
      "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0004",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "sensorId": "temp-002",
      "type": "temperature",
      "unit": "C",
      "label": "Barn 1 Temperature Sensor South",
      "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003",
      "zone": "south",
      "enabled": true,
      "createdAt": "2025-01-20T10:05:00Z",
      "updatedAt": "2025-01-20T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### Example 4: Get Sensor by ID

**Request**:
```http
GET /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002
Authorization: Bearer <jwt>
x-request-id: req-004
```

**Response (200 OK)**:
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "zone": "north",
  "enabled": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

---

### Example 5: Patch Sensor (Disable)

**Request**:
```http
PATCH /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-005
```

```json
{
  "enabled": false
}
```

**Response (200 OK)**:
```json
{
  "id": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-001",
  "type": "temperature",
  "unit": "C",
  "label": "Barn 1 Temperature Sensor",
  "barnId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "zone": "north",
  "enabled": false,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:05:00Z"
}
```

---

### Example 6: Create Binding (Happy Path)

**Request**:
```http
POST /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001/bindings
Idempotency-Key: idem-binding-001
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-006
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "bindingId": "bind-001",
  "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "protocol": "mqtt",
  "channel": "temperature",
  "samplingRate": 60,
  "effectiveFrom": "2025-01-20T10:00:00Z",
  "enabled": true
}
```

**Response (201 Created)**:
```json
{
  "id": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "bindingId": "bind-001",
  "sensorId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
  "protocol": "mqtt",
  "channel": "temperature",
  "samplingRate": 60,
  "effectiveFrom": "2025-01-20T10:00:00Z",
  "effectiveTo": null,
  "enabled": true,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

---

### Example 7: Create Binding (Overlapping Effective Window - Error)

**Request** (attempting to create overlapping binding):
```http
POST /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001/bindings
Idempotency-Key: idem-binding-002
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-007
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "bindingId": "bind-002",
  "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0005",
  "protocol": "mqtt",
  "channel": "temperature",
  "samplingRate": 30,
  "effectiveFrom": "2025-01-20T09:00:00Z",
  "enabled": true
}
```

**Response (409 Conflict)**:
```json
{
  "error": {
    "code": "BINDING_OVERLAP",
    "message": "Active binding already exists for this sensor in the specified effective window. Close existing binding first.",
    "traceId": "trace-007"
  }
}
```

---

### Example 8: List Bindings

**Request**:
```http
GET /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001/bindings?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002&page=1&pageSize=20
Authorization: Bearer <jwt>
x-request-id: req-008
```

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "0190a1d1-bbbb-7d3f-b2e4-9e8b5f8e0002",
      "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
      "bindingId": "bind-001",
      "sensorId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
      "deviceId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0004",
      "protocol": "mqtt",
      "channel": "temperature",
      "samplingRate": 60,
      "effectiveFrom": "2025-01-20T10:00:00Z",
      "effectiveTo": null,
      "enabled": true,
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### Example 9: Add Calibration (Happy Path)

**Request**:
```http
POST /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001/calibrations
Idempotency-Key: idem-cal-001
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-009
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "calibrationId": "cal-001",
  "method": "two-point",
  "offset": 0.5,
  "gain": 1.02,
  "performedAt": "2025-01-20T10:00:00Z",
  "performedBy": "user123",
  "notes": "Calibrated using reference thermometer"
}
```

**Response (201 Created)**:
```json
{
  "id": "0190a1d1-cccc-7d3f-b2e4-9e8b5f8e0003",
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "calibrationId": "cal-001",
  "sensorId": "0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001",
  "method": "two-point",
  "offset": 0.5,
  "gain": 1.02,
  "performedAt": "2025-01-20T10:00:00Z",
  "performedBy": "user123",
  "notes": "Calibrated using reference thermometer",
  "createdAt": "2025-01-20T10:00:00Z"
}
```

---

### Example 10: Add Calibration (Validation Error - Invalid Gain)

**Request**:
```http
POST /api/v1/sensors/0190a1d1-aaaa-7d3f-b2e4-9e8b5f8e0001/calibrations
Idempotency-Key: idem-cal-002
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-010
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "calibrationId": "cal-002",
  "method": "two-point",
  "offset": 0.5,
  "gain": -1.0,
  "performedAt": "2025-01-20T10:00:00Z",
  "performedBy": "user123"
}
```

**Response (422 Unprocessable Entity)**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "gain must be greater than 0",
    "traceId": "trace-010"
  }
}
```

---

### Example 11: Unauthorized (401)

**Request** (missing Authorization header):
```http
GET /api/v1/sensors?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002
x-request-id: req-011
```

**Response (401 Unauthorized)**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "traceId": "trace-011"
  }
}
```

---

### Example 12: Forbidden (403)

**Request** (viewer role attempting write):
```http
POST /api/v1/sensors
Authorization: Bearer <jwt-viewer-role>
Idempotency-Key: idem-sensor-003
Content-Type: application/json
x-request-id: req-012
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-003",
  "type": "temperature",
  "unit": "C"
}
```

**Response (403 Forbidden)**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. Required role: tenant_admin or farm_manager",
    "traceId": "trace-012"
  }
}
```

---

### Example 13: Not Found (404)

**Request**:
```http
GET /api/v1/sensors/non-existent-id?tenantId=018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002
Authorization: Bearer <jwt>
x-request-id: req-013
```

**Response (404 Not Found)**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Sensor not found",
    "traceId": "trace-013"
  }
}
```

---

### Example 14: Idempotency Key Conflict (409)

**Request** (same Idempotency-Key, different body):
```http
POST /api/v1/sensors
Idempotency-Key: idem-sensor-001
Authorization: Bearer <jwt>
Content-Type: application/json
x-request-id: req-014
```

```json
{
  "tenantId": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002",
  "sensorId": "temp-999",
  "type": "humidity",
  "unit": "%"
}
```

**Response (409 Conflict)**:
```json
{
  "error": {
    "code": "IDEMPOTENCY_KEY_CONFLICT",
    "message": "Idempotency-Key already used with different request body",
    "traceId": "trace-014"
  }
}
```

---

## Error Response Format

All errors follow the standard format from `docs/shared/01-api-standards.md`:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "traceId": "trace-id-from-header-or-tracer"
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400/422): Request validation failed
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (duplicate, overlap, etc.)
  - `IDEMPOTENCY_KEY_CONFLICT`: Idempotency key used with different body
  - `RESOURCE_ALREADY_EXISTS`: Unique constraint violation
  - `BINDING_OVERLAP`: Binding effective window overlaps existing active binding
- `INTERNAL_ERROR` (500): Server error

---

## Pagination

List endpoints support pagination via query parameters:
- `page`: Page number (1-based, default: 1)
- `pageSize`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Checklist Counter
- Mermaid diagrams: 0/0 (diagrams in service design doc)
- Endpoint rows: 12/12
- DB tables documented: 0/0 (documented in service design doc)
- DB column rows: 0/0 (documented in service design doc)
- Example sets: 14/10
- Open questions: 0/0

