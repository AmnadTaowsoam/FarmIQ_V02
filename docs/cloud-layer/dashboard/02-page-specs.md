# Dashboard Page Specifications

**Purpose**: Detailed specifications for all dashboard pages including goals, KPIs, filters, widgets, permissions, and states.  
**Scope**: Complete page-by-page breakdown of the FarmIQ Dashboard.  
**Owner**: FarmIQ Frontend Team  
**Last updated**: 2025-01-20  

---

## Page Specification Template

Each page specification includes:
- **Goal**: What user questions does this page answer?
- **Primary KPIs**: Key metrics displayed
- **Filters**: Available filter options
- **Widgets/Charts/Tables**: UI components and their data
- **Drill-down links**: Navigation to related pages
- **Empty states**: What to show when no data
- **Error states**: Error handling
- **Loading states**: Loading indicators
- **Permissions**: Role-based access
- **Data freshness**: Expected data latency

---

## 1. Login / Access

### Goal
- Authenticate users and establish session
- Redirect to appropriate context after login

### Primary KPIs
- None (authentication page)

### Filters
- None

### Widgets
- **Login form**: Email/password fields
- **Remember me**: Checkbox (optional)
- **Forgot password**: Link
- **Error message**: Display authentication errors

### Drill-down links
- After successful login: Redirect to `/overview` or `/select-context`

### Empty states
- N/A

### Error states
- **401 Unauthorized**: Show "Invalid credentials" message
- **403 Forbidden**: Show "Account disabled" message
- **Network error**: Show "Connection failed, please retry"

### Loading states
- Show spinner on submit button during authentication

### Permissions
- Public (no authentication required)

### Data freshness
- N/A

---

## 2. Tenant/Farm/Barn Selection (Context)

### Goal
- Allow user to select active context (tenant, farm, barn)
- Validate user has access to selected context

### Primary KPIs
- None (selection page)

### Filters
- **Tenant dropdown**: List of tenants user has access to
- **Farm dropdown**: Filtered by selected tenant
- **Barn dropdown**: Filtered by selected farm

### Widgets
- **Context selector**: Cascading dropdowns (Tenant → Farm → Barn)
- **Recent selections**: Show last 5 selected contexts (from localStorage)
- **Quick access**: Show favorite contexts (if implemented)

### Drill-down links
- After selection: Navigate to `/overview` with context in URL params

### Empty states
- **No tenants**: Show "No tenants available. Contact administrator."
- **No farms**: Show "No farms in this tenant."
- **No barns**: Show "No barns in this farm."

### Error states
- **403 Forbidden**: Show "You do not have access to this context"
- **Network error**: Show "Failed to load context. Please retry."

### Loading states
- Show skeleton loaders while fetching tenant/farm/barn lists

### Permissions
- All authenticated users

### Data freshness
- Context data cached for 5 minutes (registry data changes infrequently)

---

## 3. Overview (Executive + Ops)

### Goal
- Provide high-level view of farm operations
- Show critical alerts and key metrics at a glance

### Primary KPIs
- **Total farms**: Count of farms in tenant
- **Total barns**: Count of barns in tenant
- **Active devices**: Count of devices with recent telemetry (< 5 min)
- **Critical alerts**: Count of unacknowledged critical alerts
- **Avg weight (today)**: Average weight across all active batches
- **FCR (7-day avg)**: Average Feed Conversion Ratio over last 7 days

### Filters
- **Time range**: Last 24 hours, 7 days, 30 days (default: 7 days)
- **Farm**: Multi-select farm filter (if tenant context)
- **Alert severity**: Critical, Warning, Info

### Widgets
- **KPI cards**: 6-8 key metrics (as listed above)
- **Alert summary**: List of top 5 critical alerts
- **Farm status map**: Visual map showing farm locations and status (if available)
- **Recent activity**: Timeline of recent events (sessions, alerts, feed events)
- **Weight trend chart**: Line chart showing average weight over time (last 7 days)
- **Sensor status matrix**: Mini matrix showing latest sensor readings (temperature, humidity)

### Drill-down links
- **Farms count**: → `/farms`
- **Barns count**: → `/barns`
- **Devices count**: → `/devices`
- **Alerts**: → `/alerts`
- **Weight trend**: → `/weighvision/analytics`
- **Sensor status**: → `/sensors/matrix`

### Empty states
- **No data**: Show "No data available for selected context. Select a tenant/farm/barn."
- **No alerts**: Show "No active alerts. All systems operational."

### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show "Unable to load overview. Please retry." with retry button

### Loading states
- Show skeleton loaders for KPI cards and charts
- Show spinner for initial load

### Permissions
- All authenticated users

### Data freshness
- Poll every 60 seconds
- Show "Last updated: X seconds ago" indicator

---

## 4. Barn Overview (Ops Cockpit)

### Goal
- Provide detailed operational view of a specific barn
- Show real-time sensor data, device status, and recent activity

### Primary KPIs
- **Current temperature**: Latest temperature reading
- **Current humidity**: Latest humidity reading
- **Active devices**: Count of devices with recent data
- **Uptime %**: Device uptime percentage (last 24 hours)
- **Last session**: Time since last WeighVision session
- **Feed intake (today)**: Total feed consumed today

### Filters
- **Time range**: Last hour, 6 hours, 24 hours (default: 24 hours)
- **Device**: Multi-select device filter
- **Metric**: Temperature, Humidity, Weight, etc.

### Widgets
- **Sensor gauge cards**: Current temperature, humidity, weight (large display)
- **Device status list**: Table of devices with status, last-seen, uptime %
- **Telemetry timeline**: Line chart showing sensor readings over time
- **Recent sessions**: List of last 10 WeighVision sessions
- **Alerts panel**: Active alerts for this barn
- **Feed intake chart**: Bar chart showing daily feed intake (last 7 days)

### Drill-down links
- **Device**: → `/devices/:deviceId`
- **Session**: → `/weighvision/sessions/:sessionId`
- **Telemetry**: → `/telemetry?barn_id=...`
- **Alerts**: → `/alerts?barn_id=...`

### Empty states
- **No devices**: Show "No devices configured for this barn. Contact administrator."
- **No telemetry**: Show "No telemetry data available. Check device connectivity."

### Error states
- **404 Not Found**: Show "Barn not found" with link back to barns list
- **403 Forbidden**: Show "You do not have access to this barn"

### Loading states
- Show skeleton loaders for gauge cards and charts

### Permissions
- All authenticated users (view), Farm Manager+ (acknowledge alerts)

### Data freshness
- Poll every 30 seconds
- Show "Last updated: X seconds ago" with color coding (green < 1 min, yellow < 5 min, red > 5 min)

---

## 5. Farms List + Farm Detail

### Farms List

#### Goal
- Show all farms user has access to
- Provide quick access to farm details

#### Primary KPIs
- **Total farms**: Count displayed in header
- **Active farms**: Count of farms with recent activity (< 24 hours)

#### Filters
- **Search**: Text search by farm name
- **Status**: Active, Inactive, All
- **Sort**: Name, Created date, Last activity

#### Widgets
- **Farms table**: Columns:
  - Name
  - Location
  - Barn count
  - Device count
  - Last activity (timestamp)
  - Status badge
  - Actions (view, edit if permitted)

#### Drill-down links
- **Farm name**: → `/farms/:farmId`
- **Barn count**: → `/barns?farm_id=...`

#### Empty states
- **No farms**: Show "No farms available. Create your first farm." (if user has create permission)

#### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

#### Loading states
- Show skeleton table rows

#### Permissions
- All authenticated users (view), Tenant Admin (create/edit)

#### Data freshness
- Cache for 5 minutes (registry data)

---

### Farm Detail

#### Goal
- Show comprehensive information about a specific farm
- Display farm-level aggregates and statistics

#### Primary KPIs
- **Total barns**: Count of barns in farm
- **Total devices**: Count of devices in farm
- **Avg weight (today)**: Average weight across all barns
- **FCR (7-day avg)**: Average FCR across all barns
- **Active alerts**: Count of unacknowledged alerts

#### Filters
- **Time range**: Last 7 days, 30 days, 90 days (default: 7 days)
- **Barn**: Multi-select barn filter

#### Widgets
- **Farm info card**: Name, location, created date, status
- **Barns list**: Table/grid of barns with key metrics
- **Weight trend chart**: Average weight over time (aggregated across barns)
- **FCR trend chart**: FCR over time
- **Device status summary**: Pie chart showing device status distribution
- **Alerts summary**: List of recent alerts

#### Drill-down links
- **Barn**: → `/barns/:barnId`
- **Device**: → `/devices/:deviceId`
- **Weight trend**: → `/weighvision/analytics?farm_id=...`
- **Alerts**: → `/alerts?farm_id=...`

#### Empty states
- **No barns**: Show "No barns in this farm. Add a barn to get started."

#### Error states
- **404 Not Found**: Show "Farm not found" with link back to farms list
- **403 Forbidden**: Show "You do not have access to this farm"

#### Loading states
- Show skeleton loaders for charts and tables

#### Permissions
- All authenticated users (view), Tenant Admin (edit)

#### Data freshness
- Poll every 60 seconds for real-time metrics

---

## 6. Barns List + Barn Detail

### Barns List

#### Goal
- Show all barns user has access to (filtered by context)
- Provide quick access to barn details

#### Primary KPIs
- **Total barns**: Count displayed in header
- **Active barns**: Count of barns with recent activity

#### Filters
- **Farm**: Filter by farm (if tenant context)
- **Search**: Text search by barn name
- **Status**: Active, Inactive, All
- **Sort**: Name, Farm, Last activity

#### Widgets
- **Barns table**: Columns:
  - Name
  - Farm
  - Device count
  - Current temperature (latest)
  - Current humidity (latest)
  - Last activity
  - Status badge
  - Actions (view, edit if permitted)

#### Drill-down links
- **Barn name**: → `/barns/:barnId`
- **Farm name**: → `/farms/:farmId`

#### Empty states
- **No barns**: Show "No barns available. Create your first barn." (if user has create permission)

#### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

#### Loading states
- Show skeleton table rows

#### Permissions
- All authenticated users (view), Tenant Admin/Farm Manager (create/edit)

#### Data freshness
- Cache for 5 minutes (registry data), real-time sensor data polled separately

---

### Barn Detail

#### Goal
- Show comprehensive information about a specific barn
- Display real-time sensor data, device status, and operational metrics

#### Primary KPIs
- **Current temperature**: Latest temperature reading
- **Current humidity**: Latest humidity reading
- **Active devices**: Count of devices with recent data
- **Uptime %**: Device uptime percentage
- **Last session**: Time since last WeighVision session
- **Feed intake (today)**: Total feed consumed today

#### Filters
- **Time range**: Last hour, 6 hours, 24 hours, 7 days (default: 24 hours)
- **Device**: Multi-select device filter
- **Batch**: Filter by batch/species

#### Widgets
- **Sensor gauge cards**: Current temperature, humidity, weight
- **Device status list**: Table of devices with status, last-seen, uptime %
- **Telemetry timeline**: Line chart showing sensor readings over time
- **Recent sessions**: List of last 10 WeighVision sessions
- **Alerts panel**: Active alerts for this barn
- **Feed intake chart**: Bar chart showing daily feed intake
- **Weight distribution**: Histogram showing weight distribution (if available)

#### Drill-down links
- **Device**: → `/devices/:deviceId`
- **Session**: → `/weighvision/sessions/:sessionId`
- **Telemetry**: → `/telemetry?barn_id=...`
- **Alerts**: → `/alerts?barn_id=...`
- **Weight distribution**: → `/weighvision/distribution?barn_id=...`

#### Empty states
- **No devices**: Show "No devices configured. Add devices to start monitoring."
- **No telemetry**: Show "No telemetry data. Check device connectivity."

#### Error states
- **404 Not Found**: Show "Barn not found" with link back to barns list
- **403 Forbidden**: Show "You do not have access to this barn"

#### Loading states
- Show skeleton loaders for gauge cards and charts

#### Permissions
- All authenticated users (view), Farm Manager+ (acknowledge alerts, edit thresholds)

#### Data freshness
- Poll every 30 seconds
- Show "Last updated: X seconds ago" with color coding

---

## 7. Devices List + Device Detail

### Devices List

#### Goal
- Show all devices user has access to (filtered by context)
- Display device status and health at a glance

#### Primary KPIs
- **Total devices**: Count displayed in header
- **Online devices**: Count of devices with recent telemetry (< 5 min)
- **Offline devices**: Count of devices without recent telemetry (> 5 min)

#### Filters
- **Farm**: Filter by farm
- **Barn**: Filter by barn
- **Device type**: Sensor gateway, WeighVision, All
- **Status**: Online, Offline, Error, All
- **Search**: Text search by device name/serial

#### Widgets
- **Devices table**: Columns:
  - Name/Serial
  - Type
  - Farm
  - Barn
  - Status badge (Online/Offline/Error)
  - Last seen (timestamp)
  - Uptime % (last 24 hours)
  - Actions (view, configure if permitted)

#### Drill-down links
- **Device name**: → `/devices/:deviceId`

#### Empty states
- **No devices**: Show "No devices available. Onboard devices to start monitoring."

#### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

#### Loading states
- Show skeleton table rows

#### Permissions
- All authenticated users (view), Tenant Admin (onboard/configure)

#### Data freshness
- Poll every 60 seconds for device status

---

### Device Detail

#### Goal
- Show comprehensive information about a specific device
- Display device health, telemetry history, and configuration

#### Primary KPIs
- **Status**: Online/Offline/Error
- **Uptime %**: Device uptime (last 24 hours, 7 days, 30 days)
- **Last seen**: Timestamp of last telemetry
- **Telemetry count (today)**: Number of readings received today

#### Filters
- **Time range**: Last hour, 6 hours, 24 hours, 7 days (default: 24 hours)
- **Metric**: Temperature, Humidity, Weight, etc.

#### Widgets
- **Device info card**: Name, serial, type, farm, barn, status, firmware version
- **Status timeline**: Chart showing online/offline periods over time
- **Telemetry chart**: Line chart showing metric values over time
- **Latest readings table**: Table of last 20 telemetry readings
- **Configuration panel**: Device configuration (if user has edit permission)
- **Alerts panel**: Active alerts for this device

#### Drill-down links
- **Farm**: → `/farms/:farmId`
- **Barn**: → `/barns/:barnId`
- **Telemetry**: → `/telemetry?device_id=...`
- **Alerts**: → `/alerts?device_id=...`

#### Empty states
- **No telemetry**: Show "No telemetry data available. Device may be offline."

#### Error states
- **404 Not Found**: Show "Device not found" with link back to devices list
- **403 Forbidden**: Show "You do not have access to this device"

#### Loading states
- Show skeleton loaders for charts and tables

#### Permissions
- All authenticated users (view), Tenant Admin (configure)

#### Data freshness
- Poll every 30 seconds for device status and latest telemetry

---

## 8. Telemetry Explorer

### Goal
- Allow users to explore telemetry data with flexible filtering and aggregation
- Compare multiple metrics and devices

### Primary KPIs
- **Data points**: Count of data points in selected time range
- **Devices**: Count of devices contributing data
- **Coverage %**: Percentage of expected data points received

### Filters
- **Time range**: Custom date range picker (default: Last 7 days)
- **Farm**: Multi-select farm filter
- **Barn**: Multi-select barn filter
- **Device**: Multi-select device filter
- **Metric**: Multi-select metric filter (Temperature, Humidity, Weight, etc.)
- **Aggregation**: None, 1m, 5m, 15m, 1h, 1d
- **Group by**: Device, Barn, Farm

### Widgets
- **Time-series chart**: Multi-line chart showing selected metrics over time
- **Data table**: Table of raw/aggregated data points (exportable)
- **Statistics panel**: Min, Max, Avg, StdDev for selected metrics
- **Coverage heatmap**: Calendar heatmap showing data coverage by day

### Drill-down links
- **Device**: → `/devices/:deviceId`
- **Barn**: → `/barns/:barnId`

### Empty states
- **No data**: Show "No telemetry data for selected filters. Adjust filters or select a different time range."

### Error states
- **400 Bad Request**: Show "Invalid filter parameters" with details
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton chart and table
- Show progress indicator for large time ranges

### Permissions
- All authenticated users

### Data freshness
- Real-time data (poll every 60 seconds if viewing recent data)
- Historical data cached for 5 minutes

---

## 9. WeighVision Sessions List

### Goal
- Show all WeighVision sessions (filtered by context)
- Provide quick access to session details

### Primary KPIs
- **Total sessions**: Count displayed in header
- **Sessions (today)**: Count of sessions today
- **Avg weight (today)**: Average weight across sessions today

### Filters
- **Farm**: Filter by farm
- **Barn**: Filter by barn
- **Station**: Filter by station
- **Batch**: Filter by batch/species
- **Status**: Created, Finalized, Cancelled, All
- **Date range**: Custom date range picker
- **Search**: Text search by session ID

### Widgets
- **Sessions table**: Columns:
  - Session ID
  - Farm
  - Barn
  - Station
  - Batch
  - Start time
  - End time
  - Initial weight (kg)
  - Final weight (kg)
  - Image count
  - Status badge
  - Actions (view)

### Drill-down links
- **Session ID**: → `/weighvision/sessions/:sessionId`

### Empty states
- **No sessions**: Show "No WeighVision sessions found. Sessions will appear here when devices capture data."

### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton table rows

### Permissions
- All authenticated users

### Data freshness
- Poll every 60 seconds for new sessions
- Show "Last updated: X seconds ago"

---

## 10. WeighVision Session Detail

### Goal
- Show comprehensive information about a specific WeighVision session
- Display images, predictions, confidence scores, and outliers

### Primary KPIs
- **Initial weight**: First weight measurement (kg)
- **Final weight**: Last weight measurement (kg)
- **Weight change**: Difference between final and initial (kg)
- **Image count**: Number of images captured
- **Avg confidence**: Average prediction confidence score
- **Outliers**: Count of outlier predictions

### Filters
- **Image filter**: Show all, outliers only, high confidence only

### Widgets
- **Session info card**: Session ID, farm, barn, station, batch, start/end time, status
- **Weight timeline**: Line chart showing weight measurements over time
- **Image gallery**: Grid of image thumbnails (if user has image access permission)
  - Each thumbnail shows: timestamp, predicted weight, confidence score, outlier indicator
- **Prediction table**: Table of all predictions with:
  - Image ID
  - Timestamp
  - Predicted weight (kg)
  - Confidence score
  - Size proxy (if available)
  - Outlier flag
- **Statistics panel**: Min, Max, Avg, StdDev of predictions
- **Outlier analysis**: List of outlier predictions with reasons

### Drill-down links
- **Farm**: → `/farms/:farmId`
- **Barn**: → `/barns/:barnId`
- **Station**: → `/stations/:stationId` (if implemented)
- **Batch**: Filter by batch in other pages

### Empty states
- **No images**: Show "No images available for this session." (if user lacks image access)
- **No predictions**: Show "No predictions available. Inference may be pending."

### Error states
- **404 Not Found**: Show "Session not found" with link back to sessions list
- **403 Forbidden**: Show "You do not have access to this session" or "You do not have permission to view images"

### Loading states
- Show skeleton loaders for image gallery and charts

### Permissions
- All authenticated users (view session metadata)
- **Image access**: Requires explicit permission (may be restricted by role or tenant policy)
- Farm Manager+ (acknowledge outliers, mark as reviewed)

### Data freshness
- Session data is historical (no polling needed)
- Show "Session finalized: X hours ago" or "Session in progress"

---

## 11. Weight Dashboard (Farm/Barn)

### Goal
- Show weight trends and statistics at farm or barn level
- Compare weight across batches and time periods

### Primary KPIs
- **Avg weight (today)**: Average weight today (kg)
- **Avg weight (7-day)**: Average weight over last 7 days (kg)
- **Weight gain (7-day)**: Average daily gain over last 7 days (kg/day)
- **Uniformity %**: Percentage of animals within target weight range
- **P10-P90 range**: Weight range covering 80% of animals

### Filters
- **Context**: Farm or Barn (from URL/context selector)
- **Batch**: Multi-select batch filter
- **Time range**: Last 7 days, 30 days, 90 days (default: 7 days)
- **Aggregation**: Daily, Weekly, Monthly

### Widgets
- **Weight trend chart**: Line chart showing average weight over time
- **Weight distribution histogram**: Histogram showing weight distribution (latest snapshot)
- **Box plot**: Box plot showing quartiles and outliers
- **Statistics table**: Min, Max, Avg, Median, StdDev, P10, P25, P50, P75, P90
- **Uniformity gauge**: Circular gauge showing % in target range
- **Comparison chart**: Compare weight trends across batches (if multiple batches)

### Drill-down links
- **Batch**: Filter by batch in other pages
- **Session**: → `/weighvision/sessions/:sessionId`
- **Distribution**: → `/weighvision/distribution?barn_id=...`

### Empty states
- **No weight data**: Show "No weight data available. WeighVision sessions will appear here."

### Error states
- **403 Forbidden**: Show "You do not have access to this context"
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton chart and statistics panel

### Permissions
- All authenticated users

### Data freshness
- Poll every 60 seconds for recent data
- Historical data cached for 5 minutes

---

## 12. Size Distribution

### Goal
- Show detailed weight/size distribution analysis
- Identify uniformity issues and outliers

### Primary KPIs
- **Uniformity %**: Percentage of animals within target weight range
- **CV (Coefficient of Variation)**: Standard deviation / mean (lower is better)
- **IQR (Interquartile Range)**: P75 - P25
- **Outlier %**: Percentage of outliers (outside P10-P90 range)

### Filters
- **Context**: Farm, Barn, or Batch
- **Time range**: Last 7 days, 30 days, 90 days (default: 7 days)
- **Target range**: Custom min/max weight range for uniformity calculation

### Widgets
- **Histogram**: Histogram showing weight distribution with target range overlay
- **Box plot**: Box plot with quartiles, median, and outliers
- **Percentile table**: Table showing P10, P25, P50, P75, P90, P95, P99
- **Uniformity chart**: Bar chart showing % in each weight band (e.g., < target, target, > target)
- **Outlier list**: Table of outlier predictions with reasons

### Drill-down links
- **Outlier**: → `/weighvision/sessions/:sessionId` (if outlier is from a session)
- **Batch**: Filter by batch in other pages

### Empty states
- **No data**: Show "No weight data available for distribution analysis."

### Error states
- **400 Bad Request**: Show "Invalid target range" if min > max
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton histogram and statistics

### Permissions
- All authenticated users

### Data freshness
- Historical data (no real-time polling needed)
- Cache for 5 minutes

---

## 13. Daily Feed Intake

### Goal
- Track daily feed consumption per barn/batch
- Compare planned vs actual feed intake

### Primary KPIs
- **Feed intake (today)**: Total feed consumed today (kg)
- **Feed intake (7-day avg)**: Average daily feed intake over last 7 days (kg)
- **Cumulative feed**: Total feed consumed since batch start (kg)
- **Plan vs Actual**: Difference between planned and actual feed (kg)

### Filters
- **Context**: Farm, Barn, or Batch
- **Time range**: Last 7 days, 30 days, 90 days (default: 7 days)
- **Batch**: Filter by batch/species

### Widgets
- **Daily feed chart**: Bar chart showing daily feed intake over time
- **Cumulative feed chart**: Line chart showing cumulative feed intake
- **Plan vs Actual chart**: Dual-line chart comparing planned vs actual feed
- **Feed intake table**: Table of daily feed intake with plan/actual/difference
- **Statistics panel**: Total, Average, Min, Max feed intake

### Drill-down links
- **Batch**: Filter by batch in other pages
- **Barn**: → `/barns/:barnId`

### Empty states
- **No feed data**: Show "No feed intake data available. Feed data will appear here when recorded."

### Error states
- **403 Forbidden**: Show "You do not have access to this context"
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton charts and table

### Permissions
- Farm Manager+ (view), Tenant Admin (configure feed plans)

### Data freshness
- Poll every 60 seconds for today's data
- Historical data cached for 5 minutes

---

## 14. FCR & Forecast

### Goal
- Calculate and visualize Feed Conversion Ratio (FCR)
- Forecast market weight ETA and FCR trends

### Primary KPIs
- **FCR (today)**: Feed Conversion Ratio today (feed consumed / weight gain)
- **FCR (7-day avg)**: Average FCR over last 7 days
- **ADG (Average Daily Gain)**: Average daily weight gain (kg/day)
- **ETA Market Weight**: Predicted days until reaching target market weight
- **Predicted FCR**: Forecasted FCR at market weight

### Filters
- **Context**: Farm, Barn, or Batch
- **Time range**: Last 7 days, 30 days, 90 days (default: 7 days)
- **Batch**: Filter by batch/species
- **Target weight**: Custom target market weight (kg)

### Widgets
- **FCR trend chart**: Line chart showing FCR over time
- **ADG trend chart**: Line chart showing Average Daily Gain over time
- **Forecast chart**: Dual-axis chart showing:
  - Historical weight (line)
  - Forecasted weight (dashed line)
  - Target market weight (horizontal line)
- **FCR vs ADG scatter**: Scatter plot showing relationship between FCR and ADG
- **Forecast table**: Table showing:
  - Current weight
  - Target weight
  - Current ADG
  - Predicted days to target
  - Predicted FCR at target
- **Confidence bands**: Show prediction uncertainty (if available)

### Drill-down links
- **Batch**: Filter by batch in other pages
- **Weight data**: → `/weighvision/analytics`
- **Feed data**: → `/feeding/daily`

### Empty states
- **No data**: Show "Insufficient data for FCR calculation. Need both feed and weight data."

### Error states
- **400 Bad Request**: Show "Invalid target weight" if target < current weight
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton charts and forecast panel

### Permissions
- Farm Manager+ (view), Tenant Admin (configure target weights)

### Data freshness
- Poll every 60 seconds for recent data
- Forecast computation may take 2-5 seconds (show loading indicator)

---

## 15. Sensor Matrix (Barn)

### Goal
- Show latest sensor readings for all devices in a barn
- Provide quick status overview with mini trends

### Primary KPIs
- **Devices online**: Count of devices with recent data
- **Devices offline**: Count of devices without recent data
- **Anomalies**: Count of sensor readings outside normal range

### Filters
- **Barn**: Select barn (required)
- **Device type**: Sensor gateway, WeighVision, All
- **Metric**: Temperature, Humidity, Weight, etc.

### Widgets
- **Sensor matrix grid**: Grid of sensor cards, each showing:
  - Device name
  - Latest reading (large number)
  - Unit
  - Status badge (Normal/Warning/Critical)
  - Mini trend (sparkline chart)
  - Last updated timestamp
- **Status legend**: Color coding for Normal/Warning/Critical ranges
- **Device status summary**: Pie chart showing device status distribution

### Drill-down links
- **Device card**: → `/devices/:deviceId`
- **Metric**: → `/sensors/trends?metric=...&barn_id=...`

### Empty states
- **No devices**: Show "No devices configured for this barn."
- **No data**: Show "No sensor data available. Check device connectivity."

### Error states
- **403 Forbidden**: Show "You do not have access to this barn"
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton grid of sensor cards

### Permissions
- All authenticated users

### Data freshness
- Poll every 30 seconds
- Show "Last updated: X seconds ago" for each sensor card

---

## 16. Sensor Trends & Correlation

### Goal
- Compare multiple sensor metrics over time
- Identify correlations and relationships

### Primary KPIs
- **Correlation coefficient**: Pearson correlation between selected metrics
- **Data coverage**: Percentage of expected data points received

### Filters
- **Context**: Farm, Barn, or Device
- **Time range**: Custom date range (default: Last 7 days)
- **Metrics**: Multi-select metrics (Temperature, Humidity, Weight, etc.)
- **Devices**: Multi-select devices (if barn/farm context)
- **Aggregation**: None, 1m, 5m, 15m, 1h, 1d

### Widgets
- **Multi-metric chart**: Multi-line chart showing selected metrics over time (dual Y-axis if needed)
- **Correlation matrix**: Heatmap showing correlation coefficients between metrics
- **Scatter plot**: Scatter plot showing relationship between two selected metrics
- **Statistics table**: Min, Max, Avg, StdDev for each metric
- **Correlation insights**: Text description of correlations (e.g., "Temperature and humidity are strongly correlated (r=0.85)")

### Drill-down links
- **Device**: → `/devices/:deviceId`
- **Barn**: → `/barns/:barnId`
- **Metric**: → `/telemetry?metric=...`

### Empty states
- **No data**: Show "No sensor data for selected filters."
- **Insufficient data**: Show "Insufficient data for correlation analysis. Select a longer time range."

### Error states
- **400 Bad Request**: Show "Invalid metric combination" if metrics are incompatible
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton charts and correlation matrix

### Permissions
- All authenticated users

### Data freshness
- Real-time data (poll every 60 seconds if viewing recent data)
- Historical data cached for 5 minutes
- Correlation computation may take 2-5 seconds (show loading indicator)

---

## 17. Anomalies & Early Warning

### Goal
- Show detected anomalies and early warnings
- Help users identify issues before they become critical

### Primary KPIs
- **Active anomalies**: Count of unacknowledged anomalies
- **Critical anomalies**: Count of critical-severity anomalies
- **Anomaly rate**: Percentage of readings flagged as anomalies (last 24 hours)

### Filters
- **Context**: Farm, Barn, Device, or All
- **Severity**: Critical, Warning, Info, All
- **Status**: Active, Acknowledged, Resolved, All
- **Type**: Temperature, Humidity, Weight, Feed, All
- **Time range**: Last 24 hours, 7 days, 30 days (default: 24 hours)

### Widgets
- **Anomalies timeline**: Timeline chart showing anomalies over time (color-coded by severity)
- **Anomalies list**: Table of anomalies with:
  - Timestamp
  - Type
  - Severity badge
  - Context (Farm/Barn/Device)
  - Description
  - Status
  - Actions (acknowledge, resolve if permitted)
- **Severity distribution**: Pie chart showing anomaly count by severity
- **Anomaly detail panel**: Expanded view showing:
  - Anomaly description
  - Affected metrics/charts
  - Historical context
  - Recommended actions

### Drill-down links
- **Anomaly**: Expand to show detail panel
- **Device**: → `/devices/:deviceId`
- **Barn**: → `/barns/:barnId`
- **Telemetry**: → `/telemetry` with anomaly time range pre-selected

### Empty states
- **No anomalies**: Show "No anomalies detected. All systems operating normally."

### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton timeline and table

### Permissions
- All authenticated users (view), Farm Manager+ (acknowledge, resolve)

### Data freshness
- Poll every 60 seconds for new anomalies
- Show "Last updated: X seconds ago"

---

## 18. Recommendations (AI Coach)

### Goal
- Provide AI-driven actionable recommendations
- Help users optimize farm operations

### Primary KPIs
- **Active recommendations**: Count of unacknowledged recommendations
- **High priority**: Count of high-priority recommendations
- **Implementation rate**: Percentage of recommendations implemented (last 30 days)

### Filters
- **Context**: Farm, Barn, or All
- **Priority**: High, Medium, Low, All
- **Status**: Active, Acknowledged, Implemented, Dismissed, All
- **Category**: Environment, Feeding, Health, Performance, All
- **Time range**: Last 7 days, 30 days, 90 days (default: 30 days)

### Widgets
- **Recommendations list**: Cards showing:
  - Title
  - Priority badge
  - Category
  - Description
  - Reasoning (why this recommendation)
  - Expected impact
  - Status
  - Actions (acknowledge, implement, dismiss if permitted)
- **Impact summary**: Summary of expected benefits from implementing recommendations
- **Implementation timeline**: Timeline showing when recommendations were implemented and their impact

### Drill-down links
- **Recommendation**: Expand to show full details
- **Related data**: Link to relevant pages (e.g., sensor data, feed data)

### Empty states
- **No recommendations**: Show "No recommendations at this time. AI Coach will suggest actions when opportunities are identified."

### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton recommendation cards

### Permissions
- Farm Manager+ (view), Tenant Admin (configure recommendation rules)

### Data freshness
- Poll every 60 seconds for new recommendations
- Recommendations are computed asynchronously (may have 5-10 minute delay)

---

## 19. Scenario Planner (What-if)

### Goal
- Allow users to simulate "what-if" scenarios
- Predict impact of operational changes

### Primary KPIs
- **Predicted impact**: Estimated change in key metrics
- **Confidence**: Prediction confidence score

### Filters
- **Context**: Farm, Barn, or Batch (required)
- **Scenario type**: Feed adjustment, Environmental change, Operational change

### Widgets
- **Scenario input form**: Form to input scenario parameters:
  - Feed formula change (%)
  - Temperature adjustment (°C)
  - Humidity adjustment (%)
  - Other operational parameters
- **Baseline vs Scenario comparison**: Side-by-side comparison showing:
  - Current metrics (baseline)
  - Predicted metrics (scenario)
  - Difference (change)
- **Impact chart**: Chart showing predicted impact over time:
  - Weight trajectory
  - FCR trajectory
  - Feed consumption
- **Confidence indicators**: Show prediction uncertainty
- **Scenario history**: List of previous scenarios run

### Drill-down links
- **Related data**: Link to relevant pages (feed data, sensor data)

### Empty states
- **No scenarios**: Show "Run your first scenario to see predicted impacts."

### Error states
- **400 Bad Request**: Show "Invalid scenario parameters" with details
- **5xx errors**: Show error message with retry button

### Loading states
- Show "Computing scenario..." with progress indicator (may take 5-15 seconds)

### Permissions
- Farm Manager+ (view), Tenant Admin (configure scenario parameters)

### Data freshness
- Scenarios are computed on-demand (not cached)
- Show "Computed: X seconds ago" after computation

---

## 20. Alerts Center

### Goal
- Centralized view of all alerts and notifications
- Manage alert rules and acknowledgments

### Primary KPIs
- **Active alerts**: Count of unacknowledged alerts
- **Critical alerts**: Count of critical-severity alerts
- **Alert rate**: Alerts per hour (last 24 hours)

### Filters
- **Context**: Farm, Barn, Device, or All
- **Severity**: Critical, Warning, Info, All
- **Status**: Active, Acknowledged, Resolved, All
- **Type**: Temperature, Humidity, Weight, Feed, Device, System, All
- **Time range**: Last 24 hours, 7 days, 30 days (default: 24 hours)

### Widgets
- **Alerts list**: Table of alerts with:
  - Timestamp
  - Severity badge
  - Type
  - Context (Farm/Barn/Device)
  - Message
  - Status
  - Acknowledged by (if acknowledged)
  - Actions (acknowledge, resolve if permitted)
- **Alert timeline**: Timeline chart showing alerts over time
- **Severity distribution**: Pie chart showing alert count by severity
- **Alert rules panel** (MVP: view-only, future: manage rules):
  - List of alert rules
  - Rule conditions
  - Rule status (enabled/disabled)

### Drill-down links
- **Alert**: Expand to show full details
- **Device**: → `/devices/:deviceId`
- **Barn**: → `/barns/:barnId`
- **Related data**: Link to relevant pages

### Empty states
- **No alerts**: Show "No active alerts. All systems operating normally."

### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton table and timeline

### Permissions
- All authenticated users (view), Farm Manager+ (acknowledge), Tenant Admin (manage rules - future)

### Data freshness
- Poll every 60 seconds for new alerts
- Show "Last updated: X seconds ago"

---

## 21. Reports & Export

### Goal
- Generate KPI reports
- Export data for external analysis

### Primary KPIs
- **Report templates**: Count of available report templates
- **Exports (today)**: Count of data exports today

### Filters
- **Report type**: KPI Summary, Weight Analysis, FCR Report, Custom
- **Context**: Farm, Barn, Batch, or All
- **Time range**: Custom date range
- **Format**: PDF, CSV, Excel, JSON

### Widgets
- **Report templates**: List of report templates:
  - KPI Summary Report
  - Weight Analysis Report
  - FCR & Forecast Report
  - Sensor Health Report
  - Custom Report Builder (future)
- **Export options**: Form to configure export:
  - Data type (Telemetry, Sessions, Feed, All)
  - Context filters
  - Time range
  - Format (CSV, JSON, Parquet)
  - Columns to include
- **Export history**: Table of previous exports:
  - Export date
  - Data type
  - Time range
  - Format
  - Status
  - Download link (if available)

### Drill-down links
- **Report**: Generate and download report
- **Export**: Configure and download export

### Empty states
- **No exports**: Show "No exports yet. Create your first export."

### Error states
- **400 Bad Request**: Show "Invalid export parameters" with details
- **429 Too Many Requests**: Show "Too many exports. Please wait before requesting another export."
- **5xx errors**: Show error message with retry button

### Loading states
- Show "Generating report..." or "Preparing export..." with progress indicator
- Large exports may take 30-60 seconds

### Permissions
- Farm Manager+ (view reports, export data), Tenant Admin (full access)

### Data freshness
- Reports/exports are generated on-demand
- Show "Generated: X minutes ago" after generation

---

## 22. Data Quality & Coverage

### Goal
- Show data quality metrics and coverage gaps
- Help identify data collection issues

### Primary KPIs
- **Data coverage %**: Percentage of expected data points received
- **Missing data periods**: Count of time periods with missing data
- **Device uptime %**: Average device uptime across all devices

### Filters
- **Context**: Farm, Barn, Device, or All
- **Time range**: Last 24 hours, 7 days, 30 days (default: 7 days)
- **Metric**: Temperature, Humidity, Weight, Feed, All

### Widgets
- **Coverage heatmap**: Calendar heatmap showing data coverage by day/hour
- **Missing data timeline**: Timeline showing periods with missing data
- **Device uptime table**: Table showing:
  - Device name
  - Uptime % (last 24 hours, 7 days, 30 days)
  - Last seen timestamp
  - Missing data periods
- **Coverage statistics**: Min, Max, Avg coverage % across devices/metrics
- **Data freshness indicators**: Color-coded indicators showing data freshness

### Drill-down links
- **Device**: → `/devices/:deviceId`
- **Barn**: → `/barns/:barnId`
- **Missing data period**: → `/telemetry` with time range pre-selected

### Empty states
- **No data**: Show "No data quality metrics available."

### Error states
- **403 Forbidden**: Redirect to `/403`
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton heatmap and table

### Permissions
- Platform Admin, Tenant Admin (limited)

### Data freshness
- Poll every 60 seconds
- Coverage metrics computed on-demand (may take 5-10 seconds)

---

## 23. Ops Health

### Goal
- Show operational health metrics (ops-facing)
- Monitor sync status, ingestion errors, and system health

### Primary KPIs
- **Sync backlog**: Count of pending events in sync queue
- **Ingestion errors**: Count of ingestion errors (last 24 hours)
- **Edge connectivity**: Count of edge clusters with active sync
- **API latency (P95)**: 95th percentile API response time

### Filters
- **Context**: Tenant, Farm, Edge cluster, or All
- **Time range**: Last 24 hours, 7 days, 30 days (default: 24 hours)
- **Error type**: Sync errors, Ingestion errors, API errors, All

### Widgets
- **Sync status dashboard**: Overview of sync health:
  - Sync backlog chart (over time)
  - Edge cluster status (online/offline)
  - Sync success rate
- **Ingestion errors table**: Table of ingestion errors:
  - Timestamp
  - Error type
  - Context (Tenant/Farm)
  - Error message
  - Retry count
- **API health metrics**: Charts showing:
  - Request rate
  - Error rate
  - Latency (P50, P95, P99)
- **Device status summary**: Summary of device connectivity issues

### Drill-down links
- **Sync backlog**: → `/ops/sync-monitor` (if implemented)
- **Error**: Expand to show error details
- **Edge cluster**: → Edge cluster detail (if implemented)

### Empty states
- **No errors**: Show "No operational issues detected. All systems healthy."

### Error states
- **403 Forbidden**: Redirect to `/403` (ops pages are admin-only)
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton dashboard and tables

### Permissions
- Platform Admin (full access), Tenant Admin (tenant-scoped ops data)

### Data freshness
- Poll every 30 seconds for real-time metrics
- Show "Last updated: X seconds ago"

---

## 24. Admin: Tenant Registry

### Goal
- Manage tenant registry (platform_admin only)
- Create, edit, and manage tenants

### Primary KPIs
- **Total tenants**: Count of tenants in system
- **Active tenants**: Count of tenants with recent activity (< 30 days)
- **Tenants (today)**: Count of tenants created today

### Filters
- **Status**: Active, Inactive, Suspended, All
- **Search**: Text search by tenant name
- **Sort**: Name, Created date, Last activity

### Widgets
- **Tenants table**: Table of tenants with:
  - Name
  - Status badge
  - Created date
  - Last activity
  - Farm count
  - User count
  - Actions (view, edit, suspend if permitted)
- **Tenant detail panel**: Expanded view showing:
  - Tenant info
  - Farms list
  - Users list
  - Billing info (if implemented)
  - Audit log

### Drill-down links
- **Tenant**: Expand to show detail panel
- **Farm**: → `/farms/:farmId` (if accessible)

### Empty states
- **No tenants**: Show "No tenants in system. Create your first tenant."

### Error states
- **403 Forbidden**: Redirect to `/403` (platform_admin only)
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton table

### Permissions
- Platform Admin only

### Data freshness
- Cache for 5 minutes (registry data changes infrequently)

---

## 25. Admin: Device Onboarding

### Goal
- Onboard new devices to the system
- Manage device configuration and provisioning

### Primary KPIs
- **Total devices**: Count of devices in system
- **Pending onboarding**: Count of devices pending onboarding
- **Devices (today)**: Count of devices onboarded today

### Filters
- **Status**: Pending, Active, Inactive, All
- **Device type**: Sensor gateway, WeighVision, All
- **Search**: Text search by device name/serial

### Widgets
- **Devices table**: Table of devices with:
  - Name/Serial
  - Type
  - Farm/Barn
  - Status badge
  - Onboarded date
  - Actions (view, edit, configure if permitted)
- **Onboarding form**: Form to onboard new device:
  - Device serial number
  - Device type
  - Farm/Barn assignment
  - Configuration parameters
- **Device configuration panel**: Panel to configure device settings

### Drill-down links
- **Device**: → `/devices/:deviceId`
- **Farm**: → `/farms/:farmId`

### Empty states
- **No devices**: Show "No devices onboarded. Onboard your first device."

### Error states
- **400 Bad Request**: Show "Invalid device configuration" with details
- **403 Forbidden**: Redirect to `/403` (admin only)
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton table and form

### Permissions
- Tenant Admin (tenant-scoped devices), Platform Admin (all devices)

### Data freshness
- Cache for 5 minutes (registry data)

---

## 26. Admin: Users & Roles (RBAC)

### Goal
- Manage users and roles within tenant
- Configure RBAC permissions

### Primary KPIs
- **Total users**: Count of users in tenant
- **Active users**: Count of users with recent activity (< 30 days)
- **Users by role**: Distribution of users across roles

### Filters
- **Role**: Platform Admin, Tenant Admin, Farm Manager, Operator, Viewer, All
- **Status**: Active, Inactive, All
- **Search**: Text search by name/email

### Widgets
- **Users table**: Table of users with:
  - Name
  - Email
  - Role badge
  - Status
  - Last login
  - Actions (view, edit, deactivate if permitted)
- **User detail panel**: Expanded view showing:
  - User info
  - Assigned roles
  - Permissions summary
  - Access history (if implemented)
- **Role management panel**: Panel to:
  - View role definitions
  - Assign roles to users
  - Configure custom permissions (future)

### Drill-down links
- **User**: Expand to show detail panel

### Empty states
- **No users**: Show "No users in tenant. Invite your first user."

### Error states
- **400 Bad Request**: Show "Invalid user data" with details
- **403 Forbidden**: Redirect to `/403` (admin only)
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton table and panels

### Permissions
- Tenant Admin (tenant-scoped users), Platform Admin (all users)

### Data freshness
- Cache for 5 minutes (user data changes infrequently)
- Show "Last updated: X minutes ago"

---

## 27. Admin: Audit Log

### Goal
- Show audit trail of admin actions
- Track who changed what and when

### Primary KPIs
- **Audit events (today)**: Count of audit events today
- **Events by type**: Distribution of events by type (Create, Update, Delete, etc.)
- **Events by user**: Top users by audit event count

### Filters
- **Event type**: Create, Update, Delete, Login, Logout, Permission Change, All
- **User**: Filter by user who performed action
- **Resource type**: Tenant, Farm, Barn, Device, User, Role, All
- **Time range**: Custom date range (default: Last 7 days)
- **Search**: Text search by resource name/ID

### Widgets
- **Audit log table**: Table of audit events with:
  - Timestamp
  - User (who performed action)
  - Event type
  - Resource type
  - Resource ID/Name
  - Action details (what changed)
  - IP address (if available)
- **Event timeline**: Timeline chart showing events over time
- **Event detail panel**: Expanded view showing:
  - Full event details
  - Before/after values (if update event)
  - Related resources

### Drill-down links
- **User**: Filter by user in audit log
- **Resource**: Navigate to resource detail page (if accessible)

### Empty states
- **No events**: Show "No audit events for selected filters."

### Error states
- **403 Forbidden**: Redirect to `/403` (admin only)
- **5xx errors**: Show error message with retry button

### Loading states
- Show skeleton table and timeline

### Permissions
- Tenant Admin (tenant-scoped audit log), Platform Admin (all audit logs)

### Data freshness
- Audit events are historical (no real-time polling needed)
- Cache for 1 minute (new events appear infrequently)

---

## Related Documentation

- [Information Architecture](01-information-architecture.md): Navigation and page grouping
- [BFF API Contracts](04-bff-api-contracts.md): API endpoints for each page
- [Multi-Tenant & RBAC](06-multi-tenant-and-rbac.md): Permission requirements
- [KPI & Metrics Definitions](05-kpi-metrics-definitions.md): KPI calculation formulas

