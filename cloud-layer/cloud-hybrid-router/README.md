# FarmIQ Cloud Hybrid Inference Router

Intelligent routing between cloud and edge inference systems for optimal performance and cost efficiency.

## Features

- **Intelligent Routing**: Smart target selection based on latency, complexity, and cost
- **Multi-Target Support**: Edge MCU, Edge GPU, Cloud GPU, Cloud Serverless
- **Automatic Fallback**: Graceful degradation when targets fail
- **Result Caching**: In-memory caching for repeated requests
- **Cost Optimization**: Prefer edge targets when cost-effective
- **Real-time Monitoring**: Resource availability and load tracking

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────▶│   Hybrid     │────▶│   Edge      │────▶│   Edge      │
│  Gateway    │     │   Router     │     │   MCU       │     │   GPU       │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
     │                   │                   │
     ▼                   ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cloud     │────▶│   Cloud      │────▶│   Cloud     │
│  Serverless │     │   GPU        │     │   Serverless│
└─────────────┘     └──────────────┘     └─────────────┘
     │                   │
     ▼                   ▼
┌─────────────┐     ┌──────────────┐
│   Cache     │     │   Metrics    │
└─────────────┘     └──────────────┘
```

## Routing Decision Matrix

| Latency Requirement | Model Complexity | Preferred Target | Fallback |
|-------------------|------------------|------------------|-----------|
| Realtime (<10ms)  | Simple (<10K)    | Edge MCU         | Edge GPU  |
| Realtime (<10ms)  | Medium (<1M)     | Edge GPU         | Cloud GPU |
| Near (<100ms)     | Simple           | Edge MCU         | Edge GPU  |
| Near (<100ms)     | Medium           | Edge GPU         | Cloud GPU |
| Interactive (<500ms)| Medium/Complex | Cloud GPU        | Serverless|
| Batch (>1000ms)   | Complex         | Cloud Serverless | Cloud GPU |

## API Endpoints

### Health Checks
- `GET /health` - Service health check
- `GET /ready` - Readiness check with resource status

### Inference
- `POST /api/v1/inference` - Single inference with routing
- `POST /api/v1/inference/batch` - Batch inference requests

### Resource Monitoring
- `GET /api/v1/resources/status` - Get resource availability
- `GET /api/v1/metrics` - Get routing metrics

### Cache Management
- `POST /api/v1/cache/clear` - Clear inference cache

## Local Development

From `cloud-layer/`:

```bash
# Build and start service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build cloud-hybrid-router

# View logs
docker compose -f docker-compose.dev.yml logs -f cloud-hybrid-router
```

## Usage Examples

### Single Inference Request

```bash
curl -X POST "http://localhost:5140/api/v1/inference" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req-12345",
    "model_name": "vision-classification",
    "inputs": {
      "image": "base64_encoded_image_data",
      "barn_id": "barn-001"
    },
    "latency_requirement": "near",
    "model_complexity": "medium",
    "priority": 5
  }'
```

### Batch Inference Request

```bash
curl -X POST "http://localhost:5140/api/v1/inference/batch" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "request_id": "req-1",
      "model_name": "vision-classification",
      "inputs": {"image": "data1"},
      "latency_requirement": "near",
      "model_complexity": "medium"
    },
    {
      "request_id": "req-2",
      "model_name": "vision-classification",
      "inputs": {"image": "data2"},
      "latency_requirement": "realtime",
      "model_complexity": "simple"
    }
  ]'
```

### Get Resource Status

```bash
curl "http://localhost:5140/api/v1/resources/status"
```

### Get Metrics

```bash
curl "http://localhost:5140/api/v1/metrics"
```

### Clear Cache

```bash
curl -X POST "http://localhost:5140/api/v1/cache/clear"
```

## Latency Requirements

| Requirement | Target Latency | Use Cases |
|--------------|----------------|-----------|
| `realtime`   | < 10ms         | Real-time alerts, safety-critical |
| `near`       | < 100ms        | Near real-time monitoring |
| `interactive` | < 500ms      | User-facing features |
| `batch`      | > 1000ms       | Batch processing, analytics |

## Model Complexity

| Complexity | Parameters | Size | Use Cases |
|------------|-------------|-------|-----------|
| `simple`    | < 10K       | < 1MB  | Simple classification, regression |
| `medium`    | < 1M        | < 10MB | Computer vision, NLP |
| `complex`    | > 1M        | > 10MB | Large vision models, LLMs |

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `EDGE_MCU_ENDPOINT` | Edge MCU inference endpoint | `http://edge-mcu:8080` |
| `EDGE_GPU_ENDPOINT` | Edge GPU inference endpoint | `http://edge-gpu:8081` |
| `CLOUD_GPU_ENDPOINT` | Cloud GPU inference endpoint | `http://cloud-inference-server:5139` |
| `MAX_CLOUD_COST` | Maximum cloud cost per request | `0.01` |
| `EDGE_PREFERENCE_THRESHOLD` | Edge preference threshold | `0.7` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | Service port | `5140` |

## Cost Optimization

The router optimizes for cost by:
1. Preferring edge targets when latency requirements allow
2. Scoring targets based on cost-per-request
3. Penalizing expensive cloud options when edge is available
4. Using cache to avoid redundant inference

## Testing

```bash
# Run tests
docker compose -f docker-compose.dev.yml exec cloud-hybrid-router pytest

# Run with coverage
docker compose -f docker-compose.dev.yml exec cloud-hybrid-router pytest --cov=app
```

## Production Deployment

```bash
# Build production image
docker build -t farmiq-hybrid-router:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

## Monitoring

- **Health Check**: http://localhost:5140/health
- **Resource Status**: http://localhost:5140/api/v1/resources/status
- **Metrics**: http://localhost:5140/api/v1/metrics
- **Datadog Integration**: Enabled for APM and metrics
- **Logs**: JSON structured logging

## Troubleshooting

### High Cloud Costs

```bash
# Check routing metrics
curl "http://localhost:5140/api/v1/metrics"

# Review edge preference threshold
# Increase EDGE_PREFERENCE_THRESHOLD to prefer edge more
```

### High Latency

```bash
# Check resource status
curl "http://localhost:5140/api/v1/resources/status"

# Review latency requirements
# Ensure requests specify appropriate latency_requirement
```

### Cache Misses

```bash
# Check cache hit rate
curl "http://localhost:5140/api/v1/metrics"

# Review cache configuration
# Adjust cache_ttl_seconds for your use case
```

## Related Services

- **cloud-mlflow-registry**: Model versioning and lifecycle
- **cloud-feature-store**: Feature management for training
- **cloud-drift-detection**: Model performance monitoring
- **cloud-inference-server**: High-performance inference
