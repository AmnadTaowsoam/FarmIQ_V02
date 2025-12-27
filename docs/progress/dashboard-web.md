# Dashboard-Web Progress & Evidence Guide

**Last Updated**: 2025-12-21  
**Status**: Evidence Pending (Install + Smoke Runs Incomplete)  
**Version**: 2.0.0

---

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm installed
- BFF running at `http://localhost:5125` (optional - graceful degradation if not available)

### Environment Variables

Create `.env.local` in `apps/dashboard-web/`:

```bash
# API Configuration
VITE_BFF_BASE_URL=http://localhost:5125
VITE_API_BASE_URL=http://localhost:5125  # Fallback

# Feature Flags
VITE_FEED_PROGRAMS_ENABLED=true
VITE_MOCK_MODE=false
VITE_DEBUG_TOOLS=1

# Optional: Auth
VITE_AUTH_ENABLED=true
```

### Running the Frontend

```bash
# From project root
cd apps/dashboard-web

# Install dependencies (if not done)
pnpm install

# Start dev server
pnpm dev

# Server will start at: http://localhost:5142
```

---

## Evidence Run Log (2025-12-21)

### Install Reliability Fix ✅

**Commands Applied**:
```bash
# Configure pnpm for reliability
pnpm config set network-timeout 600000
pnpm config set fetch-retries 5
pnpm config set fetch-timeout 600000

# Install dashboard-web
pnpm -C apps/dashboard-web install
# Result: 47 packages added, 486 audited in 20s

# Install missing dependency
pnpm -C apps/dashboard-web add @mui/x-data-grid
# Result: 10 packages added, 496 audited in 7s

# Start dev server
pnpm -C apps/dashboard-web dev
# Result: Server running at http://localhost:5142
```

**Outcome**: ✅ Install works reliably, dev server starts successfully

### Evidence Capture Results

**Screenshots Captured** (9 total):

✅ **Working Pages** (3):
1. Feeding Landing Page - 4 action cards
2. WeighVision Landing Page - 3 action cards  
3. Admin Page - "Coming Soon" placeholder

⚠️ **Redirected Pages** (6) - Blocked by missing tenant endpoint:
4. Overview Page
5. Farms List
6. Create Farm
7. Barns List
8. Sensors Catalog
9. Feeding KPI

**Browser Recording**: `fe_evidence_capture_1766318740855.webp`

### Blocker Status Update (2025-12-21 21:16)

**Backend Fix Deployed** ✅

**Actions Taken**:
1. ✅ Fixed TypeScript compilation errors in BFF
2. ✅ Rebuilt BFF container with `--no-cache`
3. ✅ Restarted BFF service

**Verification Results**:
```powershell
# BFF Health - SUCCESS
Invoke-WebRequest -Uri "http://localhost:5125/api/health"
# Status: 200 OK ✅

# Tenants Endpoint - ROUTE EXISTS
Invoke-WebRequest -Uri "http://localhost:5125/api/v1/tenants"
# Status: 502 SERVICE_UNAVAILABLE ✅
# (502 means route works, upstream service not running)
```

**Current Status**:
- ✅ BFF route deployed and working
- ✅ Returns 502 (not 404) - confirms route exists
- ⏸️ Waiting for tenant-registry service to start
- ⏸️ Once running, should return 200 with tenant list

**Next Step**: Start tenant-registry service, then re-run FE evidence capture

**Evidence**: See `docs/STATUS.md` lines 686-718 for full verification details

---
### Install Reliability Additions

- Added `.npmrc` in `apps/dashboard-web/.npmrc` with extended retry/timeouts.
- Added bootstrap scripts:
  - `apps/dashboard-web/scripts/bootstrap.sh`
  - `apps/dashboard-web/scripts/bootstrap.ps1`
  - Both enable corepack and run `pnpm install`.

---

## Implementation Summary

### Phase 1: API Client Consolidation (2025-12-21) ✅

#### Files Created
- `src/api/http.ts` - Centralized axios client with interceptors
- `src/api/endpoints.ts` - Canonical endpoint definitions

#### Features
- Automatic `Authorization: Bearer <token>` header
- UUID-based `x-request-id` generation
- Tenant context injection (`x-tenant-id` header + query param)
- Automatic token refresh on 401
- Centralized error handling

### Phase 2: Sensors Module (2025-12-21) ✅

#### Files Created
1. `src/features/sensors/pages/SensorCatalogPage.tsx` - Catalog with DataGrid
2. `src/features/sensors/pages/CreateSensorPage.tsx` - Create form
3. `src/features/sensors/pages/SensorDetailPage.tsx` - Detail with tabs
4. `src/features/sensors/components/SensorBindingsTab.tsx` - Bindings management
5. `src/features/sensors/components/SensorCalibrationsTab.tsx` - Calibrations

#### Features
- DataGrid with filters (search, type, status)
- Create/view/edit sensors
- Bindings and calibrations management
- Field normalization (camelCase ↔ snake_case)

### Phase 3: Demo-Ready Premium UX (2025-12-21) ✅

#### A) Navigation Clarity

**Created**:
- `src/components/navigation/ContextBar.tsx` - Context breadcrumb
- `src/features/feeding/pages/FeedingLandingPage.tsx` - Feeding module landing
- `src/features/weighvision/pages/WeighVisionLandingPage.tsx` - WeighVision landing
- `src/features/telemetry/pages/TelemetryLandingPage.tsx` - Telemetry landing

**Features**:
- Context bar showing Tenant > Farm > Barn > Batch
- Module landing pages with action cards
- Clear module descriptions
- No hollow menus

#### B) Enhanced States

**Modified**:
- `src/components/EmptyState.tsx` - Added variants (no-data, no-context, api-unavailable)

**Features**:
- Variant-based styling (color-coded borders)
- Primary + secondary actions
- Better user guidance

#### C) Routes Updated

**Modified**: `src/App.tsx`

**Changes**:
- `/feeding` → Landing page (was redirect)
- `/weighvision` → Landing page (new)
- `/telemetry` → Landing page (new)
- `/telemetry/explorer` → Metrics explorer (moved)

---

## Module Landing Pages

### Feeding Module (`/feeding`)
**Action Cards**:
1. KPI Dashboard → `/feeding/kpi`
2. Daily Intake → `/feeding/intake`
3. Feed Lots & Deliveries → `/feeding/lots`
4. Quality Results → `/feeding/quality`

**Description**: Comprehensive feed management system for tracking intake, quality, and performance metrics.

### WeighVision Module (`/weighvision`)
**Action Cards**:
1. Weighing Sessions → `/weighvision/sessions`
2. Weight Analytics → `/weighvision/analytics`
3. Weight Distribution → `/weighvision/distribution`

**Description**: AI-powered computer vision system for automated livestock weighing and growth monitoring.

### Telemetry Module (`/telemetry`)
**Action Cards**:
1. Metrics Explorer → `/telemetry/explorer`
2. Alerts & Notifications → `/alerts`
3. System Health → `/ops/health`

**Description**: Real-time sensor data, metrics visualization, and system health monitoring.

---

## Evidence & Screenshots

### Directory Structure

```
apps/dashboard-web/evidence/
├── ui/                          # Manual UI screenshots
│   ├── 01-overview.png
│   ├── 02-farms-list.png
│   ├── 03-farms-create.png
│   ├── 04-barns-list.png
│   ├── 05-sensors-catalog.png
│   ├── 06-feeding-landing.png
│   ├── 07-feeding-kpi.png
│   ├── 08-weighvision-landing.png
│   └── 09-weighvision-sessions.png
└── smoke/
    └── screens/                 # Automated smoke test screenshots
```

### Screenshot Capture Guide

**Required Screenshots** (9 total):

1. **Overview** (`01-overview.png`)
   - Navigate to `/overview`
   - Shows dashboard KPIs

2. **Farms List** (`02-farms-list.png`)
   - Navigate to `/farms`
   - Shows farms list or empty state

3. **Create Farm** (`03-farms-create.png`)
   - Navigate to `/farms/new`
   - Shows create farm form

4. **Barns List** (`04-barns-list.png`)
   - Navigate to `/barns`
   - Shows barns list or empty state

5. **Sensors Catalog** (`05-sensors-catalog.png`)
   - Navigate to `/sensors`
   - Shows sensor catalog with DataGrid

6. **Feeding Landing** (`06-feeding-landing.png`)
   - Navigate to `/feeding`
   - Shows 4 action cards

7. **Feeding KPI** (`07-feeding-kpi.png`)
   - Navigate to `/feeding/kpi`
   - Shows KPI dashboard

8. **WeighVision Landing** (`08-weighvision-landing.png`)
   - Navigate to `/weighvision`
   - Shows 3 action cards

9. **WeighVision Sessions** (`09-weighvision-sessions.png`)
   - Navigate to `/weighvision/sessions`
   - Shows sessions list or empty state

---

## Smoke Test Checklist

### Core Routes (No Crash)

- [ ] `/overview` - Dashboard overview
- [ ] `/farms` - Farms list
- [ ] `/farms/new` - Create farm form
- [ ] `/barns` - Barns list
- [ ] `/barns/new` - Create barn form
- [ ] `/devices` - Devices list
- [ ] `/sensors` - Sensor catalog
- [ ] `/sensors/new` - Create sensor form
- [ ] `/feeding` - **Feeding landing page**
- [ ] `/feeding/kpi` - Feeding KPI
- [ ] `/feeding/intake` - Daily intake
- [ ] `/weighvision` - **WeighVision landing page**
- [ ] `/weighvision/sessions` - Sessions list
- [ ] `/telemetry` - **Telemetry landing page**
- [ ] `/telemetry/explorer` - Metrics explorer

### UX Verification

- [ ] No menu item leads to 404
- [ ] All routes render without crash
- [ ] Empty states show helpful messages
- [ ] API errors show ApiErrorState
- [ ] Module landing pages explain purpose
- [ ] Action cards navigate correctly

---

## Known Issues & TODOs

### Non-Blocking (P1)
- [ ] Integrate ContextBar into Topbar
- [ ] Enhance ContextGuard with EmptyState variants
- [ ] Capture evidence screenshots (manual)
- [ ] Edit Sensor page
- [ ] Delete sensor functionality

### Execution Blockers (P0)
- [ ] pnpm install timing out in workspace (Playwright unavailable; FE smoke not run)
- [ ] Missing SMOKE_TOKEN/SMOKE_TENANT_ID for API smoke pass

### Nice to Have (P2)
- [ ] Sensor type icons in catalog
- [ ] Bulk operations
- [ ] Export to CSV
- [ ] Breadcrumbs for deep routes
- [ ] Animated page transitions

### Backend Dependencies
The following BFF proxy routes are called but may not be implemented:
- `/api/v1/sensors` (all sensor CRUD)
- `/api/v1/farms`, `/api/v1/barns`, `/api/v1/devices` (registry)

**Frontend Behavior**: Shows graceful `ApiErrorState` with helpful message when routes missing.

---

## Architecture Notes

### Navigation Pattern

**Module Landing Pages**:
- Entry point for each major module
- Explains module purpose in 2-3 lines
- Action cards for sub-features
- Premium design with hover animations

**Benefits**:
- Users understand module before diving in
- No hollow menus
- Clear navigation paths
- Professional first impression

### Empty State Variants

```typescript
// No data - neutral
<EmptyState variant="no-data" ... />

// Missing context - warning
<EmptyState variant="no-context" ... />

// API unavailable - error
<EmptyState variant="api-unavailable" ... />
```

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Check port 5142 is not in use
netstat -ano | findstr :5142

# Try different port
VITE_PORT=5143 pnpm dev
```

### Module Landing Pages Not Showing

1. **Check routes**: Verify routes in `App.tsx`
2. **Check imports**: Ensure landing page imports are correct
3. **Clear cache**: `rm -rf .vite && pnpm dev`

---

## Next Steps

1. **Integrate ContextBar**: Add to Topbar or PageHeader
2. **Capture Screenshots**: Follow smoke test checklist
3. **Update STATUS.md**: Mark UX polish complete
4. **Backend Integration**: Add missing BFF proxy routes

---

## Contact

- **Frontend Owner**: Antigravity
- **Documentation**: `docs/STATUS.md`, `apps/dashboard-web/COMPLETION_SUMMARY.md`
- **Evidence**: `apps/dashboard-web/evidence/`
