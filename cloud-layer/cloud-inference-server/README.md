# FarmIQ Cloud High-Performance Inference Server

Enterprise-grade ML model serving with Triton Inference Server for optimal throughput and latency.

## Features

- **Triton Inference Server**: NVIDIA's high-performance serving framework
- **Dynamic Batching**: Adaptive batch sizing for optimal throughput
- **GPU Acceleration**: CUDA and TensorRT optimization
- **Mixed Precision**: FP16/INT8 for faster inference
- **Model Caching**: Pre-loaded models for low latency
- **Performance Monitoring**: Real-time metrics and tracking
- **Multi-Framework**: Support for PyTorch, TensorFlow, ONNX, TensorRT

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────▶│   Request    │────▶│   Dynamic   │────▶│   Triton     │
│  Gateway    │     │   Batcher    │     │   Batcher    │     │   Server     │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
     │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Model     │     │   Model      │     │   GPU       │     │   Metrics    │
│  Cache      │     │   Repository  │     │   Memory    │     │   Exporter   │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

## Performance Targets

- **P50 Latency**: < 10ms (user-facing models)
- **P95 Latency**: < 50ms (user-facing models)
- **P99 Latency**: < 100ms (user-facing models)
- **Throughput**: > 1000 requests/second
- **GPU Utilization**: > 70% during peak hours
- **Batch Efficiency**: > 80% of max batch size

## API Endpoints

### Health Checks
- `GET /health` - Service health check
- `GET /ready` - Readiness check with Triton connection

### Model Management
- `GET /api/v1/models` - List all available models
- `GET /api/v1/models/{model_name}` - Get model information
- `POST /api/v1/models/warmup` - Warm up model cache

### Inference
- `POST /api/v1/inference` - Single inference request
- `POST /api/v1/inference/batch` - Batch inference request

### Performance Monitoring
- `GET /api/v1/metrics` - Get current performance metrics
- `GET /api/v1/metrics/history` - Get historical metrics
- `POST /api/v1/metrics/reset` - Reset performance metrics

## Local Development

From `cloud-layer/`:

```bash
# Build and start service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build cloud-inference-server

# View logs
docker compose -f docker-compose.dev.yml logs -f cloud-inference-server

# Access Triton metrics
open http://localhost:8002
```

## Usage Examples

### Single Inference Request

```bash
curl -X POST "http://localhost:5139/api/v1/inference" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "vision-classification",
    "inputs": [
      {
        "image": "base64_encoded_image_data",
        "barn_id": "barn-001"
      }
    ],
    "request_id": "req-12345",
    "priority": 5
  }'
```

### Batch Inference Request

```bash
curl -X POST "http://localhost:5139/api/v1/inference/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "vision-classification",
    "inputs": [
      {"image": "image_data_1", "barn_id": "barn-001"},
      {"image": "image_data_2", "barn_id": "barn-002"},
      {"image": "image_data_3", "barn_id": "barn-003"}
    ]
  }'
```

### List Models

```bash
curl "http://localhost:5139/api/v1/models"
```

### Get Model Info

```bash
curl "http://localhost:5139/api/v1/models/vision-classification"
```

### Get Performance Metrics

```bash
curl "http://localhost:5139/api/v1/metrics"
```

### Warm Up Model

```bash
curl -X POST "http://localhost:5139/api/v1/models/warmup"
```

## Dynamic Batching Configuration

| Setting | Description | Default |
|----------|-------------|----------|
| `ENABLE_DYNAMIC_BATCHING` | Enable adaptive batching | `true` |
| `MAX_BATCH_SIZE` | Maximum batch size | `32` |
| `MAX_QUEUE_DELAY_MS` | Max wait time for batch formation | `10000` |
| `PREFERRED_BATCH_SIZES` | Optimal batch sizes | `[8, 16, 32]` |

## GPU Configuration

| Setting | Description | Default |
|----------|-------------|----------|
| `ENABLE_GPU` | Enable GPU acceleration | `true` |
| `GPU_DEVICE_IDS` | GPU devices to use | `[0]` |
| `USE_MIXED_PRECISION` | Enable FP16/INT8 | `true` |
| `ENABLE_TENSORRT` | Enable TensorRT optimization | `true` |

## Model Optimization

| Setting | Description | Default |
|----------|-------------|----------|
| `ENABLE_MODEL_CACHING` | Cache models in GPU memory | `true` |
| `CACHE_SIZE_MB` | Model cache size | `1024` |
| `ENABLE_MODEL_WARMUP` | Pre-load models on startup | `true` |
| `WARMUP_REQUESTS` | Number of warmup requests | `10` |

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `TRITON_HTTP_PORT` | HTTP port for Triton | `8000` |
| `TRITON_GRPC_PORT` | gRPC port for Triton | `8001` |
| `TRITON_METRICS_PORT` | Metrics port for Triton | `8002` |
| `MODEL_REPOSITORY` | Path to model repository | `/models` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | Service port | `5139` |

## Testing

```bash
# Run tests
docker compose -f docker-compose.dev.yml exec cloud-inference-server pytest

# Run with coverage
docker compose -f docker-compose.dev.yml exec cloud-inference-server pytest --cov=app
```

## Production Deployment

```bash
# Build production image
docker build -t farmiq-inference-server:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

## Monitoring

- **Triton Metrics**: http://localhost:8002/metrics
- **Health Check**: http://localhost:5139/health
- **Performance Metrics**: http://localhost:5139/api/v1/metrics
- **Datadog Integration**: Enabled for APM and metrics
- **Logs**: JSON structured logging

## Troubleshooting

### High Latency

```bash
# Check performance metrics
curl "http://localhost:5139/api/v1/metrics"

# Check Triton metrics
curl "http://localhost:8002/metrics"

# Review batch configuration
# Adjust MAX_BATCH_SIZE and MAX_QUEUE_DELAY_MS
```

### Low Throughput

```bash
# Check GPU utilization
curl "http://localhost:8002/metrics"

# Review batch size distribution
# Increase MAX_BATCH_SIZE if GPU is underutilized
```

### Model Loading Issues

```bash
# Check Triton server logs
docker compose -f docker-compose.dev.yml logs cloud-inference-server

# Verify model files exist in repository
ls -la /models

# Warm up model cache
curl -X POST "http://localhost:5139/api/v1/models/warmup"
```

## Related Services

- **cloud-mlflow-registry**: Model versioning and lifecycle
- **cloud-feature-store**: Feature management for training
- **cloud-drift-detection**: Model performance monitoring
- **cloud-hybrid-router**: Edge-cloud inference coordination
