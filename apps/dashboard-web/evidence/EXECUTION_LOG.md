# FE Evidence Capture - Execution Log

**Date**: 2025-12-21  
**Objective**: Complete FE evidence capture and verify demo-ready status

---

## Task A: Install Blockers Fix

### Applied Fixes

```bash
# Increased timeouts to prevent install timeout
pnpm config set network-timeout 600000
pnpm config set fetch-retries 5
pnpm config set fetch-timeout 600000
```

### Install Command
```bash
pnpm -C apps/dashboard-web install
```

**Status**: Running...

---

## Task B: Manual FE Evidence Checklist

### Screenshots Required

**Directory**: `apps/dashboard-web/evidence/ui/`

1. [ ] `01-overview.png` - Dashboard overview
2. [ ] `02-farms-list.png` - Farms list
3. [ ] `03-farms-create.png` - Create farm success
4. [ ] `04-barns-list.png` - Barns list
5. [ ] `05-barns-create.png` - Create barn success
6. [ ] `06-barn-batches.png` - Batches page under barn
7. [ ] `07-sensors-catalog.png` - Sensors catalog
8. [ ] `08-feeding-kpi.png` - Feeding KPI
9. [ ] `09-barn-records.png` - Barn records

### Verification Points
- [ ] No red error pages
- [ ] API errors show ApiErrorState (not crash)
- [ ] Seeded data displays correctly
- [ ] All API calls go through BFF

---

## Task C: BFF-Only API Verification

### Expected BFF Endpoints
- `/api/v1/farms`
- `/api/v1/barns`
- `/api/v1/devices`
- `/api/v1/sensors`
- `/api/v1/feeding/*`
- `/api/v1/weighvision/*`

### Verification Method
- Open browser DevTools → Network tab
- Navigate to each page
- Verify all API calls use BFF base URL
- No direct service URLs

---

## Task D: E2E Smoke (If Available)

### Command
```bash
pnpm -C apps/dashboard-web test:e2e
```

### Evidence Location
`apps/dashboard-web/evidence/smoke/screens/`

---

## Progress Log

### 2025-12-21 18:58
- Applied pnpm timeout fixes
- Started install command
- Waiting for install to complete...

---

## Next Steps

1. Wait for install to complete
2. Start dev server: `pnpm -C apps/dashboard-web dev`
3. Open browser to http://localhost:5142
4. Capture screenshots per checklist
5. Verify BFF-only API calls
6. Run E2E tests if Playwright available
7. Update STATUS.md with evidence paths
