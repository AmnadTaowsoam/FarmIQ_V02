# GitOps with ArgoCD

**Purpose**: GitOps deployment workflow using ArgoCD  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

FarmIQ uses ArgoCD for GitOps-based continuous deployment. Git is the single source of truth for all deployments.

---

## Architecture

```
Git Repository (farmiq-manifests)
    ↓
ArgoCD (watches Git)
    ↓
Kubernetes Clusters
    ├── Dev
    ├── Staging
    └── Prod
```

---

## ArgoCD Setup

### Installation

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Access

```bash
# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

---

## Application Structure

### App of Apps Pattern

```
argocd/
├── app-of-apps.yaml          # Root application
└── applications/
    ├── cloud-api-gateway-bff-dev.yaml
    ├── cloud-api-gateway-bff-staging.yaml
    ├── cloud-api-gateway-bff-prod.yaml
    └── ... (other services)
```

---

## Sync Policies

### Dev Environment

- **Sync**: Automated
- **Prune**: Enabled
- **Self-Heal**: Enabled
- **Auto-Sync**: Enabled

### Staging Environment

- **Sync**: Automated
- **Prune**: Enabled
- **Self-Heal**: Enabled
- **Auto-Sync**: Enabled

### Production Environment

- **Sync**: Manual (requires approval)
- **Prune**: Enabled
- **Self-Heal**: Disabled
- **Auto-Sync**: Disabled

---

## Promotion Workflow

### Dev → Staging → Prod

1. **Development**:
   - Code merged to `dev` branch
   - ArgoCD auto-syncs to dev cluster
   - Tests run automatically

2. **Staging Promotion**:
   - Merge `dev` → `staging` branch
   - ArgoCD auto-syncs to staging cluster
   - Integration tests run

3. **Production Promotion**:
   - Merge `staging` → `main` branch
   - Manual sync in ArgoCD UI
   - Production tests run
   - Monitor deployment

---

## Image Updater

### ArgoCD Image Updater

Automatically updates image tags when new images are pushed:

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: cloud-api-gateway-bff=asia-southeast1-docker.pkg.dev/app-nonprod-project/app-nonprod-ar/cloud-api-gateway-bff
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/git-branch: dev
```

---

## Rollback

### Manual Rollback

```bash
# Via ArgoCD CLI
argocd app rollback cloud-api-gateway-bff-prod <revision>

# Via UI
# Go to Application → History → Rollback
```

### Automatic Rollback

ArgoCD can automatically rollback if health checks fail (configured per application).

---

## Health Checks

### Built-in Health Checks

- Deployment: Checks replica count
- Service: Checks endpoints
- Ingress: Checks routing

### Custom Health Checks

```yaml
spec:
  health:
    lua: |
      hs = {}
      if obj.status.phase == "Running" then
        hs.status = "Healthy"
      else
        hs.status = "Degraded"
      end
      return hs
```

---

## Access Control

### RBAC

ArgoCD RBAC policies:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:admin, applications, *, */*, allow
    p, role:admin, clusters, get, *, allow
    g, platform-team, role:admin
```

---

## Best Practices

1. **Git as Source of Truth**: Never modify resources directly in cluster
2. **Environment Parity**: Keep dev/staging/prod configurations similar
3. **Manual Prod Sync**: Require approval for production deployments
4. **Health Monitoring**: Monitor application health in ArgoCD
5. **Revision History**: Keep revision history for rollbacks

---

## Troubleshooting

### Sync Issues

```bash
# Check application status
argocd app get cloud-api-gateway-bff-prod

# Sync manually
argocd app sync cloud-api-gateway-bff-prod

# Check logs
argocd app logs cloud-api-gateway-bff-prod
```

### Health Check Failures

1. Check pod status: `kubectl get pods -n farmiq-cloud-prod`
2. Check service endpoints: `kubectl get endpoints -n farmiq-cloud-prod`
3. Check ingress: `kubectl get ingress -n farmiq-cloud-prod`

---

## Example: Deploy New Version

1. **Build and Push Image**:
   ```bash
   docker build -t cloud-api-gateway-bff:v1.1.0 .
   docker push asia-southeast1-docker.pkg.dev/.../cloud-api-gateway-bff:v1.1.0
   ```

2. **Update Helm Values**:
   ```yaml
   # helm/cloud-api-gateway-bff/values-dev.yaml
   image:
     tag: v1.1.0
   ```

3. **Commit and Push**:
   ```bash
   git add helm/cloud-api-gateway-bff/values-dev.yaml
   git commit -m "Deploy cloud-api-gateway-bff v1.1.0 to dev"
   git push origin dev
   ```

4. **ArgoCD Auto-Syncs** (for dev/staging) or **Manual Sync** (for prod)
