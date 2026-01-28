# ArgoCD Applications

This directory contains ArgoCD Application manifests for GitOps deployments.

## Structure

```
argocd/
├── app-of-apps.yaml                    # Root application (App of Apps pattern)
└── applications/
    ├── cloud-api-gateway-bff-dev.yaml
    ├── cloud-api-gateway-bff-staging.yaml
    ├── cloud-api-gateway-bff-prod.yaml
    └── ... (other services)
```

## App of Apps Pattern

The `app-of-apps.yaml` manages all applications. Deploy it first:

```bash
kubectl apply -f argocd/app-of-apps.yaml
```

ArgoCD will then sync all applications defined in `applications/` directory.

## Application Structure

Each application manifest defines:
- **Source**: Git repository and path to Helm chart
- **Destination**: Kubernetes cluster and namespace
- **Sync Policy**: Automated (dev/staging) or Manual (prod)
- **Values**: Environment-specific Helm values

## Sync Policies

### Dev/Staging
- **Automated**: Enabled
- **Self-Heal**: Enabled
- **Prune**: Enabled

### Production
- **Automated**: Disabled (manual sync required)
- **Self-Heal**: Disabled
- **Prune**: Enabled

## Manual Sync

For production, sync manually via ArgoCD UI or CLI:

```bash
argocd app sync cloud-api-gateway-bff-prod
```

## Rollback

```bash
# List revisions
argocd app history cloud-api-gateway-bff-prod

# Rollback to specific revision
argocd app rollback cloud-api-gateway-bff-prod <revision>
```

## Adding New Application

1. Create application manifest: `applications/{service}-{env}.yaml`
2. Follow existing pattern
3. Update app-of-apps.yaml if needed
4. Commit and push to Git repository
