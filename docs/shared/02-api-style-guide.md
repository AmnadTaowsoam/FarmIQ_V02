# FarmIQ API Style Guide

**Purpose**: Comprehensive API design standards for FarmIQ platform  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26  
**Status**: Active

---

## Overview

This style guide extends the base API standards (`01-api-standards.md`) with detailed design patterns, naming conventions, and best practices for all FarmIQ APIs.

---

## Resource Naming

### Nouns and Plural Forms

- ✅ **Correct**: `/api/v1/devices`, `/api/v1/farms`, `/api/v1/barns`
- ❌ **Incorrect**: `/api/v1/device`, `/api/v1/getFarms`, `/api/v1/barn-list`

### Path Parameters

- Use lowercase with underscores: `{device_id}`, `{tenant_id}`, `{farm_id}`
- ✅ **Correct**: `/api/v1/devices/{device_id}`
- ❌ **Incorrect**: `/api/v1/devices/{deviceId}`, `/api/v1/devices/{DeviceID}`

### Query Parameters

- Use snake_case: `tenant_id`, `farm_id`, `start_date`, `end_date`
- ✅ **Correct**: `GET /api/v1/devices?tenant_id=123&farm_id=456`
- ❌ **Incorrect**: `GET /api/v1/devices?tenantId=123&farmId=456`

---

## HTTP Methods

| Method | Usage | Idempotent | Example |
|--------|-------|------------|---------|
| `GET` | Read/List resources | Yes | `GET /api/v1/devices` |
| `POST` | Create resource or action | No | `POST /api/v1/devices` |
| `PATCH` | Partial update | No | `PATCH /api/v1/devices/{id}` |
| `PUT` | Full replace (use sparingly) | Yes | `PUT /api/v1/devices/{id}` |
| `DELETE` | Delete resource | Yes | `DELETE /api/v1/devices/{id}` |

### Actions (Non-CRUD Operations)

For non-CRUD operations, use POST with action in path:

- ✅ **Correct**: `POST /api/v1/devices/{id}/activate`
- ✅ **Correct**: `POST /api/v1/batches/{id}/complete`
- ❌ **Incorrect**: `PATCH /api/v1/devices/{id}/activate` (use POST for actions)

---

## Pagination

### Standard Pagination Pattern

All list endpoints MUST support pagination:

```yaml
parameters:
  - name: page
    in: query
    schema:
      type: integer
      minimum: 0
      default: 0
  - name: pageSize
    in: query
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 25
```

### Response Format

```json
{
  "data": [...],
  "total": 150,
  "page": 0,
  "pageSize": 25,
  "totalPages": 6
}
```

---

## Error Response Format

### Standard Error Envelope

All errors MUST follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "traceId": "uuid-or-trace-id",
    "details": {} // Optional: additional context
  }
}
```

### Error Codes

| Code | HTTP Status | Usage |
|------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `QUOTA_EXCEEDED` | 429 | Tenant quota exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service unavailable |

### Validation Error Details

For validation errors, include field-level details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "traceId": "trace-id-123",
    "details": {
      "fields": {
        "farm_id": ["farm_id is required"],
        "name": ["name must be at least 3 characters"]
      }
    }
  }
}
```

---

## Request/Response Headers

### Required Request Headers

- `x-request-id`: Unique request identifier (UUID)
- `x-trace-id`: Trace correlation ID
- `Authorization`: Bearer token for authenticated endpoints
- `Content-Type`: `application/json` for JSON payloads

### Standard Response Headers

- `x-request-id`: Echo of request ID
- `x-trace-id`: Trace correlation ID
- `x-api-version`: API version (e.g., `v1`)
- `X-Sunset`: Date when endpoint will be deprecated (RFC 8594)

---

## API Versioning

### Version in URL Path

- Current version: `/api/v1/...`
- Future versions: `/api/v2/...`, `/api/v3/...`
- Health/docs endpoints: `/api/health` (no version)

### Deprecation Policy

1. **Deprecation Notice**: Add `deprecated: true` in OpenAPI + `X-Sunset` header
2. **Minimum 90 days** between deprecation and sunset
3. **Migration Guide**: Document in `/docs/api/migrations/`

---

## Filtering and Sorting

### Filtering

Use query parameters with `filter_` prefix for complex filters:

```
GET /api/v1/devices?filter_status=active&filter_type=sensor
```

### Sorting

Use `sort` parameter with field and direction:

```
GET /api/v1/devices?sort=created_at:desc
GET /api/v1/devices?sort=name:asc,created_at:desc
```

---

## Date/Time Formats

- **ISO 8601**: `2025-01-26T10:30:00Z`
- **Date only**: `2025-01-26`
- **Time zone**: Always UTC (Z suffix)

---

## Field Naming Conventions

### JSON Fields

- Use **snake_case** for all JSON field names
- ✅ **Correct**: `tenant_id`, `created_at`, `device_type`
- ❌ **Incorrect**: `tenantId`, `createdAt`, `deviceType`

### Timestamps

- Use `created_at`, `updated_at`, `deleted_at`
- Type: `string` (ISO 8601 format)

### IDs

- Use `id` for primary identifier (UUID)
- Use `{resource}_id` for foreign keys: `tenant_id`, `farm_id`, `device_id`

---

## OpenAPI Specification Requirements

### Required Fields

Every OpenAPI spec MUST include:

```yaml
openapi: 3.0.3
info:
  title: Service Name
  version: 1.0.0
  description: Service description
  contact:
    name: FarmIQ Platform Team
servers:
  - url: /api
    description: API base path
```

### Security Schemes

Define bearer token authentication:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### Tags

Group endpoints by domain:

```yaml
tags:
  - name: Devices
    description: Device management
  - name: Farms
    description: Farm management
```

---

## Response Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PATCH, PUT) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limited / Quota Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Best Practices

### Idempotency

- Use `idempotency-key` header for POST/PATCH operations
- Service should return same response for duplicate requests

### Caching

- Set `Cache-Control: no-store` for all API responses
- Use `ETag` for conditional requests (optional)

### Rate Limiting

- Return `429 Too Many Requests` with `Retry-After` header
- Include rate limit info in response headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Examples

### List Resources

```http
GET /api/v1/devices?tenant_id=123&page=0&pageSize=25&sort=created_at:desc
```

```json
{
  "data": [
    {
      "id": "device-001",
      "tenant_id": "123",
      "device_type": "sensor",
      "status": "active",
      "created_at": "2025-01-26T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 0,
  "pageSize": 25,
  "totalPages": 4
}
```

### Create Resource

```http
POST /api/v1/devices
Content-Type: application/json
x-request-id: req-123
x-trace-id: trace-456

{
  "tenant_id": "123",
  "device_type": "sensor",
  "name": "Temperature Sensor 1"
}
```

```json
{
  "id": "device-001",
  "tenant_id": "123",
  "device_type": "sensor",
  "name": "Temperature Sensor 1",
  "status": "active",
  "created_at": "2025-01-26T10:00:00Z"
}
```

### Error Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
x-request-id: req-123
x-trace-id: trace-456

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "traceId": "trace-456",
    "details": {
      "fields": {
        "tenant_id": ["tenant_id is required"]
      }
    }
  }
}
```

---

## Checklist for API Review

- [ ] Resource names are plural nouns
- [ ] Path parameters use snake_case
- [ ] Query parameters use snake_case
- [ ] JSON fields use snake_case
- [ ] Error responses follow standard format
- [ ] Pagination implemented for list endpoints
- [ ] OpenAPI spec is complete and valid
- [ ] All endpoints have descriptions
- [ ] Security schemes defined
- [ ] Deprecation notices added (if applicable)
- [ ] Version in URL path (`/api/v1/...`)
