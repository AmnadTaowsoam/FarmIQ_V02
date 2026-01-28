# FarmIQ MLOps Kubernetes Deployment

Kubernetes manifests for deploying FarmIQ MLOps infrastructure.

## Services

- **cloud-mlflow-registry**: Model registry and versioning (MLflow)
- **cloud-feature-store**: Feature store (Feast)
- **cloud-drift-detection**: Drift detection and retraining
- **cloud-inference-server**: High-performance inference (Triton)
- **cloud-hybrid-router**: Hybrid inference router

## Prerequisites

- Kubernetes cluster with GPU support
- kubectl configured
- Docker registry access
- Secrets configured

## Deployment

```bash
# Create namespace
kubectl apply -f 00-namespace.yaml

# Apply all manifests
kubectl apply -k kustomization.yaml

# Or apply individual services
kubectl apply -f 01-mlflow-registry-deployment.yaml
kubectl apply -f 02-inference-server-deployment.yaml
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `LOG_LEVEL` | Logging level | `INFO` |
| `DD_ENV` | Datadog environment | `prod` |
| `DD_SITE` | Datadog site | `datadoghq.com` |
| `DATABASE_URL` | PostgreSQL connection URL | - |

### Resource Requirements

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | GPU |
|----------|-------------|------------|-----------------|---------------|-----|
| mlflow-registry | 500m | 2000m | 512Mi | 2Gi | - |
| feature-store | 500m | 2000m | 512Mi | 2Gi | - |
| drift-detection | 500m | 2000m | 512Mi | 2Gi | - |
| inference-server | 1000m | 4000m | 2Gi | 8Gi | 1 |
| hybrid-router | 250m | 1000m | 256Mi | 1Gi | - |

## Verification

```bash
# Check pod status
kubectl get pods -n farmiq-mlops

# Check services
kubectl get svc -n farmiq-mlops

# View logs
kubectl logs -f deployment/cloud-mlflow-registry -n farmiq-mlops
```

## Scaling

```bash
# Scale inference server
kubectl scale deployment/cloud-inference-server -n farmiq-mlops --replicas=3
```

## Monitoring

- **Datadog**: APM and metrics integration enabled
- **Health Checks**: Liveness and readiness probes configured
- **Resource Limits**: CPU, memory, and GPU limits set

## Troubleshooting

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n farmiq-mlops

# Check logs
kubectl logs <pod-name> -n farmiq-mlops
```

### GPU Not Available

```bash
# Check GPU availability
kubectl describe node <node-name>

# Verify GPU resource
kubectl get nodes -o jsonpath='{.items[*].status.allocatable.nvidia\.com/gpu}'
```

### Service Not Reachable

```bash
# Check service endpoints
kubectl get endpoints -n farmiq-mlops

# Test service connectivity
kubectl run test --image=curlimages/curl -it --rm -- \
  curl http://cloud-mlflow-registry.farmiq-mlops.svc.cluster.local:5000/health
```

## Related Services

- **cloud-mlflow-registry**: Model versioning and lifecycle
- **cloud-feature-store**: Feature management for training
- **cloud-drift-detection**: Model performance monitoring
- **cloud-inference-server**: High-performance inference
- **cloud-hybrid-router**: Edge-cloud inference coordination
