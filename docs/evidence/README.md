# Evidence Documentation Index

This directory contains evidence documentation for the FarmIQ platform, including test results, verification scripts, and demo guides.

## Cloud features (MVP)

- Notifications (service → BFF → dashboard-web): `docs/evidence/NOTIFICATIONS_EVIDENCE.md`
- Insights (orchestrator → LLM → notifications): `docs/evidence/INSIGHTS_EVIDENCE.md`

## Dashboard Web

### Notifications Module
**File**: `../apps/dashboard-web/evidence/NOTIFICATIONS_EVIDENCE.md` (dashboard-web evidence pack)

**Contents**:
- Complete demo script (12 steps)
- Screenshot checklist (11 screenshots)
- Network tab verification
- Polling behavior verification
- Acceptance criteria

**Status**: ✅ Complete

---

### API Smoke Tests
**File**: `../apps/dashboard-web/evidence/smoke/api-smoke.json` (generated)

**Contents**:
- Automated API endpoint tests
- Pass/fail counts
- Latency measurements
- Status codes

**How to Run**:
```bash
SMOKE_TOKEN=<jwt> SMOKE_TENANT_ID=<uuid> node tools/smoke-tests/run-smoke.mjs
```

---

## Architecture

### System Architecture Diagram
**File**: `../docs/FarmIQ-Architecture.png`

**Contents**:
- Cloud, Edge, and IoT layers
- Service dependencies
- Data flow

**Updated**: 2025-12-27

**Premium Version**: `../docs/farmiq_architecture_diagram_1766843322006.png`
- Dark mode theme
- Vibrant colors
- Clear data flow visualization

---

## Evidence Capture Guidelines

### Screenshots
- Use descriptive filenames: `01_feature_name_state.png`
- Include timestamp in filename if multiple captures
- Save to appropriate subdirectory
- Document in corresponding evidence file

### Network Traces
- Capture request/response headers
- Include correlation IDs
- Document in evidence file
- Save HAR files if needed

### Video Recordings
- Use `.webp` format for browser recordings
- Keep under 30 seconds per recording
- Focus on specific user flows
- Document in evidence file

---

## Directory Structure

```
evidence/
├── README.md (this file)
├── smoke/
│   ├── api-smoke.json
│   └── screens/
└── [other evidence files]
```

---

## Related Documentation

- Progress tracking: `../docs/progress/`
- Status tracking: `../docs/STATUS.md`
- API contracts: `../docs/contracts/`
- Architecture docs: `../docs/01-architecture.md`
