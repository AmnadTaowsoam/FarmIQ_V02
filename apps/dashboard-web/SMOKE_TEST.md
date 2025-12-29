# Dashboard-Web Smoke Test Guide

## Quick Reference

**Dev Server**: `pnpm -C apps/dashboard-web dev`  
**URL**: `http://localhost:5142`  
**Evidence**: `apps/dashboard-web/evidence/ui/`

---

## Smoke Test Checklist

### Setup
- [ ] Start dev server: `pnpm dev`
- [ ] Wait for "Local: http://localhost:5142"
- [ ] Open browser to http://localhost:5142

### Login & Context
- [ ] Login (if required)
- [ ] Select tenant
- [ ] Select farm (optional)

### Core Routes (15 pages)

| # | Route | Expected | Screenshot |
|---|-------|----------|------------|
| 1 | `/overview` | Dashboard KPIs | `overview.png` |
| 2 | `/farms` | List or empty | `farms-list.png` |
| 3 | `/farms/new` | Create form | `farms-create.png` |
| 4 | `/barns` | List or empty | `barns-list.png` |
| 5 | `/barns/new` | Create form | `barns-create.png` |
| 6 | `/devices` | List or empty | `devices-list.png` |
| 7 | `/sensors` | Catalog | `sensors-catalog.png` |
| 8 | `/sensors/new` | Create form | `sensors-create.png` |
| 9 | `/feeding/kpi` | KPI dashboard | `feeding-kpi.png` |
| 10 | `/feeding/intake` | Intake page | `feeding-intake.png` |
| 11 | `/feeding/lots` | Lots page | `feeding-lots.png` |
| 12 | `/feeding/quality` | Quality page | `feeding-quality.png` |
| 13 | `/barns/records` | Tabbed records | `barn-records.png` |
| 14 | `/weighvision/sessions` | Sessions list | `weighvision-sessions.png` |
| 15 | `/telemetry` | Metrics explorer | `telemetry.png` |

### Error Scenarios
- [ ] No tenant selected → Shows message
- [ ] API 404 → Shows ApiErrorState
- [ ] API 500 → Shows error with ID

### Capture Screenshots
1. Navigate to each route
2. Wait for page load (no spinners)
3. Capture full-page screenshot
4. Save to `evidence/ui/<name>.png`

---

## Expected Results

✅ **Success**: All routes render without crash  
✅ **Empty States**: Show helpful messages  
✅ **Errors**: Show ApiErrorState with guidance  
❌ **Crash**: Red error screen (should not happen)

---

## Quick Commands

```bash
# Start dev server
pnpm -C apps/dashboard-web dev

# Type check
pnpm -C apps/dashboard-web typecheck

# Build
pnpm -C apps/dashboard-web build
```
