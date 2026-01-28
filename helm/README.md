# FarmIQ Helm Charts

This directory contains Helm charts for FarmIQ services.

## Structure

```
helm/
├── cloud-api-gateway-bff/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-staging.yaml
│   ├── values-prod.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── hpa.yaml
│       ├── ingress.yaml
│       ├── secret.yaml
│       └── _helpers.tpl
└── cloud-identity-access/
    └── ... (similar structure)
```

## Installation

### Install Chart

```bash
# Dev environment
helm install cloud-api-gateway-bff ./helm/cloud-api-gateway-bff \
  --namespace farmiq-cloud-dev \
  --create-namespace \
  -f ./helm/cloud-api-gateway-bff/values-dev.yaml

# Staging environment
helm install cloud-api-gateway-bff ./helm/cloud-api-gateway-bff \
  --namespace farmiq-cloud-staging \
  --create-namespace \
  -f ./helm/cloud-api-gateway-bff/values-staging.yaml

# Production environment
helm install cloud-api-gateway-bff ./helm/cloud-api-gateway-bff \
  --namespace farmiq-cloud-prod \
  --create-namespace \
  -f ./helm/cloud-api-gateway-bff/values-prod.yaml
```

### Upgrade Chart

```bash
helm upgrade cloud-api-gateway-bff ./helm/cloud-api-gateway-bff \
  --namespace farmiq-cloud-prod \
  -f ./helm/cloud-api-gateway-bff/values-prod.yaml \
  --set image.tag=v1.1.0
```

### Rollback

```bash
helm rollback cloud-api-gateway-bff --namespace farmiq-cloud-prod
```

## Values Files

Each service has environment-specific values files:
- `values.yaml` - Base values
- `values-dev.yaml` - Development overrides
- `values-staging.yaml` - Staging overrides
- `values-prod.yaml` - Production overrides

## Common Values

### Image Configuration

```yaml
image:
  repository: asia-southeast1-docker.pkg.dev/app-nonprod-project/app-nonprod-ar/cloud-api-gateway-bff
  tag: "latest"
  pullPolicy: IfNotPresent
```

### Resources

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 512Mi
  requests:
    cpu: 200m
    memory: 256Mi
```

### Autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### Ingress

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: api.farmiq.io
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cloud-api-gateway-bff-tls
      hosts:
        - api.farmiq.io
```

## Secrets Management

Secrets should be managed via External Secrets Operator. Update `values.yaml` with secret references:

```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: cloud-api-gateway-bff-secrets
        key: jwt-secret
```

## Adding New Service Chart

1. Copy template from existing chart
2. Update Chart.yaml with service name
3. Update values.yaml with service-specific config
4. Create environment-specific values files
5. Test in dev environment first
