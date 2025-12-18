Purpose: Define Docker and Kubernetes deployment standards for FarmIQ across edge and cloud.  
Scope: Container assumptions, PVC usage, stateless pods, HPA notes, and config/secrets patterns.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-17  

---

## Deployment assumptions

FarmIQ runs on Kubernetes:
- **Edge-layer**: k3s/Kubernetes on-premise.
- **Cloud-layer**: Kubernetes in Betagro-managed environments.

All services:
- Are containerized with Docker (multi-stage builds).
- Are deployed via CI/CD pipelines (e.g., Azure pipelines).
- Must support graceful shutdown (SIGTERM) and run multiple replicas where applicable.

---

## PVC usage (non-negotiable)

Persistent storage must use **Kubernetes PVC filesystem** (regular read/write). No object storage is allowed.

### Edge PVCs

- **`edge-media-volume`**
  - Mount: `/data/media`
  - Used by: `edge-media-store` (mandatory)
  - Stores images at:
    - `/data/media/{tenant_id}/{farm_id}/{barn_id}/{session_id}/...`

- **`edge-db-volume`**
  - Used by: edge DB (if hosted in-cluster on PVC)
  - Stores PostgreSQL data directory.

### Cloud PVCs

- **`cloud-media-volume`** (only if `cloud-media-store` is enabled)
  - Mount: `/data/media`
  - Used by: `cloud-media-store`

---

## Stateless pods and scaling (HPA)

### Stateless services

All Node/Python application services should be stateless:
- No in-memory session reliance.
- No sessions/caches relying on an external in-memory store.
- Store durable state only in DB/PVC.

### HPA notes

- Enable HPA for stateless services (e.g., `cloud-api-gateway-bff`, `cloud-ingestion`, `cloud-telemetry-service`).
- Scale metrics:
  - CPU/Memory utilization
  - Request rate / latency (if custom metrics available)
- Do not HPA-scale stateful DBs and RabbitMQ without careful clustering/partitioning.

---

## Config and secrets patterns

### Configuration

- Use environment variables for runtime config.
- Support per-environment config: `dev`, `qa`, `uat`, `prod`.
- Keep configuration changes auditable (as required by infrastructure standards).

### Secrets

- No secrets in code or container images.
- Use Kubernetes Secrets and CI/CD secret stores.
- Rotate credentials as per security policy.

---

## Networking and security baseline

- Enforce TLS for all external traffic (edge↔cloud, browser↔cloud).
- Lock down ingress/egress via Kubernetes NetworkPolicy (or Cilium/Istio per standards).
- Restrict non-prod environments from public access.

---

## Datadog Agent deployment

Deploy Datadog Agent as a DaemonSet:
- Collect logs (stdout), metrics, and traces.
- Enable Kubernetes integration.
- Enable RabbitMQ integration for both:
  - Cloud RabbitMQ (`cloud-rabbitmq`)
  - Edge RabbitMQ (edge internal broker)

---

## Maintenance mode

UI systems must support a maintenance page controlled by environment variables (per infrastructure standards).

Implementation guidance:
- Frontend served behind Nginx can display a maintenance banner/page.
- API gateway can return `503` with a standard maintenance response when enabled for non-admin paths.

---

## Implementation Notes

- Use the approved boilerplate Dockerfiles as the starting point (`boilerplates/Backend-node`, `boilerplates/Backend-python`, `boilerplates/Frontend`).
- Ensure probes:
  - Liveness/readiness probes call `GET /api/health` for backend services.
- Ensure persistent directories are created on container start with correct permissions when mounting PVCs.



