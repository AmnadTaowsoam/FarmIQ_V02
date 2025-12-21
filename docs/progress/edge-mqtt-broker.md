# Service Progress: edge-mqtt-broker

**Service**: `edge-mqtt-broker`  
**Layer**: `edge`  
**Status**: `done` (configured & verified)  
**Owner**: `Antigravity`  
**Last Updated**: `2025-12-18`

---

## Overview

Infrastructure service providing an MQTT broker for the edge layer. Uses Mosquitto v2 to handle all device telemetry and events. Devices connect to this broker on port 1883 (mapped to 5100 on the host).

---

## Ports & Connectivity

- **Container Port**: `1883`
- **Host Port**: `5100`
- **Internal URL**: `edge-mqtt-broker:1883`

---

## Environment Variables / Config

Service configured via `mosquitto.conf` mounted from `./edge-mqtt-broker/mosquitto.conf`.

```bash
# Core topics
iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/{metric}
iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/{eventType}
iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}
iot/status/{tenantId}/{farmId}/{barnId}/{deviceId}
```

---

## Docker Compose Snippet

```yaml
  edge-mqtt-broker:
    image: eclipse-mosquitto:2.0
    container_name: farmiq-edge-mqtt
    ports:
      - "5100:1883"
    volumes:
      - ./edge-mqtt-broker/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - mqtt_data:/mosquitto/data
      - mqtt_log:/mosquitto/log
    networks:
      - farmiq-net
```

---

## Auth & ACL (Dev vs Prod)

### Development (Current)
- `allow_anonymous true`
- No password or ACL files enforced by the broker by default to ease development.

### Production (Plan)
- `allow_anonymous false`
- Enable `password_file` and `acl_file` in `mosquitto.conf`.
- Example files provided in `./edge-mqtt-broker/aclfile.example` and `passwordfile.example`.

---

## Evidence Commands

### Start Service
```bash
docker compose up -d edge-mqtt-broker
```

### Subscribe to Telemetry
```bash
# Listen for all telemetry
mosquitto_sub -h localhost -p 5100 -t 'iot/telemetry/#'
```

### Publish Sample Telemetry
```bash
mosquitto_pub -h localhost -p 5100 -t 'iot/telemetry/t1/f1/b1/d1/temp' -m '{
  "event_id": "018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001",
  "event_type": "telemetry.reading",
  "occurred_at": "2025-12-18T00:00:00Z",
  "trace_id": "trace-abc-123",
  "schema_version": "1.0",
  "tenant_id": "t1",
  "farm_id": "f1",
  "barn_id": "b1",
  "device_id": "d1",
  "payload": {
    "metric": "temperature",
    "value": 26.4,
    "unit": "C"
  }
}'
```

---

## Progress Checklist

- [x] Service folder created
- [x] `mosquitto.conf` created for local dev
- [x] `aclfile.example` and `passwordfile.example` created
- [x] Integrated into `edge-layer/docker-compose.yml`
- [x] Device → Edge MQTT-only policy enforced
- [x] K8s manifests created (`k8s/edge-mqtt-broker/`)
- [x] Datadog metrics/logs documented
- [x] Progress documented in this file

---

## Kubernetes Deployment

**Manifests Location**: `k8s/edge-mqtt-broker/`

### Manifest Files

1. **00-namespace.yaml**: Creates `edge` namespace
2. **01-configmap.yaml**: Mosquitto configuration (`mosquitto.conf`, `aclfile`)
3. **01-secret.yaml**: Password file for authentication (optional)
4. **02-storage.yaml**: PVC for persistence (note: StatefulSet uses `volumeClaimTemplates`)
5. **03-statefulset.yaml**: Main deployment
   - Main container: `eclipse-mosquitto:2.0` (port 1883)
   - Sidecar: `sapcc/mosquitto-exporter` (port 9234, metrics)
   - Liveness/readiness probes (TCP socket on 1883)
   - Datadog annotations for logs and metrics
6. **04-service.yaml**: ClusterIP service (port 1883)
7. **kustomization.yaml**: Kustomize configuration for easy apply

### Apply Manifests

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

### Configuration

**Mosquitto Config**: Mounted from ConfigMap at `/mosquitto/config/mosquitto.conf`

**Key Settings**:
- Port: 1883 (non-TLS, dev mode)
- Persistence: Enabled (`/mosquitto/data/`)
- Logging: stdout (for K8s log collection)
- Anonymous Access: Enabled (dev only)

**Production Changes Required**:
1. Enable TLS (port 8883)
2. Disable anonymous access
3. Configure password authentication or mTLS
4. Update ACL file for topic-level authorization

**Storage**:
- PVC: 1Gi (configurable via `volumeClaimTemplates` in StatefulSet)
- Location: `/mosquitto/data/`
- Access Mode: ReadWriteOnce

See `k8s/edge-mqtt-broker/README.md` for detailed configuration and troubleshooting.

## Observability (Datadog)

### Logs

**Strategy**: Standard Kubernetes container logging (stdout/stderr)

**Configuration**:
- `log_dest stdout` in `mosquitto.conf` ensures logs go to container output
- Datadog Autodiscovery annotation:
  ```yaml
  ad.datadoghq.com/mosquitto.logs: '[{"source": "mosquitto", "service": "edge-mqtt-broker"}]'
  ```
- Datadog Agent automatically collects logs via Kubernetes log file tailing

**Search in Datadog**: `service:edge-mqtt-broker source:mosquitto`

**Log Fields**:
- Timestamp (formatted: `%Y-%m-%d %H:%M:%S`)
- Connection events
- Message publish/subscribe events
- Error messages

### Metrics

**Strategy**: Sidecar Exporter (`sapcc/mosquitto-exporter`)

**Configuration**:
- Sidecar container runs on port `9234`
- Exposes Prometheus metrics at `/metrics`
- Datadog Autodiscovery annotations:
  ```yaml
  ad.datadoghq.com/mosquitto-exporter.check_names: '["openmetrics"]'
  ad.datadoghq.com/mosquitto-exporter.init_configs: '[{}]'
  ad.datadoghq.com/mosquitto-exporter.instances: '[{"prometheus_url": "http://%%host%%:9234/metrics", "namespace": "mosquitto", "metrics": ["*"]}]'
  ```

**Available Metrics**:
- `mosquitto_clients_connected` - Number of connected clients
- `mosquitto_messages_received` - Total messages received
- `mosquitto_messages_sent` - Total messages sent
- `mosquitto_messages_stored` - Retained messages count
- `mosquitto_subscriptions` - Active subscriptions count
- `mosquitto_bytes_received` - Bytes received
- `mosquitto_bytes_sent` - Bytes sent

**Search in Datadog**: `namespace:mosquitto`

**Test Metrics Endpoint**:
```bash
# Port forward to exporter
kubectl -n edge port-forward <pod-name> 9234:9234

# Query metrics
curl http://localhost:9234/metrics
```

**Limitations**:
- Native Mosquitto doesn't have a built-in Prometheus endpoint
- Sidecar exporter is required for metrics collection
- Exporter connects to broker via TCP (localhost:1883)

