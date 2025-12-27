# API Contracts

This folder contains human-readable and machine-readable contracts for key APIs used across FarmIQ.

## Contents

- `cloud-bff.yaml` — BFF contract
- `cloud-standards-service.openapi.yaml` — Standards service OpenAPI 3.0 contract
- `cloud-standards-service.contract.md` — Standards service (via BFF) contract (doc)
- `cloud-analytics-service.contract.md` — Analytics service contract (doc)
- `cloud-llm-insights-service.contract.md` — LLM insights service contract (doc)
- `cloud-ml-model-service.contract.md` — ML model service contract (doc, optional)
- `cloud-api-gateway-bff.contract.md` — BFF public contract (doc)
- `cloud-notification-service.contract.md` — Notification service contract (doc)
- `notifications.payload.md` — Canonical notifications payload mapping (doc)
- `feed-service.contract.md` — Feed domain contract (doc)
- `barn-records-service.contract.md` — Barn records contract (doc)
- `tenant-registry-sensors.contract.md` — Sensors contract (doc)

## Usage

- Contracts are used for:
  - Frontend integration (request/response schemas)
  - Contract testing / mocking
  - Documentation and review

---

## Doc Change Summary (2025-12-27)

- Added/updated contract docs for analytics insights orchestration, LLM insights generation, and notifications (service + BFF proxy).

## Next Implementation Steps

1) Add BFF proxy endpoints for dashboard insights.  
2) Align FE ↔ BFF notification list response shape (and decide unread semantics).  
3) Implement `cloud-ml-model-service` (optional).  
