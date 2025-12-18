Purpose: Map FarmIQ architecture decisions and documentation coverage to Betagro GT&D compliance standards.  
Scope: Checkbox mapping to IT-Standards documents with references to the corresponding FarmIQ docs.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## Reference documents (GT&D single source of truth)

These are the required compliance references in this repo:
- `docs/compliance/IT-Standards/README.md`
- `docs/compliance/IT-Standards/01-inhouse-technical-requirement.md`
- `docs/compliance/IT-Standards/02-outsource-technical-requirement.md`
- `docs/compliance/IT-Standards/03-security-requirement.md`
- `docs/compliance/IT-Standards/04-technical-infrastructure-requirement.md`
- `docs/compliance/IT-Standards/05-design-requirement.md`
- `docs/compliance/IT-Standards/06-master-checklist.md`
- `docs/compliance/IT-Standards/07-approved-templates.md`
- `docs/compliance/IT-Standards/08-api-structure-design.md`

---

## Compliance mapping (checkbox style)

### Architecture & approval

- [ ] **Architecture approval in writing (In-house 1.1 / Outsource 1.1)**  
  Evidence: `docs/01-architecture.md` (diagram + boundaries) and this mapping doc.
- [ ] **Change management / re-approval (In-house 1.2 / Outsource 1.2)**  
  Evidence: `docs/shared/00-contacts-escalation.md` (architecture change escalation).

### Approved templates and technology stack

- [x] **Use approved templates (07-approved-templates)**  
  Evidence:
  - Node services: `boilerplates/Backend-node` (Express, Prisma, Winston, dd-trace)
  - Python services: `boilerplates/Backend-python` (FastAPI, JSON logging)
  - Frontend: `boilerplates/Frontend` (React, Datadog RUM optional)
  Docs: `docs/00-index.md`, `docs/cloud-layer/00-overview.md`, `docs/edge-layer/00-overview.md`
- [x] **No unapproved storage patterns for persistent storage (In-house 7.3 / Infrastructure 7.3)**  
  Decision: use Kubernetes PVC filesystem read/write for media and DB storage.  
  Evidence: `docs/shared/03-deployment-kubernetes.md`, `docs/edge-layer/02-edge-storage-buffering.md`
- [x] **No external in-memory cache/session store usage** (FarmIQ constraint; aligns with “approved tech” control)  
  Decision: no external in-memory store for cache/session/streams.  
  Evidence: `docs/shared/03-deployment-kubernetes.md`, service docs.
- [x] **No object storage usage** (FarmIQ constraint; aligns with Infrastructure 7.3 restriction on cloud storage)  
  Decision: media stored on PVC filesystem only.  
  Evidence: `docs/edge-layer/02-edge-storage-buffering.md`, `docs/cloud-layer/01-cloud-services.md`

### API standards (base path, docs, health)

- [x] **Base path `/api`, `/api-docs`, `GET /api/health` (08-api-structure-design)**  
  Evidence: `docs/shared/01-api-standards.md`, `docs/shared/00-api-catalog.md`
- [x] **Standard error response shape**  
  Evidence: `docs/shared/01-api-standards.md`
- [x] **Request correlation IDs** (`x-request-id`, `x-trace-id`)  
  Evidence: `docs/shared/01-api-standards.md`, `docs/shared/02-observability-datadog.md`

### Logging, monitoring, and alerting

- [x] **JSON logging to Datadog (In-house 8.1 / Outsource 7.1 / Master checklist 6.1-6.2)**  
  Decision:
  - Node: Winston JSON logs to stdout
  - Python: structured JSON logs to stdout  
  Evidence: `docs/shared/02-observability-datadog.md`
- [x] **Datadog tracing and correlation**  
  Decision: `dd-trace`/`ddtrace` across services (single approach).  
  Evidence: `docs/shared/02-observability-datadog.md`
- [x] **Alerts + SLOs documented (In-house 8.1 / Outsource 7.1) — DONE (docs)**  
  Evidence: `docs/08-alerts-slos.md`
- [ ] **Alerts implemented in Datadog (In-house 8.1 / Outsource 7.1) — PARTIAL (next step)**  
  Next step: create monitors/dashboards in Datadog per `docs/08-alerts-slos.md` and link screenshots/export here or in `docs/shared/05-runbook-ops.md`.

### Performance and testing

- [ ] **Performance targets (In-house 3 / Outsource 2)**  
  Evidence target: load test plan + report (implementation deliverable).
- [ ] **Load testing plan agreed (Outsource 2.4 / 2.4 agreement)**  
  Process: `docs/shared/00-contacts-escalation.md` (load testing agreement).
- [ ] **Coverage ≥ 70% and E2E requirements (In-house 4 / Master checklist 3)**  
  Evidence target: CI test reports.

### Security controls

- [x] **TLS 1.2+ in transit (Security 9.1, 6.3 / Infrastructure)**  
  Evidence: `docs/shared/03-deployment-kubernetes.md` (TLS baseline).
- [x] **Secure headers and hardening where applicable (Security 9.2 / approved templates Helmet/Nginx)**  
  Evidence: `docs/compliance/IT-Standards/07-approved-templates.md` and service implementations using boilerplates.
- [x] **Input validation (Security 3.1 / 3.2)**  
  Evidence: `docs/shared/01-api-standards.md` (Zod/Pydantic).
- [x] **Least privilege & RBAC (Security 2.2 / 2.3)**  
  Evidence: `docs/cloud-layer/01-cloud-services.md` (`cloud-identity-access` RBAC), `docs/06-rbac-authorization-matrix.md`, `docs/shared/00-api-catalog.md` (auth notes).
- [x] **Session management without external in-memory session store**  
  Decision: JWT/OIDC with configurable token expiry; no server-side session store.  
  Evidence: `docs/cloud-layer/01-cloud-services.md`, `docs/shared/01-api-standards.md`
- [x] **Authorization matrix documented (Security 2.3) — DONE (docs)**  
  Evidence: `docs/06-rbac-authorization-matrix.md`  
  Next step: implement permission checks + audit logging per matrix in each service.
- [ ] **VAPT completed before go-live (Security 8 / In-house 5.2 / Outsource 4.1)**  
  Evidence target: VAPT reports and remediation log.

### Infrastructure requirements

- [x] **Horizontal scalability (In-house 7.1 / Outsource 6.1 / Infrastructure 2.2)**  
  Evidence: `docs/shared/03-deployment-kubernetes.md` (stateless + HPA).
- [x] **Graceful shutdown (Outsource 6.2 / approved Node template)**  
  Evidence: Node boilerplate and per-service implementation.
- [x] **Environment separation and protection (In-house 5.1 / Outsource 3.3 / Infrastructure 4)**  
  Evidence: `docs/shared/03-deployment-kubernetes.md`
- [x] **Backup & recovery / DR plan documented (Infrastructure 6 / Outsource 6.6) — DONE (docs)**  
  Evidence: `docs/07-backup-dr-plan.md`
- [ ] **Restore drill executed and recorded (Infrastructure 6 / Outsource 6.6) — PARTIAL (next step)**  
  Next step: run quarterly restore drill per `docs/07-backup-dr-plan.md` and attach results (duration, issues, remediation).
- [x] **Maintenance page for UI (Infrastructure 7.1 / In-house 7.4)**  
  Evidence: `docs/cloud-layer/02-dashboard.md`, `docs/shared/03-deployment-kubernetes.md`

### Design and accessibility

- [x] **WCAG 2.2 Level A baseline (In-house 9.1 / Outsource 9.4 / Design 5)**  
  Evidence: `docs/cloud-layer/02-dashboard.md` (A11y requirement), design standards reference.
- [ ] **Responsive/resolution coverage (Design 6 / In-house 9.2)**  
  Evidence target: UI test evidence (manual/E2E).

### Documentation deliverables

- [x] **Architecture documentation provided (In-house 6 / Outsource 5)**  
  Evidence: `docs/00-index.md`, `docs/01-architecture.md`
- [x] **API documentation (OpenAPI) (Master checklist 13.2)**  
  Evidence: `docs/shared/01-api-standards.md`, `docs/shared/00-api-catalog.md`
- [x] **Workflow and troubleshooting/runbook documentation (In-house 6.1 / Outsource 5.1 / 8.5)**  
  Evidence: `docs/shared/05-runbook-ops.md`
- [x] **RBAC matrix, DR plan, and alerting/SLOs docs (Security/Infrastructure)**  
  Evidence: `docs/06-rbac-authorization-matrix.md`, `docs/07-backup-dr-plan.md`, `docs/08-alerts-slos.md`

---

## Implementation Notes

- Checkboxes marked `[ ]` represent items requiring environment-specific evidence (e.g., Datadog monitors, VAPT reports, load test reports).
- Items marked `[x]` are covered by design decisions and/or documentation in this repository.



