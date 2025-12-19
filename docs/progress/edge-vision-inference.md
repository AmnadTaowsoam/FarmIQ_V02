Purpose: Progress report and evidence checklist for `edge-vision-inference`.  
Owner: FarmIQ Edge Team  
Last updated: 2025-12-19  

---

# edge-vision-inference — Progress Report

## Scope implemented (MVP)

- FastAPI service on container port `8000` (host `5107` in `edge-layer/docker-compose.yml`).
- Standard endpoints:
  - `GET /api/health` (and alias `GET /health`)
  - `GET /api/ready` (DB connectivity check)
  - `GET /api-docs` (Swagger UI) + `GET /api-docs/openapi.json`
- Inference APIs:
  - `POST /api/v1/inference/jobs` - Create inference job
  - `GET /api/v1/inference/jobs/{jobId}` - Get job status
  - `GET /api/v1/inference/results?sessionId=...` - Get results by session
  - `GET /api/v1/inference/models` - Get model information
- Database schema:
  - `inference_results` table with indexes
  - `sync_outbox` table (shared with other edge services)
- Inference service:
  - MVP: Stub model with deterministic output
  - Reads images from PVC path (`MEDIA_STORAGE_PATH`)
  - Writes results to `inference_results` table
  - Creates `inference.completed` outbox events
- Job management:
  - In-memory job store (MVP)
  - Async job processing
  - Job status tracking (pending, processing, completed, failed)

## Environment variables

See `edge-layer/edge-vision-inference/env.example`.

Key vars:
- `DATABASE_URL` - PostgreSQL connection string
- `MEDIA_STORAGE_PATH` - PVC path for media files (default: `/data/media`)
- `MODEL_PATH` - Path to ML model (optional for MVP stub mode)
- `MODEL_VERSION` - Model version string
- `CONFIDENCE_THRESHOLD` - Confidence threshold for inference
- `WEIGHVISION_SESSION_URL` - URL for weighvision session service
- `DD_SERVICE` - Datadog service name
- `DD_ENV` - Datadog environment

## Database Schema

### `inference_results`
- Stores inference outputs with tenant/farm/barn/device hierarchy
- Links to `session_id` and `media_id`
- Includes `predicted_weight_kg`, `confidence`, `model_version`
- Indexed on `(tenant_id, session_id)` and `(tenant_id, device_id, occurred_at DESC)`

### `sync_outbox`
- Shared table for all edge services
- Stores `inference.completed` events for cloud sync
- Indexed for efficient forwarder consumption

## Evidence steps (docker-compose)

```powershell
cd edge-layer
docker compose build edge-vision-inference
docker compose up -d edge-vision-inference

# Health check
curl http://localhost:5107/api/health

# Ready check
curl http://localhost:5107/api/ready

# Get models
curl http://localhost:5107/api/v1/inference/models

# Create job (example)
curl -X POST http://localhost:5107/api/v1/inference/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "weighvision",
    "mediaId": "media-123",
    "filePath": "/data/media/tenant1/farm1/barn1/session1/image.jpg",
    "sessionId": "session-123",
    "tenantId": "tenant-123",
    "farmId": "farm-123",
    "barnId": "barn-123",
    "deviceId": "device-123"
  }'

# Get job status
curl http://localhost:5107/api/v1/inference/jobs/{jobId}

# Get results by session
curl http://localhost:5107/api/v1/inference/results?sessionId=session-123
```

## Integration

- **Triggered by**: `edge-media-store` via `POST /api/v1/inference/jobs`
- **Sends to**: Creates `inference.completed` events in `sync_outbox` for `edge-sync-forwarder`
- **Reads from**: PVC filesystem at `MEDIA_STORAGE_PATH`

## Notes

- MVP uses stub model with deterministic output based on file size
- In production, replace `InferenceService.run_inference()` with actual ML model loading and inference
- Job store is in-memory (MVP); consider persistent storage for production
- Outbox events are consumed by `edge-sync-forwarder` for cloud sync

