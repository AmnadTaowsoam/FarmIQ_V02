Purpose: Define backup and disaster recovery (DR) targets and runbooks for FarmIQ.  
Scope: Postgres/TimescaleDB backups, retention, restore drills, and operational procedures.  
Owner: FarmIQ Platform + SRE Team  
Last updated: 2025-12-18  

---

# Backup & DR Plan

This document is the **project-specific** DR plan referenced by `docs/shared/04-security-compliance-mapping.md`.

## Targets

- **RPO (Recovery Point Objective)**: 15 minutes for cloud DBs; 60 minutes for edge-local buffers (site-dependent).
- **RTO (Recovery Time Objective)**:
  - Cloud control plane APIs: 2 hours
  - Cloud ingestion + processing: 4 hours
  - Edge services (single site): 2 hours (excluding hardware replacement time)

## What is backed up

- **Cloud Postgres/TimescaleDB** (authoritative system of record for cloud):
  - Schema + data + roles/grants (where applicable)
  - Timescale policies and hypertable metadata
- **Edge Postgres/TimescaleDB** (site-local):
  - Outbox tables, dedupe tables, and minimal operational metadata
- **Kubernetes resources** (source-controlled where possible):
  - Helm values / manifests (stored in Git)
  - Secrets are backed up via the cluster secret backup process (do not store plaintext secrets in Git)

Non-goals (not backed up as primary data):
- Raw media bytes are durable on PVCs; recovery focuses on restoring service + metadata integrity. Media retention is a separate ops policy.

## Backup schedule (recommended)

### Cloud Postgres/TimescaleDB

- **Continuous WAL / incremental**: every 15 minutes (or managed PITR equivalent)
- **Daily full**: once per day (off-peak)
- **Monthly full**: first day of month

### Edge Postgres/TimescaleDB (per site)

- **Daily full**: once per day (off-peak)
- **Before upgrades**: snapshot backup before any schema migration or edge release rollout

## Retention

- Incremental/WAL: 7 days
- Daily full: 30 days
- Monthly full: 12 months

## Backup storage location

Backups MUST be stored **off-cluster** in an **encrypted backup repository** approved by IT/Security (e.g., enterprise backup vault or encrypted file share).  
Do not rely on the same Kubernetes cluster/PVCs as the only backup copy.

## Restore drill procedure (quarterly)

1. Select a restore point (random date within last 30 days).
2. Restore cloud Postgres/TimescaleDB into an isolated staging environment.
3. Run schema validation and a minimal application smoke test:
   - `GET /api/health` for required services
   - Verify ingestion pipeline can accept a sample MQTT event and persist it end-to-end
4. Record restore duration, issues, and remediation tasks.
5. Update runbooks and SLO monitors if gaps are found.

## Runbook: Cloud DB restore (high level)

1. Declare incident + assign incident commander.
2. Freeze writes (pause ingestion workers and API write paths if needed).
3. Restore DB from last known good point.
4. Run DB migrations only if explicitly required and validated.
5. Re-enable services in order:
   - identity/auth
   - ingestion
   - processing workers
   - APIs + UI
6. Monitor error rate, lag, queue depth, and latency.
7. Post-incident review and action items.

## Runbook: Edge site recovery (high level)

1. Verify MQTT broker availability and edge cluster health.
2. Restore edge DB if corrupted; otherwise keep outbox buffers intact.
3. Confirm PVCs are mounted and writable (media + buffers).
4. Bring up `edge-ingress-gateway` and verify:
   - `GET /api/health`
   - ingest a sample MQTT message and observe downstream routing
5. Reconcile any buffered events (store-and-forward replay will resume on reconnect).

## References

- `docs/shared/03-deployment-kubernetes.md`
- `docs/shared/05-runbook-ops.md`
- `docs/shared/02-observability-datadog.md`

