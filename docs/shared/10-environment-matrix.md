# Environment Matrix

**Purpose**: Define Dev/Staging/Prod environment specifications  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

FarmIQ maintains three environments: **Dev**, **Staging**, and **Production** with parity and governance.

---

## Environment Specifications

### Development (Dev)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Development and testing |
| **Cluster** | Non-production GKE cluster |
| **Namespace** | `farmiq-cloud-dev`, `farmiq-edge-dev` |
| **Replicas** | 1-2 per service |
| **Resource Limits** | Reduced (50% of prod) |
| **Database** | Shared PostgreSQL (dev database) |
| **RabbitMQ** | Shared instance |
| **TLS** | Self-signed certificates |
| **Auto-Sync** | Enabled (ArgoCD) |
| **Access** | All developers |

### Staging

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Pre-production testing |
| **Cluster** | Non-production GKE cluster |
| **Namespace** | `farmiq-cloud-staging`, `farmiq-edge-staging` |
| **Replicas** | 2 per service |
| **Resource Limits** | Production-like |
| **Database** | Dedicated PostgreSQL (staging database) |
| **RabbitMQ** | Dedicated instance |
| **TLS** | Let's Encrypt staging |
| **Auto-Sync** | Enabled (ArgoCD) |
| **Access** | QA team, senior developers |

### Production

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Live production environment |
| **Cluster** | Production GKE cluster |
| **Namespace** | `farmiq-cloud-prod`, `farmiq-edge-prod` |
| **Replicas** | 2+ per service (HPA enabled) |
| **Resource Limits** | Full production limits |
| **Database** | Dedicated PostgreSQL (prod database) |
| **RabbitMQ** | Dedicated HA instance |
| **TLS** | Let's Encrypt production |
| **Auto-Sync** | Manual (requires approval) |
| **Access** | Platform team only |

---

## Configuration Management

### Environment-Specific Values

Each service has environment-specific Helm values:

```
helm/cloud-api-gateway-bff/
├── values.yaml          # Base values
├── values-dev.yaml      # Dev overrides
├── values-staging.yaml  # Staging overrides
└── values-prod.yaml     # Prod overrides
```

### Example: values-dev.yaml

```yaml
replicaCount: 1

resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false

env:
  - name: NODE_ENV
    value: "development"
  - name: LOG_LEVEL
    value: "debug"
```

### Example: values-prod.yaml

```yaml
replicaCount: 2

resources:
  limits:
    cpu: 1000m
    memory: 512Mi
  requests:
    cpu: 200m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10

env:
  - name: NODE_ENV
    value: "production"
  - name: LOG_LEVEL
    value: "info"
```

---

## Data Policies

### Development

- **Data**: Synthetic/test data only
- **Retention**: 30 days
- **Backup**: Daily snapshots
- **PII**: No real PII allowed

### Staging

- **Data**: Production-like synthetic data
- **Retention**: 90 days
- **Backup**: Daily snapshots
- **PII**: Anonymized PII only

### Production

- **Data**: Real production data
- **Retention**: Per compliance requirements
- **Backup**: Hourly snapshots + daily full backups
- **PII**: Real PII (encrypted, compliant)

---

## Access Controls

### Development

- **RBAC**: All developers have access
- **Network**: Open (for development)
- **Secrets**: Shared dev secrets

### Staging

- **RBAC**: QA team, senior developers
- **Network**: Restricted (similar to prod)
- **Secrets**: Staging-specific secrets

### Production

- **RBAC**: Platform team only
- **Network**: Highly restricted
- **Secrets**: Production secrets (External Secrets Operator)

---

## Promotion Rules

### Dev → Staging

**Requirements:**
- [ ] All tests passing in dev
- [ ] Code review approved
- [ ] No critical bugs
- [ ] Documentation updated

**Process:**
1. Merge `dev` → `staging` branch
2. ArgoCD auto-syncs to staging
3. Run integration tests
4. Monitor for 24 hours

### Staging → Production

**Requirements:**
- [ ] All tests passing in staging
- [ ] Code review approved
- [ ] No critical bugs
- [ ] Performance tests passed
- [ ] Security scan passed
- [ ] Change approval (for major changes)

**Process:**
1. Merge `staging` → `main` branch
2. Manual sync in ArgoCD (requires approval)
3. Monitor deployment
4. Verify health checks
5. Run smoke tests

---

## Environment Parity

### Maintain Parity

- Same Kubernetes versions
- Same Helm chart versions
- Same service configurations (scaled down for dev)
- Same database schemas
- Same API versions

### Differences Allowed

- Resource limits (dev can be smaller)
- Replica counts (dev can have fewer)
- Auto-scaling (disabled in dev)
- TLS certificates (self-signed in dev)
- Log levels (debug in dev, info in prod)

---

## Configuration Examples

### Database URLs

```yaml
# Dev
DATABASE_URL: postgresql://user:pass@postgres-dev:5432/farmiq_dev

# Staging
DATABASE_URL: postgresql://user:pass@postgres-staging:5432/farmiq_staging

# Prod
DATABASE_URL: postgresql://user:pass@postgres-prod:5432/farmiq_prod
```

### Service URLs

```yaml
# Dev
IDENTITY_SERVICE_URL: http://cloud-identity-access.farmiq-cloud-dev.svc.cluster.local:3000

# Staging
IDENTITY_SERVICE_URL: http://cloud-identity-access.farmiq-cloud-staging.svc.cluster.local:3000

# Prod
IDENTITY_SERVICE_URL: http://cloud-identity-access.farmiq-cloud-prod.svc.cluster.local:3000
```

---

## Monitoring

### Environment-Specific Dashboards

- **Dev**: Development metrics dashboard
- **Staging**: Pre-production testing dashboard
- **Prod**: Production monitoring dashboard

### Alerts

- **Dev**: Warnings only
- **Staging**: Warnings and errors
- **Prod**: Critical alerts only

---

## Checklist

- [ ] Environment specifications documented
- [ ] Helm values created for each environment
- [ ] Access controls configured
- [ ] Promotion rules defined
- [ ] Monitoring dashboards created
- [ ] Alerts configured
