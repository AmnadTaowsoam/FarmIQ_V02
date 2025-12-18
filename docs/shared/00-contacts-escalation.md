Purpose: Define contact and escalation paths for FarmIQ delivery, compliance, and operations.  
Scope: Roles/teams matrix, escalation categories, and response expectations.  
Owner: FarmIQ Program Management  
Last updated: 2025-12-17  

---

## Contact matrix (fill in for the deployment)

> Placeholders are allowed; populate names/emails/phone numbers per environment (dev/qa/uat/prod).

| Area | Primary role/team | Backup role/team | Contact channel |
|:---|:---|:---|:---|
| Architecture changes / approvals | GT&D Architecture Review | FarmIQ Solution Architect | [TBD] |
| Security concerns / VAPT | Betagro Security Team | Head of Security (via Product Owner) | [TBD] |
| Cloud platform ops | Cloud Ops Team | FarmIQ Cloud Team | [TBD] |
| Edge platform ops | Edge Ops Team | FarmIQ Edge Team | [TBD] |
| RabbitMQ (cloud) | Platform Messaging Team | Cloud Ops Team | [TBD] |
| RabbitMQ (edge, if used) | Edge Ops Team | Platform Messaging Team | [TBD] |
| Database (cloud) | DB Ops Team | Cloud Ops Team | [TBD] |
| Database (edge) | Edge Ops Team | DB Ops Team | [TBD] |
| Dashboard / frontend | Frontend Team | Cloud Team | [TBD] |
| Multilingual issues (TH/EN) | Product Owner | Head of Application Development | [TBD] |
| Load testing agreement | Product Owner + Technology Team | FarmIQ Tech Lead | [TBD] |
| Incident on-call | On-call Engineer | Incident Commander | [TBD] |

---

## Escalation categories and triggers

### Architecture changes

- **Triggers**
  - Any change to service boundaries, ownership guards, or ingress points.
  - Introducing new infrastructure components (e.g., new DB type, new broker).
- **Action**
  - Open an Architecture Change Request.
  - Obtain written approval from GT&D before implementation.

### Security concerns

- **Triggers**
  - Suspected credential leakage, unauthorized access, or data exfiltration.
  - High severity vulnerabilities from scanning/VAPT.
- **Action**
  - Immediately notify Security Team and Incident Commander.
  - Preserve evidence (logs/traces) in Datadog.

### Multilingual issues (Thai/English)

- **Triggers**
  - Missing translations, incorrect localized images, or untranslated error messages.
- **Action**
  - Notify Product Owner; if unresolved, escalate to Head of Application Development.

### Load testing agreement

- **Triggers**
  - Disagreement on load volume or synthetic data requirements.
- **Action**
  - Escalate to Product Owner + Technology Team for sign-off.

### Incident escalation (production)

- **Triggers**
  - Sustained API 5xx spike.
  - RabbitMQ backlog impacting processing SLAs.
  - Edge sync stuck or mass edge offline.
  - PVC disk near-full or DB connectivity failures.

---

## Escalation flow and response expectations

### Severity levels (guidance)

| Severity | Examples | Expected response |
|:---|:---|:---|
| P1 | Production outage, data loss risk, security incident | Acknowledge ≤ 15 min, mitigate immediately |
| P2 | Partial outage, major degradation, growing backlog | Acknowledge ≤ 30 min, mitigate same day |
| P3 | Minor degradation, non-urgent bug | Acknowledge ≤ 1 business day |

### Standard incident workflow

1. **Detect**: Datadog alert or customer report.
2. **Triage**: Confirm scope (tenant/farm/barn/service) and impact.
3. **Mitigate**: Apply rollback, scale out, pause ingestion, or reduce workload.
4. **Communicate**: Update stakeholders and record timeline.
5. **Resolve**: Fix root cause; validate recovery.
6. **Post-mortem**: Document learnings and preventive actions.

---

## Implementation Notes

- Keep this document updated as teams/on-call rotations change.
- Link incident runbooks from `shared/05-runbook-ops.md` in incident communications.





