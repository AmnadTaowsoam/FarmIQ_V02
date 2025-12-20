# Acceptance Checklist

**Purpose**: Comprehensive checklist for testing and validating Dashboard pages, multi-tenant isolation, performance, security, and release readiness.  
**Scope**: Per-page checklists, cross-cutting requirements, and release criteria.  
**Owner**: FarmIQ QA Team  
**Last updated**: 2025-01-20  

---

## Per-Page Checklist Template

For each page, verify:
- [ ] **Renders**: Page loads and renders without errors
- [ ] **Loads data**: Data loads from BFF API
- [ ] **Handles empty**: Shows appropriate empty state when no data
- [ ] **Handles error**: Shows appropriate error state on API failure
- [ ] **Loading state**: Shows loading indicator while fetching data
- [ ] **Permissions**: Respects role-based permissions (hide/disable features user cannot access)
- [ ] **Context**: Respects tenant/farm/barn context (no cross-tenant leakage)
- [ ] **Deep linking**: Supports deep linking with context in URL params
- [ ] **Refresh**: Manual refresh button works
- [ ] **Polling**: Auto-refresh works (if applicable) and pauses when tab is hidden

---

## Page-Specific Checklists

### 1. Login / Access
- [ ] Login form validates email/password format
- [ ] Shows error on invalid credentials (401)
- [ ] Shows error on account disabled (403)
- [ ] Redirects to overview after successful login
- [ ] Stores access token securely (memory, not localStorage)
- [ ] Handles network errors gracefully

---

### 2. Context Selection
- [ ] Shows list of accessible tenants
- [ ] Filters farms by selected tenant
- [ ] Filters barns by selected farm
- [ ] Validates user has access to selected context
- [ ] Persists selected context in localStorage
- [ ] Deep links work with context in URL params
- [ ] Shows empty state when no tenants/farms/barns available

---

### 3. Overview
- [ ] Loads KPIs from BFF
- [ ] Shows "Last updated: X seconds ago" indicator
- [ ] Polls every 60 seconds
- [ ] Pauses polling when tab is hidden
- [ ] Shows empty state when no data
- [ ] Shows error state on API failure
- [ ] Drill-down links navigate correctly
- [ ] Respects tenant context (no cross-tenant data)

---

### 4. Barn Overview
- [ ] Loads sensor data from BFF
- [ ] Shows current temperature/humidity/weight
- [ ] Shows device status list
- [ ] Shows telemetry timeline chart
- [ ] Polls every 30 seconds
- [ ] Shows "Last updated" with color coding
- [ ] Shows empty state when no devices/data
- [ ] Drill-down links work (device, session, telemetry)

---

### 5. Farms List
- [ ] Loads farms from BFF
- [ ] Supports pagination (page, limit)
- [ ] Supports search (farm name)
- [ ] Supports filtering (status)
- [ ] Supports sorting (name, created date, last activity)
- [ ] Shows empty state when no farms
- [ ] Shows error state on API failure
- [ ] Farm name links to farm detail

---

### 6. Farm Detail
- [ ] Loads farm details from BFF
- [ ] Shows farm info card
- [ ] Shows barns list
- [ ] Shows weight trend chart
- [ ] Shows FCR trend chart
- [ ] Shows device status summary
- [ ] Shows alerts summary
- [ ] Polls every 60 seconds
- [ ] Shows 404 if farm not found or user lacks access

---

### 7. Devices List
- [ ] Loads devices from BFF
- [ ] Supports filtering (farm, barn, device type, status)
- [ ] Supports search (device name/serial)
- [ ] Shows device status badges (online/offline/error)
- [ ] Shows last seen timestamps
- [ ] Shows uptime percentages
- [ ] Polls every 60 seconds for device status
- [ ] Device name links to device detail

---

### 8. Device Detail
- [ ] Loads device details from BFF
- [ ] Shows device info card
- [ ] Shows status timeline chart
- [ ] Shows telemetry chart
- [ ] Shows latest readings table
- [ ] Shows configuration panel (if user has edit permission)
- [ ] Shows alerts panel
- [ ] Polls every 30 seconds
- [ ] Shows 404 if device not found or user lacks access

---

### 9. Telemetry Explorer
- [ ] Loads telemetry data from BFF
- [ ] Supports time range selection (custom date picker)
- [ ] Supports filtering (farm, barn, device, metric)
- [ ] Supports aggregation (none, 1m, 5m, 15m, 1h, 1d)
- [ ] Supports group by (device, barn, farm)
- [ ] Shows time-series chart (multi-line)
- [ ] Shows data table (exportable)
- [ ] Shows statistics panel (min, max, avg, stddev)
- [ ] Shows coverage heatmap
- [ ] Handles large time ranges (shows progress indicator)
- [ ] Shows empty state when no data

---

### 10. WeighVision Sessions List
- [ ] Loads sessions from BFF
- [ ] Supports filtering (farm, barn, station, batch, status, date range)
- [ ] Supports search (session ID)
- [ ] Shows session table with all required columns
- [ ] Polls every 60 seconds for new sessions
- [ ] Session ID links to session detail
- [ ] Shows empty state when no sessions

---

### 11. WeighVision Session Detail
- [ ] Loads session details from BFF
- [ ] Shows session info card
- [ ] Shows weight timeline chart
- [ ] Shows image gallery (if user has image access permission)
- [ ] Shows "Image access restricted" if user lacks permission
- [ ] Shows prediction table
- [ ] Shows statistics panel
- [ ] Shows outlier analysis
- [ ] Regenerates presigned URLs when expired
- [ ] Shows 404 if session not found or user lacks access

---

### 12. Weight Dashboard
- [ ] Loads weight analytics from BFF
- [ ] Shows weight trend chart
- [ ] Shows weight distribution histogram
- [ ] Shows box plot
- [ ] Shows statistics table (min, max, avg, median, percentiles)
- [ ] Shows uniformity gauge
- [ ] Supports batch filtering
- [ ] Supports time range selection
- [ ] Supports aggregation (daily, weekly, monthly)
- [ ] Polls every 60 seconds for recent data

---

### 13. Size Distribution
- [ ] Loads distribution data from BFF
- [ ] Shows histogram with target range overlay
- [ ] Shows box plot
- [ ] Shows percentile table
- [ ] Shows uniformity chart
- [ ] Shows outlier list
- [ ] Supports target range configuration (if user has permission)
- [ ] Shows empty state when no data

---

### 14. Daily Feed Intake
- [ ] Loads feed data from BFF
- [ ] Shows daily feed chart
- [ ] Shows cumulative feed chart
- [ ] Shows plan vs actual chart
- [ ] Shows feed intake table
- [ ] Shows statistics panel
- [ ] Supports batch filtering
- [ ] Supports time range selection
- [ ] Polls every 60 seconds for today's data
- [ ] Respects permissions (Farm Manager+ only)

---

### 15. FCR & Forecast
- [ ] Loads FCR data from BFF
- [ ] Shows FCR trend chart
- [ ] Shows ADG trend chart
- [ ] Shows forecast chart with confidence bands
- [ ] Shows FCR vs ADG scatter plot
- [ ] Shows forecast table
- [ ] Supports target weight configuration
- [ ] Shows loading indicator during forecast computation (5-15 seconds)
- [ ] Shows error if insufficient data for forecast

---

### 16. Sensor Matrix
- [ ] Loads latest sensor readings from BFF
- [ ] Shows sensor grid with gauge cards
- [ ] Shows mini trend (sparkline) for each sensor
- [ ] Shows status badges (normal/warning/critical)
- [ ] Shows "Last updated" timestamps
- [ ] Polls every 30 seconds
- [ ] Shows empty state when no devices/data
- [ ] Device card links to device detail

---

### 17. Sensor Trends & Correlation
- [ ] Loads sensor data from BFF
- [ ] Shows multi-metric chart (dual Y-axis if needed)
- [ ] Shows correlation matrix heatmap
- [ ] Shows scatter plot
- [ ] Shows statistics table
- [ ] Shows correlation insights (text description)
- [ ] Supports metric selection (multi-select)
- [ ] Supports time range selection
- [ ] Supports aggregation
- [ ] Shows loading indicator during correlation computation

---

### 18. Anomalies & Early Warning
- [ ] Loads anomalies from BFF
- [ ] Shows anomalies timeline chart
- [ ] Shows anomalies list table
- [ ] Shows severity distribution pie chart
- [ ] Shows anomaly detail panel (expandable)
- [ ] Supports filtering (severity, status, type, context, time range)
- [ ] Supports acknowledge action (if user has permission)
- [ ] Polls every 60 seconds for new anomalies
- [ ] Shows empty state when no anomalies

---

### 19. Recommendations (AI Coach)
- [ ] Loads recommendations from BFF
- [ ] Shows recommendations list (cards)
- [ ] Shows priority badges
- [ ] Shows category badges
- [ ] Shows expected impact
- [ ] Supports filtering (priority, status, category, context)
- [ ] Supports acknowledge/implement/dismiss actions (if user has permission)
- [ ] Polls every 60 seconds for new recommendations
- [ ] Shows empty state when no recommendations

---

### 20. Scenario Planner
- [ ] Loads scenario input form
- [ ] Validates scenario parameters
- [ ] Submits scenario request to BFF
- [ ] Shows "Computing scenario..." with progress indicator
- [ ] Shows baseline vs scenario comparison
- [ ] Shows impact chart
- [ ] Shows confidence indicators
- [ ] Shows scenario history
- [ ] Handles rate limiting (429 Too Many Requests)
- [ ] Shows error if invalid parameters

---

### 21. Alerts Center
- [ ] Loads alerts from BFF
- [ ] Shows alerts list table
- [ ] Shows alert timeline chart
- [ ] Shows severity distribution pie chart
- [ ] Supports filtering (severity, status, type, context, time range)
- [ ] Supports acknowledge action (if user has permission)
- [ ] Polls every 60 seconds for new alerts
- [ ] Shows empty state when no alerts

---

### 22. Reports & Export
- [ ] Shows report templates list
- [ ] Shows export configuration form
- [ ] Submits report/export request to BFF
- [ ] Shows "Generating..." or "Preparing..." status
- [ ] Polls for completion status
- [ ] Shows download link when ready
- [ ] Shows export history table
- [ ] Handles rate limiting (429 Too Many Requests)
- [ ] Respects permissions (Farm Manager+ for export)

---

### 23. Data Quality & Coverage
- [ ] Loads data quality metrics from BFF
- [ ] Shows coverage heatmap
- [ ] Shows missing data timeline
- [ ] Shows device uptime table
- [ ] Shows coverage statistics
- [ ] Shows data freshness indicators
- [ ] Supports filtering (context, time range, metric)
- [ ] Shows loading indicator during computation (5-10 seconds)
- [ ] Respects permissions (Platform Admin, Tenant Admin only)

---

### 24. Ops Health
- [ ] Loads ops health metrics from BFF
- [ ] Shows sync status dashboard
- [ ] Shows sync backlog chart
- [ ] Shows edge cluster status
- [ ] Shows ingestion errors table
- [ ] Shows API health metrics
- [ ] Shows device status summary
- [ ] Polls every 30 seconds
- [ ] Respects permissions (Platform Admin, Tenant Admin only)

---

### 25. Admin: Tenant Registry
- [ ] Loads tenants from BFF
- [ ] Shows tenants table
- [ ] Supports create tenant (if platform_admin)
- [ ] Supports edit tenant (if platform_admin)
- [ ] Shows tenant detail panel (expandable)
- [ ] Respects permissions (Platform Admin only)
- [ ] Shows 403 if user lacks permission

---

### 26. Admin: Device Onboarding
- [ ] Loads devices from BFF
- [ ] Shows devices table
- [ ] Shows onboarding form
- [ ] Validates device configuration
- [ ] Submits onboarding request to BFF
- [ ] Shows success/error messages
- [ ] Respects permissions (Tenant Admin, Platform Admin)
- [ ] Shows 403 if user lacks permission

---

### 27. Admin: Users & Roles
- [ ] Loads users from BFF
- [ ] Shows users table
- [ ] Shows user detail panel (expandable)
- [ ] Shows role management panel
- [ ] Supports assign role (if admin)
- [ ] Supports deactivate user (if admin)
- [ ] Respects permissions (Tenant Admin, Platform Admin)
- [ ] Shows 403 if user lacks permission

---

### 28. Admin: Audit Log
- [ ] Loads audit log from BFF
- [ ] Shows audit log table
- [ ] Shows event timeline chart
- [ ] Supports filtering (event type, user, resource type, time range)
- [ ] Supports search
- [ ] Shows event detail panel (expandable)
- [ ] Respects permissions (Tenant Admin, Platform Admin)
- [ ] Shows 403 if user lacks permission

---

## Cross-Cutting Requirements

### Multi-Tenant Isolation
- [ ] **No cross-tenant data leakage**: User cannot access data from other tenants
- [ ] **Context validation**: BFF validates tenant context on every request
- [ ] **URL params**: Context included in URL params (not headers)
- [ ] **Deep linking**: Deep links preserve context and validate access
- [ ] **Error handling**: 403 Forbidden shown if user lacks access to context

**Test Cases**:
1. User A selects Tenant 1, verify cannot see Tenant 2 data
2. User A tries to access Tenant 2 URL directly, verify 403 error
3. User A switches to Tenant 2 (if has access), verify context updates correctly

---

### Performance Budgets

#### Initial Page Load
- [ ] **Target**: < 2 seconds (P95)
- [ ] **Measurement**: Time to first contentful paint (FCP)
- [ ] **Tools**: Lighthouse, Datadog RUM

#### Chart Responsiveness
- [ ] **Target**: < 500ms to render chart with data (last 7 days)
- [ ] **Measurement**: Time from data received to chart rendered
- [ ] **Tools**: Custom performance marks, Datadog RUM

#### API Latency
- [ ] **Target**: P95 < 500ms for simple queries, P95 < 2s for complex queries
- [ ] **Measurement**: API response time from BFF
- [ ] **Tools**: Datadog APM

---

### Security: RBAC Gates

#### Route Guards
- [ ] **Level 1**: Check `isAuthenticated`, redirect to `/login` if false
- [ ] **Level 2**: Check `hasRole`, redirect to `/403` if false
- [ ] **Level 3**: Check feature permission, hide/disable feature if false

#### Backend Validation
- [ ] **Backend MUST validate**: Client-side checks are UX only
- [ ] **Every API request**: Backend validates permissions
- [ ] **403 Forbidden**: Returned if user lacks permission

**Test Cases**:
1. Viewer tries to access admin page, verify 403 error
2. Operator tries to acknowledge alert, verify 403 error
3. Farm Manager tries to create farm, verify 403 error

---

### Security: Image Access

#### Permission Check
- [ ] **Default**: Users cannot view images (metadata only)
- [ ] **With permission**: Users can view images (presigned URLs)
- [ ] **Without permission**: Show "Image access restricted" placeholder

#### Audit Logging
- [ ] **All image access logged**: Who viewed what image, when
- [ ] **Presigned URL expiration**: URLs expire after 15 minutes
- [ ] **Regeneration**: Regenerate presigned URL on-demand

**Test Cases**:
1. Viewer tries to view session images, verify "Image access restricted"
2. Farm Manager with image permission views images, verify images load
3. Presigned URL expires, verify regeneration works

---

### Error Handling

#### Error States
- [ ] **401 Unauthorized**: Silent refresh → Retry → Logout
- [ ] **403 Forbidden**: Show "Access Denied" page
- [ ] **404 Not Found**: Show "Resource Not Found" page
- [ ] **5xx Server Error**: Show "Service Unavailable" with retry button and traceId

#### Retry Logic
- [ ] **Automatic retry**: Network failures, 502, 503, 504 (max 3 retries, exponential backoff)
- [ ] **No retry**: 400, 401, 403, 404 (do not retry logic errors)
- [ ] **Manual retry**: "Retry" button on error pages

---

### Data Freshness

#### Indicators
- [ ] **Display**: "Last updated: X seconds ago" on relevant pages
- [ ] **Color coding**: Green (< 1 min), Yellow (1-5 min), Red (> 5 min)
- [ ] **Polling**: Pages poll at appropriate intervals (30s, 60s)
- [ ] **Pause on hidden**: Polling pauses when tab is hidden

---

## Release Readiness Checklist

### Functional Requirements
- [ ] All MVP pages implemented and tested
- [ ] All BFF endpoints implemented and tested
- [ ] Multi-tenant isolation verified (no cross-tenant leakage)
- [ ] RBAC permissions enforced (frontend and backend)
- [ ] Error handling implemented (all error states)
- [ ] Empty states implemented (all pages)
- [ ] Loading states implemented (all pages)

### Performance Requirements
- [ ] Initial page load < 2 seconds (P95)
- [ ] Chart rendering < 500ms (last 7 days)
- [ ] API latency meets targets (P95 < 500ms simple, < 2s complex)
- [ ] No memory leaks (tested with extended usage)

### Security Requirements
- [ ] RBAC gates implemented (route guards, feature permissions)
- [ ] Image access permissions enforced
- [ ] No PII in logs/RUM (verified)
- [ ] Token storage secure (memory, not localStorage)
- [ ] XSS prevention (no `dangerouslySetInnerHTML`)

### Observability Requirements
- [ ] Datadog RUM integrated (non-PII data only)
- [ ] Error tracking implemented (with traceId)
- [ ] Performance monitoring implemented
- [ ] Correlation IDs (x-request-id, traceId) displayed to users

### Documentation Requirements
- [ ] API documentation complete (OpenAPI specs)
- [ ] User documentation complete (if applicable)
- [ ] Runbook updated (ops procedures)

---

## Related Documentation

- [Page Specifications](02-page-specs.md): Detailed page requirements
- [BFF API Contracts](04-bff-api-contracts.md): API endpoint definitions
- [Multi-Tenant & RBAC](06-multi-tenant-and-rbac.md): Permission requirements

