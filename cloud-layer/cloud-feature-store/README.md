# FarmIQ Cloud Feature Store Service

Enterprise-grade feature management using Feast for centralized feature storage and serving.

## Features

- **Centralized Features**: Single source of truth for all ML features
- **Online Serving**: Low-latency (< 50ms) real-time feature retrieval
- **Offline Storage**: Historical features for training with time-travel
- **Feature Versioning**: Complete lineage and change tracking
- **Consistency Validation**: Automated validation between online/offline stores
- **Domain-Specific**: Tailored features for poultry farming

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Data      │────▶│   Feature    │────▶│   Online    │────▶│   ML       │
│   Sources   │     │   Store      │     │   Store     │     │   Models    │
│  (Batch/    │     │   (Feast)    │     │   (Redis)   │     │ (Training/  │
│   Stream)    │     └──────────────┘     └─────────────┘     │   Inference) │
└─────────────┘              │                   │                   └─────────────┘
                            │                   │
                            ▼                   ▼
                     ┌──────────────┐     ┌─────────────┐
                     │   Offline     │     │   Feature   │
                     │   Store       │     │   Registry  │
                     │ (PostgreSQL)  │     │   (SQLite)  │
                     └──────────────┘     └─────────────┘
```

## FarmIQ Feature Domains

### Barn Telemetry Features
- Temperature (avg, min, max)
- Humidity percentage
- Ammonia levels (ppm)
- CO2 levels (ppm)
- Airflow rate
- Lighting intensity
- Water consumption
- Feed consumption
- Device status

### Bird Performance Features
- Weight and weight gain
- Feed conversion ratio
- Water intake
- Health score
- Activity level
- Growth rate
- Uniformity score
- Mortality rate
- Cull rate

### Feed Consumption Features
- Feed type and batch ID
- Consumption per bird
- Feed cost per kg
- Feed efficiency ratio
- Protein content
- Energy content
- Inventory levels

### Environmental Features
- Temperature
- Humidity
- Ammonia levels
- CO2 levels
- Air quality index
- Ventilation rate
- Light intensity
- Noise level
- Dust level
- Thermal comfort index

## API Endpoints

### Health Checks
- `GET /health` - Service health check
- `GET /ready` - Readiness check with feature store connection

### Feature Serving
- `POST /api/v1/features/online` - Retrieve real-time features
- `POST /api/v1/features/historical` - Retrieve historical features

### Feature Management
- `POST /api/v1/features/materialize` - Materialize feature updates
- `POST /api/v1/features/validate` - Validate consistency

### Feature Discovery
- `GET /api/v1/features/views` - List all feature views
- `GET /api/v1/features/views/{view_name}/statistics` - Get view statistics

### FarmIQ-Specific
- `GET /api/v1/features/barn/{barn_id}` - Get barn telemetry
- `GET /api/v1/features/batch/{batch_id}` - Get batch performance

## Local Development

From `cloud-layer/`:

```bash
# Build and start service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build cloud-feature-store

# View logs
docker compose -f docker-compose.dev.yml logs -f cloud-feature-store

# Access Feast UI
open http://localhost:6566
```

## Usage Examples

### Get Online Features (Real-time)

```bash
curl -X POST "http://localhost:5137/api/v1/features/online" \
  -H "Content-Type: application/json" \
  -d '{
    "feature_view_name": "barn_telemetry_features",
    "entity_rows": [
      {"barn_id": "barn-001"}
    ],
    "feature_names": [
      "avg_temperature_c",
      "avg_humidity_percent",
      "avg_ammonia_ppm"
    ]
  }'
```

### Get Historical Features (Training)

```bash
curl -X POST "http://localhost:5137/api/v1/features/historical" \
  -H "Content-Type: application/json" \
  -d '{
    "feature_view_name": "bird_performance_features",
    "entity_keys": [
      {"batch_id": "batch-001"}
    ],
    "timestamps": [
      "2025-01-20T00:00:00Z"
    ],
    "feature_names": [
      "weight_grams",
      "feed_conversion_ratio",
      "health_score"
    ]
  }'
```

### Get Barn Features

```bash
curl "http://localhost:5137/api/v1/features/barn/barn-001?feature_names=avg_temperature_c,avg_humidity_percent,avg_ammonia_ppm"
```

### Get Batch Features

```bash
curl "http://localhost:5137/api/v1/features/batch/batch-001?feature_names=weight_grams,feed_conversion_ratio,health_score"
```

### Materialize Features

```bash
curl -X POST "http://localhost:5137/api/v1/features/materialize" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-01-20T00:00:00Z",
    "end_date": "2025-01-21T00:00:00Z"
  }'
```

### List Feature Views

```bash
curl "http://localhost:5137/api/v1/features/views"
```

## Feature Freshness

- **Real-time Features**: < 5 minutes
- **Batch Features**: < 1 hour
- **TTL Policy**: 30 days default (configurable)

## Performance Targets

- **Online Serving Latency**: < 50ms (P95)
- **Batch Query Timeout**: 300 seconds
- **Feature Freshness**: < 5 minutes for real-time

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `REDIS_HOST` | Redis host for online store | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `POSTGRES_HOST` | PostgreSQL host for offline store | `postgres` |
| `POSTGRES_DB` | Feature store database | `feature_store` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | Service port | `5137` |

## Testing

```bash
# Run tests
docker compose -f docker-compose.dev.yml exec cloud-feature-store pytest

# Run with coverage
docker compose -f docker-compose.dev.yml exec cloud-feature-store pytest --cov=app
```

## Production Deployment

```bash
# Build production image
docker build -t farmiq-feature-store:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

## Monitoring

- **Feast UI**: http://localhost:6566
- **Health Check**: http://localhost:5137/health
- **Metrics**: Datadog integration enabled
- **Logs**: JSON structured logging

## Troubleshooting

### Feature Store Connection Issues
```bash
# Check Redis connection
docker compose -f docker-compose.dev.yml exec redis redis-cli ping

# Check PostgreSQL connection
docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d feature_store

# Check Feast logs
docker compose -f docker-compose.dev.yml logs cloud-feature-store
```

### Feature Retrieval Failures
- Verify feature view exists
- Check entity keys are correct
- Ensure features are materialized
- Check TTL hasn't expired

## Related Services

- **cloud-mlflow-registry**: Model versioning and lifecycle
- **cloud-drift-detection**: Model performance monitoring
- **cloud-inference-server**: High-performance inference
- **cloud-hybrid-router**: Edge-cloud inference coordination
