# FarmIQ API Documentation

**Version**: 1.0.0
**Base URL**: `https://api.farmiq.example.com/v1`
**Last Updated**: 2025-01-26

---

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Quick Start](#quick-start)
- [Endpoints](#endpoints)
- [Webhooks](#webhooks)
- [SDKs](#sdks)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)

---

## Introduction

The FarmIQ API provides programmatic access to all FarmIQ features, enabling developers to build custom integrations, automate workflows, and extend FarmIQ functionality.

### API Overview

- **RESTful Architecture**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON Format**: Request and response bodies use JSON
- **Versioning**: URL-based versioning (`/v1/`)
- **Pagination**: Cursor-based pagination for list endpoints
- **Webhooks**: Real-time event notifications

### Supported Features

- Identity & Access Management
- Tenant & User Management
- Farm & Barn Operations
- Telemetry Data
- WeighVision Sessions
- Feeding Management
- Reports & Analytics
- AI Insights

---

## Authentication

### API Keys

API keys are used for service-to-service authentication:

#### Getting an API Key

1. Log in to FarmIQ
2. Navigate to **Settings** > **API Keys**
3. Click **+ Create API Key**
4. Enter key name and permissions
5. Copy the key (shown only once)

#### Using API Keys

Include the API key in the `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY
```

### JWT Authentication

For user-based authentication, use JWT tokens:

#### Obtaining a Token

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Using JWT Token

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### OAuth 2.0 Flow

For third-party applications:

1. **Register Application**
   - Go to **Settings** > **OAuth Applications**
   - Register your app
   - Get `client_id` and `client_secret`

2. **Authorization Code Flow**

   **Step 1: Get Authorization Code**

   ```
   GET https://api.farmiq.example.com/v1/oauth/authorize?
     response_type=code&
     client_id=YOUR_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     scope=read write&
     state=RANDOM_STRING
   ```

   **Step 2: Exchange Code for Token**

   ```http
   POST /v1/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&
   code=AUTHORIZATION_CODE&
   redirect_uri=YOUR_REDIRECT_URI&
   client_id=YOUR_CLIENT_ID&
   client_secret=YOUR_CLIENT_SECRET
   ```

---

## Quick Start

### Your First API Call

```bash
curl -X GET https://api.farmiq.example.com/v1/farms \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:

```json
{
  "data": [
    {
      "id": "farm_123",
      "name": "Main Farm",
      "location": {
        "address": "123 Farm Road",
        "latitude": 13.7563,
        "longitude": 100.5018
      },
      "type": "broiler",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "next": "cursor_abc123",
    "limit": 20
  }
}
```

### Creating a Farm

```bash
curl -X POST https://api.farmiq.example.com/v1/farms \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Farm",
    "type": "broiler",
    "location": {
      "address": "456 New Road",
      "latitude": 13.7563,
      "longitude": 100.5018
    }
  }'
```

### Querying Telemetry

```bash
curl -X GET "https://api.farmiq.example.com/v1/telemetry?barn=barn_456&startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Endpoints

### Identity & Access

#### Login
```http
POST /v1/auth/login
```

#### Logout
```http
POST /v1/auth/logout
```

#### Refresh Token
```http
POST /v1/auth/refresh
```

### Tenant Registry

#### List Tenants
```http
GET /v1/tenants
```

#### Get Tenant
```http
GET /v1/tenants/:tenantId
```

#### Create Tenant
```http
POST /v1/tenants
```

#### Update Tenant
```http
PUT /v1/tenants/:tenantId
```

### Farms & Barns

#### List Farms
```http
GET /v1/farms
```

#### Get Farm
```http
GET /v1/farms/:farmId
```

#### Create Farm
```http
POST /v1/farms
```

#### Update Farm
```http
PUT /v1/farms/:farmId
```

#### Delete Farm
```http
DELETE /v1/farms/:farmId
```

#### List Barns
```http
GET /v1/farms/:farmId/barns
```

#### Create Barn
```http
POST /v1/farms/:farmId/barns
```

### Telemetry

#### Query Telemetry
```http
GET /v1/telemetry
```

#### Get Latest Telemetry
```http
GET /v1/telemetry/latest
```

#### Stream Telemetry
```http
GET /v1/telemetry/stream
```

### WeighVision

#### List Sessions
```http
GET /v1/weighvision/sessions
```

#### Create Session
```http
POST /v1/weighvision/sessions
```

#### Get Session Results
```http
GET /v1/weighvision/sessions/:sessionId
```

#### Get Weight History
```http
GET /v1/weighvision/weights
```

### Feeding

#### List Feed Intake
```http
GET /v1/feeding/intake
```

#### Record Feed Intake
```http
POST /v1/feeding/intake
```

#### List Feed Types
```http
GET /v1/feeding/feed-types
```

### Reports

#### Generate Report
```http
POST /v1/reports
```

#### Get Report Status
```http
GET /v1/reports/:reportId
```

#### Download Report
```http
GET /v1/reports/:reportId/download
```

### AI Insights

#### Get Recommendations
```http
GET /v1/ai/recommendations
```

#### Get Predictions
```http
GET /v1/ai/predictions
```

---

## Webhooks

### Webhook Events

FarmIQ sends webhook notifications for the following events:

| Event | Description |
|-------|-------------|
| `telemetry.alert` | Telemetry threshold exceeded |
| `weighvision.session_complete` | WeighVision session finished |
| `feeding.low_stock` | Feed stock below threshold |
| `animal.health_alert` | Health issue detected |
| `report.ready` | Generated report available |

### Setting Up Webhooks

1. Navigate to **Settings** > **Webhooks**
2. Click **+ Add Webhook**
3. Configure:
   - **URL**: Your endpoint URL
   - **Events**: Select events to subscribe
   - **Secret**: For signature verification
4. Click **Save**

### Webhook Payload

```json
{
  "eventId": "evt_123",
  "eventType": "telemetry.alert",
  "timestamp": "2025-01-26T09:00:00Z",
  "data": {
    "barnId": "barn_456",
    "sensorId": "sensor_789",
    "type": "temperature",
    "value": 35.5,
    "threshold": 32.0
  },
  "signature": "sha256=..."
}
```

### Verifying Webhooks

Verify webhook authenticity using the HMAC signature:

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

## SDKs

### TypeScript/JavaScript SDK

#### Installation

```bash
npm install @farmiq/sdk
```

#### Usage

```typescript
import { FarmIQClient } from '@farmiq/sdk';

const client = new FarmIQClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.farmiq.example.com/v1'
});

// List farms
const farms = await client.farms.list();

// Create a farm
const farm = await client.farms.create({
  name: 'New Farm',
  type: 'broiler',
  location: {
    address: '123 Farm Road',
    latitude: 13.7563,
    longitude: 100.5018
  }
});

// Query telemetry
const telemetry = await client.telemetry.query({
  barnId: 'barn_456',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

### Python SDK

#### Installation

```bash
pip install farmiq-sdk
```

#### Usage

```python
from farmiq import FarmIQClient

client = FarmIQClient(
    api_key='YOUR_API_KEY',
    base_url='https://api.farmiq.example.com/v1'
)

# List farms
farms = client.farms.list()

# Create a farm
farm = client.farms.create(
    name='New Farm',
    type='broiler',
    location={
        'address': '123 Farm Road',
        'latitude': 13.7563,
        'longitude': 100.5018
    }
)

# Query telemetry
telemetry = client.telemetry.query(
    barn_id='barn_456',
    start_date='2025-01-01',
    end_date='2025-01-31'
)
```

---

## Rate Limits

API rate limits prevent abuse and ensure fair usage:

| Plan | Requests/Hour | Requests/Day |
|------|---------------|--------------|
| Free | 1,000 | 10,000 |
| Basic | 10,000 | 100,000 |
| Pro | 100,000 | 1,000,000 |
| Enterprise | Unlimited | Unlimited |

### Rate Limit Headers

Each API response includes rate limit headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640553600
```

### Handling Rate Limits

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

Implement exponential backoff:

```javascript
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return makeRequest(url, options);
    }
    return response;
  } catch (error) {
    // Handle error
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ],
    "requestId": "req_123"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters |
| `AUTHENTICATION_ERROR` | Invalid credentials |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Support

For API support:

- **Documentation**: [docs.farmiq.example.com/api](https://docs.farmiq.example.com/api)
- **Email**: api-support@farmiq.example.com
- **Status Page**: [status.farmiq.example.com](https://status.farmiq.example.com)

---

**© 2025 FarmIQ. All rights reserved.**
