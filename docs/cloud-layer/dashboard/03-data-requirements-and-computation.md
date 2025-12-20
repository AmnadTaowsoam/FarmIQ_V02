# Data Requirements and Computation

**Purpose**: Define data sources, canonical IDs, computation responsibilities, and data freshness model for the Dashboard.  
**Scope**: Data flow from cloud services to dashboard, computation definitions, and freshness requirements.  
**Owner**: FarmIQ Frontend Team  
**Last updated**: 2025-01-20  

---

## Data Sources

### 1. Telemetry Events
**Source**: `cloud-telemetry-service`  
**Data Type**: Time-series sensor readings (temperature, humidity, weight, etc.)  
**Format**: 
```json
{
  "tenant_id": "uuid",
  "farm_id": "uuid",
  "barn_id": "uuid",
  "device_id": "uuid",
  "metric_type": "temperature",
  "metric_value": 25.5,
  "unit": "celsius",
  "occurred_at": "2025-12-20T10:00:00Z"
}
```

**Access Pattern**: 
- Query via BFF: `GET /api/v1/telemetry/readings?tenant_id=...&start_time=...&end_time=...`
- Aggregation: Server-side (1m, 5m, 15m, 1h, 1d windows)

---

### 2. WeighVision Sessions
**Source**: `cloud-analytics-service` (consumes from RabbitMQ)  
**Data Type**: Session metadata, weight measurements, inference results  
**Format**:
```json
{
  "session_id": "uuid",
  "tenant_id": "uuid",
  "farm_id": "uuid",
  "barn_id": "uuid",
  "station_id": "uuid",
  "batch_id": "uuid",
  "status": "finalized",
  "start_at": "2025-12-20T10:00:00Z",
  "end_at": "2025-12-20T10:05:00Z",
  "initial_weight_kg": 2.5,
  "final_weight_kg": 2.6,
  "image_count": 10,
  "inference_results": [...]
}
```

**Access Pattern**:
- Query via BFF: `GET /api/v1/weighvision/sessions?tenant_id=...`
- Detail: `GET /api/v1/weighvision/sessions/:sessionId`

---

### 3. Analytics Results
**Source**: `cloud-analytics-service`  
**Data Type**: Computed KPIs, anomalies, forecasts, recommendations  
**Format**:
```json
{
  "tenant_id": "uuid",
  "farm_id": "uuid",
  "barn_id": "uuid",
  "batch_id": "uuid",
  "computed_at": "2025-12-20T10:00:00Z",
  "kpis": {
    "avg_weight_kg": 2.5,
    "fcr": 1.8,
    "adg_kg_per_day": 0.05
  },
  "anomalies": [...],
  "forecasts": [...]
}
```

**Access Pattern**:
- Query via BFF: `GET /api/v1/analytics/kpis?tenant_id=...&time_range=...`
- Anomalies: `GET /api/v1/analytics/anomalies?tenant_id=...`
- Forecasts: `GET /api/v1/analytics/forecasts?tenant_id=...`

---

### 4. Registry Data
**Source**: `cloud-tenant-registry`  
**Data Type**: Tenant, Farm, Barn, Batch, Device metadata  
**Format**:
```json
{
  "tenant_id": "uuid",
  "name": "Farm Company Ltd",
  "status": "active",
  "farms": [...],
  "barns": [...],
  "devices": [...]
}
```

**Access Pattern**:
- Query via BFF: `GET /api/v1/registry/tenants/:tenantId`
- Farms: `GET /api/v1/registry/farms?tenant_id=...`
- Barns: `GET /api/v1/registry/barns?tenant_id=...&farm_id=...`
- Devices: `GET /api/v1/registry/devices?tenant_id=...`

---

### 5. Feed Data
**Source**: `cloud-analytics-service` (consumes feed events from RabbitMQ)  
**Data Type**: Daily feed intake, feed plans  
**Format**:
```json
{
  "tenant_id": "uuid",
  "farm_id": "uuid",
  "barn_id": "uuid",
  "batch_id": "uuid",
  "date": "2025-12-20",
  "feed_intake_kg": 100.5,
  "planned_feed_kg": 100.0,
  "cumulative_feed_kg": 1500.0
}
```

**Access Pattern**:
- Query via BFF: `GET /api/v1/feeding/daily?tenant_id=...&start_date=...&end_date=...`

---

## Canonical IDs

### Required Everywhere
All API requests and data objects MUST include:
- `tenant_id` (required): Tenant context
- `farm_id` (optional): Farm context
- `barn_id` (optional): Barn context
- `device_id` (optional): Device context
- `batch_id` (optional): Batch/species context
- `session_id` (optional): WeighVision session context

### ID Format
- **UUID v7**: All IDs use UUID v7 format (time-ordered UUIDs)
- **Validation**: BFF validates all IDs are valid UUIDs and user has access

### ID Propagation
- **Query params**: Context IDs sent as query parameters: `?tenant_id=...&farm_id=...`
- **Path params**: Resource IDs in URL path: `/api/v1/barns/:barnId`
- **Request body**: IDs included in POST/PATCH request bodies
- **Response body**: All responses include IDs for resources

---

## Computation Responsibilities

### Frontend (Client-Side)
**What FE should compute locally**:
- **Simple aggregations**: Min, Max, Avg, Sum for displayed data (if data is already fetched)
- **Filtering**: Client-side filtering of already-fetched data (for UX responsiveness)
- **Sorting**: Client-side sorting of table data
- **Formatting**: Date/time formatting, number formatting, unit conversions
- **Chart rendering**: Chart visualization from fetched data points

**Rationale**: Reduces server load, improves UX responsiveness for simple operations.

---

### Backend (Server-Side)
**What must be computed server-side**:
- **Time-series aggregation**: Aggregating telemetry data into time windows (1m, 5m, 1h, 1d)
- **FCR calculation**: Feed Conversion Ratio = Feed Consumed / Weight Gain (requires historical data)
- **ADG calculation**: Average Daily Gain = (Final Weight - Initial Weight) / Days (requires batch-level data)
- **Forecasting**: ML-based predictions (weight trajectory, FCR trends, market weight ETA)
- **Anomaly detection**: Statistical/ML-based anomaly detection (requires historical baseline)
- **Correlation analysis**: Computing correlation coefficients between metrics
- **Uniformity metrics**: Computing weight distribution statistics (P10-P90, CV, IQR)
- **Data quality metrics**: Computing coverage %, uptime %, missing data periods

**Rationale**: Requires access to large historical datasets, ML models, and complex algorithms.

---

## Data Freshness Model

### Last Seen Rules
**Device Last Seen**:
- **Online**: Device has sent telemetry within last 5 minutes
- **Offline**: Device has not sent telemetry for > 5 minutes
- **Stale**: Device has not sent telemetry for > 24 hours

**Display**:
- Show "Last seen: X minutes ago" for each device
- Color code: Green (< 5 min), Yellow (5-60 min), Red (> 60 min)

---

### Telemetry Lag
**Definition**: Time between when telemetry occurred (device timestamp) and when it appears in dashboard.

**Expected Lag**:
- **Edge → Cloud sync**: 30-60 seconds (typical)
- **Cloud processing**: 10-30 seconds (ingestion + RabbitMQ + service processing)
- **Total lag**: 60-90 seconds (P95)

**Display**:
- Show "Data freshness: X seconds ago" on telemetry pages
- Alert if lag > 5 minutes (indicates sync issues)

---

### Sync Lag
**Definition**: Time between when event occurred on edge and when it is synced to cloud.

**Monitoring**:
- Track `sync_outbox` backlog size
- Track oldest pending event age
- Alert if backlog > 1000 events or oldest pending > 1 hour

**Display** (Ops pages):
- Show sync backlog count
- Show oldest pending event age
- Show sync success rate (last 24 hours)

---

### Data Freshness Indicators
**Color Coding**:
- **Green**: Data < 1 minute old
- **Yellow**: Data 1-5 minutes old
- **Red**: Data > 5 minutes old

**Display Locations**:
- Overview page: "Last updated: X seconds ago"
- Barn detail: Per-sensor "Last updated" timestamps
- Device detail: "Last seen: X minutes ago"

---

## Media Retention & Permissions

### Image Access
**Storage**: Images stored in S3-compatible storage (edge or cloud)  
**Access**: Images accessed via presigned URLs (time-limited, typically 15 minutes)

**Permissions**:
- **Default**: Users can view session metadata but NOT images
- **Image access**: Requires explicit permission (role-based or tenant policy)
- **Audit**: All image access is logged (who viewed what image, when)

**Display**:
- **With permission**: Show image thumbnails in session detail
- **Without permission**: Show "Image access restricted" placeholder
- **Expired URL**: Regenerate presigned URL on-demand

---

### Media Retention
**Retention Policy**:
- **Edge**: 30-90 days (configurable via `MEDIA_RETENTION_DAYS`)
- **Cloud**: Long-term retention (if `cloud-media-store` enabled)
- **Archive**: Older images may be archived to cold storage

**Display**:
- Show "Image archived" indicator if image is in cold storage
- Show "Image unavailable" if image has been deleted per retention policy

---

## Data Aggregation Windows

### Supported Windows
- **None**: Raw data points (no aggregation)
- **1m**: 1-minute aggregation (average)
- **5m**: 5-minute aggregation (average)
- **15m**: 15-minute aggregation (average)
- **1h**: 1-hour aggregation (average)
- **1d**: 1-day aggregation (average)

### Aggregation Rules
- **Average**: Mean value for numeric metrics
- **Sum**: Sum for cumulative metrics (feed intake)
- **Count**: Count for event metrics (session count)
- **Min/Max**: Min/Max for range metrics

### Default Windows
- **Real-time views**: No aggregation (raw data)
- **Trend views**: 1h aggregation (default)
- **Historical views**: 1d aggregation (for long time ranges)

---

## Data Export Format

### Supported Formats
- **CSV**: Comma-separated values (for Excel compatibility)
- **JSON**: JSON array of objects (for programmatic access)
- **Parquet**: Columnar format (for data analysis tools)

### Export Structure
```json
{
  "export_id": "uuid",
  "exported_at": "2025-12-20T10:00:00Z",
  "data_type": "telemetry",
  "time_range": {
    "start": "2025-12-13T00:00:00Z",
    "end": "2025-12-20T00:00:00Z"
  },
  "filters": {
    "tenant_id": "uuid",
    "farm_id": "uuid",
    "barn_id": "uuid",
    "metric_types": ["temperature", "humidity"]
  },
  "format": "csv",
  "download_url": "https://...",
  "expires_at": "2025-12-21T10:00:00Z"
}
```

---

## Related Documentation

- [BFF API Contracts](04-bff-api-contracts.md): API endpoints for data access
- [KPI & Metrics Definitions](05-kpi-metrics-definitions.md): Computation formulas
- [Multi-Tenant & RBAC](06-multi-tenant-and-rbac.md): Context and ID validation

