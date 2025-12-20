# Ops Observability UX

**Purpose**: Define what the Dashboard shows for operational monitoring, data freshness, sync status, and troubleshooting.  
**Scope**: Ops-facing features, correlation IDs, error handling, and Datadog RUM integration.  
**Owner**: FarmIQ Ops Team  
**Last updated**: 2025-01-20  

---

## Data Freshness Indicators

### Display Locations
- **Overview page**: "Last updated: X seconds ago" (global indicator)
- **Barn detail**: Per-sensor "Last updated" timestamps
- **Device detail**: "Last seen: X minutes ago"
- **Telemetry explorer**: "Data freshness: X seconds ago" (for recent data)

### Color Coding
- **Green**: Data < 1 minute old
- **Yellow**: Data 1-5 minutes old
- **Red**: Data > 5 minutes old

### Implementation
```typescript
const getFreshnessColor = (ageSeconds: number) => {
  if (ageSeconds < 60) return 'green';
  if (ageSeconds < 300) return 'yellow';
  return 'red';
};
```

---

## Sync Monitor

### Display (Ops Pages)
**Sync Status Dashboard**:
- **Sync backlog**: Count of pending events in sync queue
- **Oldest pending age**: Age of oldest pending event (seconds)
- **Sync success rate**: Percentage of successful syncs (last 24 hours)
- **Edge cluster status**: Online/offline status of edge clusters
- **Sync trend chart**: Chart showing backlog over time

**Example Display**:
```
Sync Status
├─ Backlog: 150 events
├─ Oldest pending: 5 minutes ago
├─ Success rate (24h): 99.5%
└─ Edge clusters: 3 online, 1 offline
```

### Alerts
- **Warning**: Backlog > 1000 events or oldest pending > 1 hour
- **Critical**: Backlog > 10000 events or oldest pending > 24 hours

---

## Ingestion Errors

### Display (Ops Pages)
**Ingestion Errors Table**:
- **Timestamp**: When error occurred
- **Error type**: Sync error, Validation error, Duplicate, etc.
- **Context**: Tenant/Farm/Barn affected
- **Error message**: Detailed error message
- **Retry count**: Number of retry attempts
- **Status**: Pending, Retrying, Failed, Resolved

**Example**:
```
Ingestion Errors (Last 24h)
├─ 2025-12-20 10:00:00 | Validation Error | Tenant: ABC | Message: Invalid tenant_id
├─ 2025-12-20 09:30:00 | Sync Error | Tenant: XYZ | Retry count: 3
└─ 2025-12-20 08:00:00 | Duplicate | Tenant: ABC | Event ID: xxx
```

### Error Filtering
- Filter by error type, tenant, time range
- Group by error type for pattern analysis
- Show error rate trend chart

---

## Device Status

### Display
**Device Status Summary**:
- **Online devices**: Count with recent telemetry (< 5 min)
- **Offline devices**: Count without recent telemetry (> 5 min)
- **Error devices**: Count with error status
- **Uptime %**: Average device uptime (last 24h, 7d, 30d)

**Per-Device Status**:
- **Status badge**: Online (green), Offline (yellow), Error (red)
- **Last seen**: Timestamp of last telemetry
- **Uptime %**: Device uptime percentage
- **Telemetry count**: Number of readings received (today)

### Status Definitions
- **Online**: Last telemetry < 5 minutes ago
- **Offline**: Last telemetry 5-60 minutes ago
- **Stale**: Last telemetry > 60 minutes ago
- **Error**: Device reported error status

---

## Correlation: x-request-id and traceId

### x-request-id Generation
**Frontend**:
- Generate UUID v4 for each API request
- Include in `x-request-id` header
- Store in request context for logging

**Example**:
```typescript
const requestId = uuidv4();
fetch('/api/v1/telemetry/readings', {
  headers: {
    'x-request-id': requestId,
    'Authorization': `Bearer ${token}`
  }
});
```

---

### traceId Display
**Backend Response**:
- Backend includes `traceId` in error responses
- Frontend displays `traceId` to users for support

**Display Format**:
```
Error: Unable to load data
Trace ID: abc-123-xyz
Please provide this Trace ID when contacting support.
```

**User Actions**:
- **Copy traceId**: Button to copy traceId to clipboard
- **Report issue**: Link to support with traceId pre-filled

---

### Correlation in Logs
**Frontend Logging**:
- Include `requestId` in all frontend logs
- Include `traceId` from backend responses in logs
- Send to Datadog RUM with correlation

**Example Log**:
```json
{
  "level": "error",
  "message": "Failed to load telemetry",
  "requestId": "req-123",
  "traceId": "trace-456",
  "url": "/api/v1/telemetry/readings",
  "status": 500
}
```

---

## Datadog RUM (Real User Monitoring)

### Integration
**Setup**:
- Initialize Datadog RUM in frontend application
- Configure with application ID and client token
- Set environment (production, staging, development)

**Example**:
```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.VITE_DATADOG_APP_ID,
  clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'dashboard-web',
  env: process.env.NODE_ENV,
  version: process.env.VITE_APP_VERSION,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 10
});
```

---

### Non-PII Data
**Allowed**:
- ✅ Page views and navigation
- ✅ API request/response metadata (URL, status, duration)
- ✅ Error messages (sanitized, no PII)
- ✅ Performance metrics (load time, render time)
- ✅ User actions (button clicks, form submissions) - without form values
- ✅ `requestId` and `traceId` for correlation

**Prohibited**:
- ❌ User email addresses
- ❌ User names
- ❌ Tenant/Farm/Barn names (use IDs instead)
- ❌ Device serial numbers
- ❌ Form input values (passwords, search queries)
- ❌ Image data or media content

---

### Custom Attributes
**Safe Attributes**:
```typescript
datadogRum.addAction('page_view', {
  page: 'barn_detail',
  tenant_id: 'uuid', // OK: UUID, not name
  farm_id: 'uuid',
  barn_id: 'uuid',
  user_role: 'farm_manager' // OK: Role, not user name
});
```

**Prohibited Attributes**:
```typescript
// ❌ DO NOT include:
{
  user_email: 'user@example.com',
  tenant_name: 'Farm Company Ltd',
  farm_name: 'Farm A',
  device_serial: 'SG-001'
}
```

---

## Error Handling UX

### Error States
**401 Unauthorized**:
- Show "Session expired" message
- Attempt silent token refresh
- If refresh fails, redirect to `/login`

**403 Forbidden**:
- Show "Access Denied" message
- Explain what user tried to access
- Provide link to contact administrator (if applicable)

**404 Not Found**:
- Show "Resource Not Found" message
- Provide link back to parent page or list
- Suggest search if applicable

**5xx Server Error**:
- Show "Service Unavailable" message
- Display `traceId` for support
- Provide "Retry" button
- Show "Report Issue" link with traceId

---

### Retry Logic
**Automatic Retry**:
- Retry on network failures (max 3 retries, exponential backoff)
- Retry on 502, 503, 504 errors
- Do NOT retry on 400, 401, 403, 404 errors

**Manual Retry**:
- "Retry" button on error pages
- Resets retry count
- Shows loading state during retry

---

## Performance Monitoring

### Metrics to Track
- **Page load time**: Time to first contentful paint (FCP)
- **Time to interactive**: Time until page is interactive (TTI)
- **API latency**: P50, P95, P99 response times
- **Chart render time**: Time to render charts with data
- **Error rate**: Percentage of failed API requests

### Display (Ops Pages)
**Performance Dashboard**:
- **API latency chart**: P50, P95, P99 over time
- **Error rate chart**: Error rate over time
- **Page load time**: Average page load time per route
- **Slow queries**: List of slowest API endpoints

---

## Data Quality Indicators

### Coverage Heatmap
**Display**: Calendar heatmap showing data coverage by day/hour
- **Green**: 95-100% coverage
- **Yellow**: 90-94% coverage
- **Red**: < 90% coverage

### Missing Data Timeline
**Display**: Timeline showing periods with missing data
- **Gaps**: Highlight time periods with no data
- **Duration**: Show duration of each gap
- **Impact**: Estimate impact (e.g., "Missing 15 minutes of temperature data")

---

## Related Documentation

- [Data Requirements](03-data-requirements-and-computation.md): Data freshness model
- [Page Specifications](02-page-specs.md): Ops pages (Data Quality, Ops Health)
- [Observability](shared/02-observability-datadog.md): Datadog integration details

