# FarmIQ Cloud MLflow Model Registry Service

Enterprise-grade model registry with comprehensive lifecycle management, versioning, and lineage tracking.

## Features

- **Model Versioning**: Semantic versioning with immutable artifacts
- **Lifecycle Management**: Development → Staging → Production → Archived workflow
- **Lineage Tracking**: Complete traceability of data, code, and parent models
- **Stage Transitions**: Controlled promotion with approval workflows
- **Model Comparison**: Side-by-side comparison of model versions
- **Retention Policies**: Automatic archival of old versions
- **REST API**: Full REST API for model operations

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Training  │────▶│   MLflow    │────▶│   Staging   │────▶│ Production  │
│   Pipeline  │     │   Registry   │     │   Testing   │     │   Serving   │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
     │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Code      │     │   Artifacts  │     │   Metrics   │     │   Monitoring│
│   Version   │     │   Storage    │     │   Tracking  │     │   Alerts    │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

## API Endpoints

### Health Checks
- `GET /health` - Service health check
- `GET /ready` - Readiness check with MLflow connection

### Model Operations
- `POST /api/v1/models/register` - Register a new model
- `GET /api/v1/models/{model_name}` - Get model by name
- `GET /api/v1/models/{model_name}/versions` - List all versions
- `POST /api/v1/models/transition` - Transition model stage
- `POST /api/v1/models/archive` - Archive old versions
- `GET /api/v1/models/{model_name}/compare` - Compare two versions
- `GET /api/v1/models/{model_name}/lineage/{version}` - Get model lineage
- `GET /api/v1/models` - List all registered models

## Local Development

From `cloud-layer/`:

```bash
# Build and start the service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build cloud-mlflow-registry

# View logs
docker compose -f docker-compose.dev.yml logs -f cloud-mlflow-registry

# Access MLflow UI
open http://localhost:5136
```

## Usage Examples

### Register a Model

```bash
curl -X POST "http://localhost:5136/api/v1/models/register" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "vision-classification",
    "model_type": "sklearn",
    "description": "Vision model for poultry classification",
    "metrics": {
      "accuracy": 0.95,
      "precision": 0.93,
      "recall": 0.94
    },
    "hyperparameters": {
      "n_estimators": 100,
      "max_depth": 10
    },
    "stage": "development",
    "data_version": "v1.2.3",
    "code_version": "abc123",
    "tags": {
      "team": "vision",
      "priority": "high"
    }
  }'
```

### Get Model

```bash
curl "http://localhost:5136/api/v1/models/vision-classification?stage=production"
```

### Transition Model to Production

```bash
curl -X POST "http://localhost:5136/api/v1/models/transition" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "vision-classification",
    "version": 3,
    "new_stage": "production",
    "description": "Passed all validation tests"
  }'
```

### Compare Models

```bash
curl "http://localhost:5136/api/v1/models/vision-classification/compare?version1=2&version2=3"
```

### List All Models

```bash
curl "http://localhost:5136/api/v1/models"
```

## Model Stages

1. **Development**: Initial training and experimentation
2. **Staging**: Pre-production validation and testing
3. **Production**: Live production deployment
4. **Archived**: Retired but retained for audit
5. **Deprecated**: Marked for removal

## Retention Policies

- Development: 30 days
- Staging: 90 days
- Production: 365 days
- Archived: 1095 days (3 years)

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `MLFLOW_TRACKING_URI` | MLflow tracking server URI | `postgresql://...` |
| `MLFLOW_ARTIFACT_ROOT` | Artifact storage location | `/mlflow/artifacts` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | Service port | `5136` |

## Testing

```bash
# Run tests
docker compose -f docker-compose.dev.yml exec cloud-mlflow-registry pytest

# Run with coverage
docker compose -f docker-compose.dev.yml exec cloud-mlflow-registry pytest --cov=app
```

## Production Deployment

```bash
# Build production image
docker build -t farmiq-mlflow-registry:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

## Monitoring

- **MLflow UI**: http://localhost:5136
- **Health Check**: http://localhost:5136/health
- **Metrics**: Datadog integration enabled
- **Logs**: JSON structured logging

## Troubleshooting

### MLflow Connection Issues
```bash
# Check MLflow database
docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d mlflow_registry

# Check MLflow logs
docker compose -f docker-compose.dev.yml logs cloud-mlflow-registry
```

### Model Registration Failures
- Verify model type is supported
- Check metrics are numeric values
- Ensure stage is valid (development, staging, production, archived, deprecated)

## Related Services

- **cloud-ml-model-service**: Model training and inference
- **cloud-feature-store**: Feature management for training
- **cloud-drift-detection**: Model performance monitoring
- **cloud-inference-server**: High-performance inference
