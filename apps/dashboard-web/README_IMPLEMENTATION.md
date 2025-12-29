# Dashboard-Web Frontend Skeleton Implementation

## ✅ Completed

### Core Infrastructure
- ✅ Active Context Provider (`src/contexts/ActiveContext.tsx`)
  - Manages tenant/farm/barn/batch context
  - Persists to localStorage
  - Syncs with URL params for deep linking

- ✅ BFF API Client (`src/api/bffClient.ts`)
  - Wraps axios client
  - Automatically includes context in query params
  - Mock mode support via `VITE_MOCK_MODE=true`

- ✅ Route Configuration (`src/config/routes.ts`)
  - Complete route map with icons
  - RBAC permission definitions
  - Helper functions for role-based filtering

- ✅ RoleGate Component (`src/guards/RoleGate.tsx`)
  - Hides/shows components based on user roles
  - Supports fallback UI

### Reusable Components
- ✅ `StatCard` - KPI display cards
- ✅ `SectionCard` - Section containers
- ✅ `TimeSeriesChart` - Recharts-based time series
- ✅ `DistributionChart` - Histogram/bar charts
- ✅ `BasicTable` - Configurable data tables
- ✅ `ContextSelector` - Tenant/Farm/Barn dropdowns
- ✅ `TimeRangeSelector` - Time range picker

### Pages Implemented (11/29)
- ✅ Login
- ✅ Context Selection
- ✅ Overview
- ✅ Farms List & Detail
- ✅ Barns List & Detail
- ✅ Devices List
- ✅ Telemetry Explorer
- ✅ WeighVision Sessions (list & detail)
- ✅ WeighVision Analytics
- ✅ Alerts

### Pages Using ComingSoon (18/29)
All remaining pages use `ComingSoonPage` component as placeholder:
- Devices Detail
- WeighVision Distribution
- Sensor Matrix & Trends
- Feeding Daily & FCR
- AI Anomalies, Recommendations, Scenario
- Reports & Export
- Ops Data Quality & Health
- Admin (Tenants, Devices, Users, Audit)

### Layout Updates
- ✅ MainLayout updated with:
  - Context selector in topbar
  - RBAC-based menu filtering
  - Responsive sidebar

- ✅ App.tsx updated with all 29 routes

## 📋 Route Map

```
Public:
  /login

Context:
  /select-context
  /select-tenant
  /select-farm

Main:
  /overview
  /farms, /farms/:farmId
  /barns, /barns/:barnId
  /devices, /devices/:deviceId
  /telemetry

WeighVision:
  /weighvision/sessions
  /weighvision/sessions/:sessionId
  /weighvision/analytics
  /weighvision/distribution

Sensors:
  /sensors/matrix
  /sensors/trends

Feeding:
  /feeding/daily
  /feeding/fcr

AI:
  /ai/anomalies
  /ai/recommendations
  /ai/scenario

Other:
  /alerts
  /reports
  /ops/data-quality
  /ops/health
  /admin/tenants
  /admin/devices
  /admin/users
  /admin/audit

Errors:
  /403, /404, /500
```

## 🔧 Environment Variables

Create `.env.local`:

```bash
# Required - BFF Base URL
VITE_BFF_BASE_URL=http://localhost:3000/api

# Optional - Enable mock mode (uses mock data when endpoints not available)
VITE_MOCK_MODE=false
```

## 🚀 Running the App

```bash
cd apps/dashboard-web

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
# Opens on http://localhost:5130

# Build for production
npm run build

# Run linter
npm run lint
```

## 📝 TODO: BFF Endpoints

All pages have `TODO:` comments marking where BFF API calls need to be implemented. See:
- `docs/cloud-layer/dashboard/04-bff-api-contracts.md` for complete API spec

Key endpoints to implement:
1. `GET /api/v1/registry/tenants`
2. `GET /api/v1/registry/farms?tenant_id=...`
3. `GET /api/v1/registry/barns?tenant_id=...`
4. `GET /api/v1/dashboard/overview?tenant_id=...`
5. `GET /api/v1/telemetry/readings?tenant_id=...`
6. ... (29 total endpoints)

## 🎯 Next Steps

1. **Implement remaining page skeletons**
   - Replace `ComingSoonPage` with actual implementations
   - Follow patterns from existing pages (Overview, Barns, etc.)

2. **Wire up BFF API calls**
   - Create hooks for each endpoint group
   - Use React Query (optional, not currently installed)
   - Replace mock data with real API calls

3. **Add RoleGate to protected pages**
   - Wrap admin/ops pages with `<RoleGate requiredRoles={[...]}>`
   - Add permission checks to action buttons

4. **Enhanced features**
   - Breadcrumb navigation
   - Data freshness indicators
   - Error boundary for better error handling
   - Loading states per section (not just full page)

## 🐛 Known Issues / Notes

- Context selector uses mock data (needs real API)
- All API calls are stubbed with mock data
- Mock mode warnings appear in console when enabled
- Some pages use `ComingSoonPage` placeholder
- RoleGate component created but not yet used in all protected routes

## 📚 Documentation

- Dashboard docs: `docs/cloud-layer/dashboard/*`
- API contracts: `docs/cloud-layer/dashboard/04-bff-api-contracts.md`
- Page specs: `docs/cloud-layer/dashboard/02-page-specs.md`

