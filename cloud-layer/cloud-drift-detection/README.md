# FarmIQ Cloud Drift Detection & Retraining Service

Automated monitoring of model performance degradation and data distribution changes with intelligent retraining triggers.

## Features

- **Data Drift Detection**: PSI, KS test, Wasserstein distance
- **Concept Drift Detection**: DDM method, prediction distribution shift
- **Automated Retraining**: Intelligent triggers based on drift severity
- **Performance Monitoring**: Track model metrics over time
- **Cooldown Management**: Prevent excessive retraining cycles
- **Multi-Method Detection**: Comprehensive drift analysis

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  Production │────▶│   Drift      │────▶│   Alert      │────▶│  Retraining │
│  Model     │     │   Detector   │     │   Engine    │     │  Pipeline   │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
     │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  Reference  │     │   Current    │     │   Model     │     │   Model     │
│  Data       │     │   Data       │     │   Registry  │     │   Training  │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

## Drift Detection Methods

### Data Drift (Covariate Shift)
- **PSI (Population Stability Index)**: Measures distribution change
- **KS Test**: Kolmogorov-Smirnov test
- **Wasserstein Distance**: Earth mover's distance

### Concept Drift (P(Y|X) Change)
- **DDM (Drift Detection Method)**: Tracks error rate changes
- **Prediction Distribution Shift**: Chi-square/KS test on predictions

## API Endpoints

### Health Checks
- `GET /health` - Service health check
- `GET /ready` - Readiness check

### Reference Data Management
- `POST /api/v1/drift/reference` - Set reference baseline
- `GET /api/v1/drift/reference/{model_id}` - Get reference data

### Drift Detection
- `POST /api/v1/detect/check` - Check for drift (single method)
- `POST /api/v1/detect/comprehensive` - Comprehensive drift check (all methods)

### Retraining
- `POST /api/v1/retraining/decision` - Make retraining decision
- `POST /api/v1/retraining/trigger` - Trigger retraining pipeline

### Model Metrics
- `POST /api/v1/models/{model_id}/metrics` - Record model metrics
- `GET /api/v1/models/{model_id}/metrics` - Get model metrics
- `GET /api/v1/models` - List all monitored models

## Local Development

From `cloud-layer/`:

```bash
# Build and start service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build cloud-drift-detection

# View logs
docker compose -f docker-compose.dev.yml logs -f cloud-drift-detection
```

## Usage Examples

### Set Reference Data

```bash
curl -X POST "http://localhost:5138/api/v1/drift/reference" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "vision-classification-v1",
    "data": [
      {"temperature": 25.5, "humidity": 65.0},
      {"temperature": 26.0, "humidity": 66.0}
    ],
    "predictions": [0.95, 0.93],
    "targets": [1, 0]
  }'
```

### Check for Drift

```bash
curl -X POST "http://localhost:5138/api/v1/detect/check" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "vision-classification-v1",
    "current_data": [
      {"temperature": 28.0, "humidity": 70.0},
      {"temperature": 29.0, "humidity": 72.0}
    ],
    "current_predictions": [0.85, 0.80],
    "drift_type": "data_drift"
  }'
```

### Comprehensive Drift Check

```bash
curl -X POST "http://localhost:5138/api/v1/detect/comprehensive" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "vision-classification-v1",
    "current_data": [
      {"temperature": 28.0, "humidity": 70.0}
    ],
    "current_predictions": [0.85, 0.80],
    "current_targets": [1, 0],
    "drift_type": "data_drift"
  }'
```

### Make Retraining Decision

```bash
curl -X POST "http://localhost:5138/api/v1/retraining/decision" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "vision-classification-v1",
    "drift_results": [
      {
        "drift_type": "data_drift",
        "severity": "high",
        "score": 0.35,
        "threshold": 0.2,
        "features_affected": ["temperature", "humidity"],
        "timestamp": "2025-01-26T07:00:00Z"
      }
    ]
  }'
```

### Trigger Retraining

```bash
curl -X POST "http://localhost:5138/api/v1/retraining/trigger" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "vision-classification-v1",
    "force": false
  }'
```

### Record Model Metrics

```bash
curl -X POST "http://localhost:5138/api/v1/models/vision-classification-v1/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "accuracy": 0.95,
    "precision": 0.93,
    "recall": 0.94,
    "f1_score": 0.935,
    "inference_latency_ms": 45.2,
    "throughput_per_second": 120.5
  }'
```

### List Monitored Models

```bash
curl "http://localhost:5138/api/v1/models"
```

## Drift Severity Levels

| Severity | Score Range | Action |
|----------|-------------|--------|
| None | < 0.1 × threshold | No action |
| Low | 0.1-1.0 × threshold | Monitor closely |
| Medium | 1.0-1.5 × threshold | Consider retraining |
| High | 1.5-2.0 × threshold | Plan retraining |
| Critical | > 2.0 × threshold | Immediate retraining |

## Retraining Policies

- **Minimum Data Points**: 10,000 samples
- **Cooldown Period**: 24 hours between retraining cycles
- **Auto-Approve**: Disabled by default (requires manual approval)
- **Cost per Training**: $100 (estimated)

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `DATA_DRIFT_THRESHOLD` | Threshold for data drift | `0.2` |
| `CONCEPT_DRIFT_THRESHOLD` | Threshold for concept drift | `0.1` |
| `DRIFT_METHOD` | Statistical method to use | `psi` |
| `MIN_DATA_POINTS` | Minimum samples for retraining | `10000` |
| `COOLDOWN_HOURS` | Hours between retraining | `24` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | Service port | `5138` |

## Testing

```bash
# Run tests
docker compose -f docker-compose.dev.yml exec cloud-drift-detection pytest

# Run with coverage
docker compose -f docker-compose.dev.yml exec cloud-drift-detection pytest --cov=app
```

## Production Deployment

```bash
# Build production image
docker build -t farmiq-drift-detection:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

## Monitoring

- **Health Check**: http://localhost:5138/health
- **Metrics**: Datadog integration enabled
- **Logs**: JSON structured logging
- **Alerts**: RabbitMQ notifications for critical drift

## Troubleshooting

### Reference Data Not Set

```bash
# Check drift detector status
curl "http://localhost:5138/ready"

# Set reference data first
curl -X POST "http://localhost:5138/api/v1/drift/reference" \
  -H "Content-Type: application/json" \
  -d '{"model_id": "test", "data": [{"feature": 1.0}]}'
```

### Drift Detection Failures

- Verify reference data is set
- Check current data format matches reference
- Ensure feature names are consistent
- Review drift thresholds for your use case

### Retraining Not Triggered

- Check cooldown period hasn't been exceeded
- Verify drift severity meets threshold
- Check minimum data points requirement
- Review auto-approve setting

## Related Services

- **cloud-mlflow-registry**: Model versioning and lifecycle
- **cloud-feature-store**: Feature management for training
- **cloud-inference-server**: High-performance inference
- **cloud-hybrid-router**: Edge-cloud inference coordination
