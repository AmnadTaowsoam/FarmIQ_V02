# Edge MQTT Broker - Kubernetes Manifests

**Service**: `edge-mqtt-broker`  
**Namespace**: `edge`  
**Image**: `eclipse-mosquitto:2.0`  
**Port**: `1883` (MQTT)

---

## Overview

Kubernetes manifests for deploying the FarmIQ Edge MQTT broker using Mosquitto. The broker handles all device telemetry and events in the edge layer.

---

## Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured to access the cluster
- Datadog Agent deployed (for observability)
- Storage class available (for PVC, if persistence enabled)

---

## Quick Start

### Apply All Manifests

```bash
# Apply using kustomize (recommended)
kubectl apply -k k8s/edge-mqtt-broker

# Or apply individually
kubectl apply -f k8s/edge-mqtt-broker/00-namespace.yaml
kubectl apply -f k8s/edge-mqtt-broker/01-configmap.yaml
kubectl apply -f k8s/edge-mqtt-broker/01-secret.yaml
kubectl apply -f k8s/edge-mqtt-broker/02-storage.yaml
kubectl apply -f k8s/edge-mqtt-broker/03-statefulset.yaml
kubectl apply -f k8s/edge-mqtt-broker/04-service.yaml
```

### Verify Deployment

```bash
# Check namespace
kubectl get namespace edge

# Check pods
kubectl -n edge get pods -l app=edge-mqtt-broker

# Check service
kubectl -n edge get svc edge-mqtt-broker

# Check StatefulSet
kubectl -n edge get statefulset edge-mqtt-broker

# View logs
kubectl -n edge logs -f statefulset/edge-mqtt-broker -c mosquitto
```

---

## Manifest Files

### 00-namespace.yaml
- Creates the `edge` namespace
- Optional but recommended for organization

### 01-configmap.yaml
- Contains `mosquitto.conf` configuration
- Contains `aclfile` for topic-level authorization
- Mounted to `/mosquitto/config/` in the container

### 01-secret.yaml
- Optional: Contains `passwordfile` for password authentication
- **Important**: Update with actual hashed passwords before production
- Generate passwords with: `mosquitto_passwd -c passwordfile username`

### 02-storage.yaml
- PersistentVolumeClaim for MQTT data persistence
- Default: 1Gi storage
- **Note**: StatefulSet uses `volumeClaimTemplates` instead (see 03-statefulset.yaml)

### 03-statefulset.yaml
- Main deployment manifest
- **Containers**:
  - `mosquitto`: Main MQTT broker (port 1883)
  - `mosquitto-exporter`: Metrics exporter sidecar (port 9234)
- **Features**:
  - Liveness and readiness probes (TCP socket on port 1883)
  - Datadog annotations for logs and metrics
  - Persistent storage via volumeClaimTemplates
  - Resource limits and requests

### 04-service.yaml
- ClusterIP service exposing port 1883
- For external access, change to NodePort or LoadBalancer

### kustomization.yaml
- Kustomize configuration for easy apply
- Groups all resources together

---

## Configuration

### Mosquitto Configuration

The main configuration is in `01-configmap.yaml` under `mosquitto.conf`. Key settings:

- **Port**: 1883 (non-TLS, dev mode)
- **Persistence**: Enabled (`/mosquitto/data/`)
- **Logging**: stdout (for K8s log collection)
- **Anonymous Access**: Enabled (dev only - disable for production)

### Production Configuration

For production, update `mosquitto.conf` in the ConfigMap:

1. **Enable TLS**:
   ```conf
   listener 8883
   cafile /mosquitto/config/ca.crt
   certfile /mosquitto/config/server.crt
   keyfile /mosquitto/config/server.key
   ```

2. **Disable Anonymous Access**:
   ```conf
   allow_anonymous false
   password_file /mosquitto/config/passwordfile
   acl_file /mosquitto/config/aclfile
   ```

3. **Mount TLS Certificates**:
   - Create a Secret with TLS certificates
   - Mount to `/mosquitto/config/` in StatefulSet

4. **Update Password File**:
   - Generate hashed passwords: `mosquitto_passwd -c passwordfile username`
   - Update `01-secret.yaml` with actual password file content

---

## Persistence

Persistence is enabled by default via `volumeClaimTemplates` in the StatefulSet.

**Storage**:
- Location: `/mosquitto/data/`
- Size: 1Gi (configurable)
- Access Mode: ReadWriteOnce

**To Disable Persistence**:
- Remove `volumeClaimTemplates` from StatefulSet
- Remove `volumeMounts` for `mqtt-data`
- Note: Messages will not persist across pod restarts

**To Change Storage Size**:
- Edit `volumeClaimTemplates` in `03-statefulset.yaml`
- Update `resources.requests.storage` value

---

## Observability

### Datadog Logs

**Configuration**: Automatic via pod annotations

```yaml
annotations:
  ad.datadoghq.com/mosquitto.logs: '[{"source": "mosquitto", "service": "edge-mqtt-broker"}]'
```

**Log Source**: Mosquitto logs to stdout (configured in `mosquitto.conf`)

**Search in Datadog**: `service:edge-mqtt-broker source:mosquitto`

### Datadog Metrics

**Configuration**: Sidecar exporter + autodiscovery

- **Exporter**: `sapcc/mosquitto-exporter` (port 9234)
- **Metrics Endpoint**: `http://localhost:9234/metrics`
- **Autodiscovery**: Configured via pod annotations

**Available Metrics**:
- `mosquitto_clients_connected` - Number of connected clients
- `mosquitto_messages_received` - Messages received
- `mosquitto_messages_sent` - Messages sent
- `mosquitto_messages_stored` - Retained messages
- `mosquitto_subscriptions` - Active subscriptions

**Search in Datadog**: `namespace:mosquitto`

---

## Testing

### Test MQTT Connection

```bash
# Get service endpoint
SVC_ENDPOINT=$(kubectl -n edge get svc edge-mqtt-broker -o jsonpath='{.spec.clusterIP}')

# Subscribe to test topic
mosquitto_sub -h $SVC_ENDPOINT -p 1883 -t 'iot/status/#' -v

# Publish test message (in another terminal)
mosquitto_pub -h $SVC_ENDPOINT -p 1883 -t 'iot/status/test' -m '{"ok":true}'
```

### Test from Pod

```bash
# Exec into a pod in the edge namespace
kubectl -n edge run -it --rm mqtt-test --image=eclipse-mosquitto:2.0 --restart=Never -- sh

# Inside the pod:
mosquitto_sub -h edge-mqtt-broker.edge.svc.cluster.local -p 1883 -t 'iot/telemetry/#' -v
```

### Test Health Probes

```bash
# Check liveness probe
kubectl -n edge describe pod <pod-name> | grep Liveness

# Check readiness probe
kubectl -n edge describe pod <pod-name> | grep Readiness
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl -n edge describe pod <pod-name>

# Check logs
kubectl -n edge logs <pod-name> -c mosquitto

# Check events
kubectl -n edge get events --sort-by='.lastTimestamp'
```

### Storage Issues

```bash
# Check PVC status
kubectl -n edge get pvc

# Check PV
kubectl -n edge get pv

# Describe PVC
kubectl -n edge describe pvc mqtt-data-edge-mqtt-broker-0
```

### Metrics Not Appearing

```bash
# Check exporter logs
kubectl -n edge logs <pod-name> -c mosquitto-exporter

# Test metrics endpoint
kubectl -n edge port-forward <pod-name> 9234:9234
curl http://localhost:9234/metrics
```

---

## Scaling

**Current**: Single replica (StatefulSet with `replicas: 1`)

**To Scale**:
```bash
kubectl -n edge scale statefulset edge-mqtt-broker --replicas=3
```

**Note**: MQTT broker scaling requires shared state or clustering. For production, consider:
- MQTT broker clustering (Mosquitto supports clustering)
- External MQTT broker (e.g., EMQX cluster)
- Load balancer with sticky sessions

---

## Security Considerations

### Development (Current)
- ✅ Anonymous access enabled
- ✅ Non-TLS port 1883
- ⚠️ **Not suitable for production**

### Production (Required)
- ❌ Disable anonymous access
- ❌ Enable TLS (port 8883)
- ❌ Use password authentication or mTLS
- ❌ Configure ACL for topic-level authorization
- ❌ Use network policies to restrict access
- ❌ Rotate certificates regularly

---

## Maintenance

### Update Configuration

```bash
# Edit ConfigMap
kubectl -n edge edit configmap edge-mqtt-broker-config

# Restart StatefulSet to apply changes
kubectl -n edge rollout restart statefulset edge-mqtt-broker
```

### Backup Data

```bash
# Create backup of PVC
kubectl -n edge exec <pod-name> -c mosquitto -- tar czf /tmp/backup.tar.gz /mosquitto/data
kubectl -n edge cp <pod-name>:/tmp/backup.tar.gz ./mqtt-backup.tar.gz
```

### Cleanup

```bash
# Delete all resources
kubectl delete -k k8s/edge-mqtt-broker

# Or delete individually
kubectl -n edge delete statefulset edge-mqtt-broker
kubectl -n edge delete svc edge-mqtt-broker
kubectl -n edge delete configmap edge-mqtt-broker-config
kubectl -n edge delete secret edge-mqtt-broker-secret
kubectl -n edge delete pvc -l app=edge-mqtt-broker
```

---

## References

- [Mosquitto Documentation](https://mosquitto.org/documentation/)
- [Mosquitto Exporter](https://github.com/sapcc/mosquitto-exporter)
- [Datadog Kubernetes Integration](https://docs.datadoghq.com/agent/kubernetes/)

---

**Last Updated**: 2025-12-21

