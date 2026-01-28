# Kubernetes Architecture

**Purpose**: Production Kubernetes infrastructure design for FarmIQ  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

FarmIQ uses Kubernetes for production deployments with Helm charts for service management.

---

## Namespace Structure

```
farmiq-cloud/
├── cloud-api-gateway-bff
├── cloud-identity-access
├── cloud-tenant-registry
├── cloud-telemetry-service
├── cloud-billing-service
└── ... (other cloud services)

farmiq-edge/
├── edge-ingress-gateway
├── edge-telemetry-timeseries
├── edge-vision-inference
└── ... (other edge services)
```

---

## Resource Limits

### Standard Service Limits

| Resource | Requests | Limits |
|----------|----------|--------|
| CPU | 200m | 1000m |
| Memory | 256Mi | 512Mi |

### High-Load Service Limits

| Resource | Requests | Limits |
|----------|----------|--------|
| CPU | 500m | 2000m |
| Memory | 512Mi | 1Gi |

---

## Autoscaling

### Horizontal Pod Autoscaler (HPA)

All services support HPA with:
- **Min Replicas**: 2
- **Max Replicas**: 10
- **CPU Target**: 70%
- **Memory Target**: 80%

---

## Ingress

### TLS Termination

- **Ingress Controller**: NGINX
- **TLS**: Managed by cert-manager with Let's Encrypt
- **Domains**:
  - `api.farmiq.io` - Cloud API Gateway BFF
  - `admin.farmiq.io` - Admin Web
  - `dashboard.farmiq.io` - Dashboard Web

---

## Secrets Management

### External Secrets Operator

Secrets are managed via External Secrets Operator:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cloud-api-gateway-bff-secrets
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: cloud-api-gateway-bff-secrets
  data:
    - secretKey: jwt-secret
      remoteRef:
        key: farmiq/cloud-api-gateway-bff/jwt-secret
    - secretKey: database-url
      remoteRef:
        key: farmiq/cloud-api-gateway-bff/database-url
```

---

## Health Checks

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

---

## Deployment Strategy

### Rolling Update

- **Strategy**: RollingUpdate
- **Max Surge**: 1
- **Max Unavailable**: 0 (zero-downtime)

---

## Storage

### Persistent Volumes

Services requiring persistent storage:
- PostgreSQL (StatefulSet)
- RabbitMQ (StatefulSet)
- Edge Media Store (PVC for media files)

---

## Network Policies

### Default Deny

All namespaces use default-deny network policies with explicit allow rules.

---

## Monitoring

### Datadog Integration

- Datadog Agent as DaemonSet
- Autodiscovery annotations on pods
- APM tracing enabled
- Custom metrics collection

---

## Example: Deploy Service

```bash
# Install Helm chart
helm install cloud-api-gateway-bff ./helm/cloud-api-gateway-bff \
  --namespace farmiq-cloud \
  --create-namespace \
  --set image.tag=v1.0.0 \
  --set secrets.jwtSecret=$(echo -n "secret" | base64) \
  --set secrets.databaseUrl=$(echo -n "postgresql://..." | base64)

# Upgrade
helm upgrade cloud-api-gateway-bff ./helm/cloud-api-gateway-bff \
  --namespace farmiq-cloud \
  --set image.tag=v1.1.0

# Rollback
helm rollback cloud-api-gateway-bff --namespace farmiq-cloud
```
