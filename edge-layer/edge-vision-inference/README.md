# Vision Inference Service

AI-powered microplate image analysis service using YOLO. This service now has a single responsibility: run inference and send outputs to external services.

## Architecture (current)

```
image → vision-inference-service (Python/FastAPI) →
  • prediction-db-service (HTTP) → PostgreSQL
  • image-ingesion-service (HTTP) → shared-storage
```

Outputs
- prediction_result → prediction-db-service
- raw image → image-ingesion-service → shared-storage/raw-images/original
- annotated image → image-ingesion-service → shared-storage/raw-images/processed

## Quick Start

```bash
pip install -r requirements.txt
cp env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 6403 --reload
```

## API Endpoints

- POST `/api/v1/inference/predict` – run inference on uploaded image
- GET `/api/v1/inference/models` – available models
- GET `/api/v1/inference/status/{run_id}` – run status
- GET `/api/v1/inference/images/{run_id}/annotated` – annotated image
- GET `/api/v1/inference/health` – health

## Configuration (.env)

```bash
# Server
PORT=6403
HOST=0.0.0.0

# Service URLs
PREDICTION_DB_SERVICE_URL=http://prediction-db-service:6404
IMAGE_SERVICE_URL=http://image-ingestion-service:6402

# Message Queue (RabbitMQ - optional for async tasks)
CELERY_BROKER_URL=amqp://guest:guest@rabbitmq:5672//

# Logging (via Winston/Python logging → Datadog)
DD_SERVICE=vision-inference-service
DD_LOGS_INJECTION=true

# AI Model
MODEL_PATH=/app/models/yolo/best.pt
MODEL_VERSION=v1.2.0
CONFIDENCE_THRESHOLD=0.5
NMS_THRESHOLD=0.4
UPLOAD_DIR=/app/uploads
```

## Notes
- No direct database access. All persistence via `prediction-db-service` (HTTP).
- Images are sent via multipart form-data to `image-ingesion-service`.
- Progress and errors are logged to Redis.

## Docker (example)

```bash
docker build -t vision-inference-service .
docker run -p 6403:6403 --env-file .env vision-inference-service
```
