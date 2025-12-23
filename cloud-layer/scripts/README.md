# RabbitMQ Queue Fix Scripts

Scripts to fix RabbitMQ queue configuration issues, specifically the `PRECONDITION_FAILED` error when queue arguments don't match.

## Problem

When a queue already exists in RabbitMQ with different arguments (e.g., `x-dead-letter-exchange`), attempting to declare it with new arguments will fail with:

```
PRECONDITION_FAILED - inequivalent arg 'x-dead-letter-exchange' for queue '...' in vhost '/': received '...' but current is '...'
```

## Solution

These scripts:
1. Delete the problematic queue from RabbitMQ
2. Restart the affected services (which will recreate the queue with correct configuration)

## Usage

### Windows (PowerShell)

```powershell
cd cloud-layer
.\scripts\fix-rabbitmq-queue.ps1
```

With custom parameters:
```powershell
.\scripts\fix-rabbitmq-queue.ps1 `
    -ComposeFile "docker-compose.dev.yml" `
    -QueueName "farmiq.cloud-telemetry-service.ingest.queue" `
    -RabbitMQContainer "farmiq-cloud-rabbitmq"
```

### Linux/Mac (Bash)

```bash
cd cloud-layer
chmod +x scripts/fix-rabbitmq-queue.sh
./scripts/fix-rabbitmq-queue.sh
```

With custom parameters:
```bash
./scripts/fix-rabbitmq-queue.sh \
    docker-compose.dev.yml \
    "farmiq.cloud-telemetry-service.ingest.queue" \
    "farmiq-cloud-rabbitmq" \
    "farmiq" \
    "farmiq_dev" \
    "/"
```

## Parameters

### PowerShell Script

- `-ComposeFile`: Docker Compose file path (default: `docker-compose.dev.yml`)
- `-QueueName`: Queue name to delete (default: `farmiq.cloud-telemetry-service.ingest.queue`)
- `-RabbitMQContainer`: RabbitMQ container name (default: `farmiq-cloud-rabbitmq`)
- `-RabbitMQUser`: RabbitMQ username (default: `farmiq`)
- `-RabbitMQPass`: RabbitMQ password (default: `farmiq_dev`)
- `-VHost`: RabbitMQ virtual host (default: `/`)

### Bash Script

Positional arguments (in order):
1. Docker Compose file path (default: `docker-compose.dev.yml`)
2. Queue name (default: `farmiq.cloud-telemetry-service.ingest.queue`)
3. RabbitMQ container name (default: `farmiq-cloud-rabbitmq`)
4. RabbitMQ username (default: `farmiq`)
5. RabbitMQ password (default: `farmiq_dev`)
6. Virtual host (default: `/`)

## What It Does

1. **Checks Docker**: Verifies Docker is running
2. **Checks RabbitMQ**: Ensures RabbitMQ container is running (starts it if needed)
3. **Waits for RabbitMQ**: Waits up to 60 seconds for RabbitMQ to be ready
4. **Deletes Queue**: Deletes the problematic queue (if it exists)
5. **Restarts Services**: Restarts `cloud-telemetry-service` and `cloud-ingestion`
6. **Verifies**: Checks if queue was recreated correctly

## Services Restarted

- `cloud-telemetry-service` - Will recreate the queue with correct configuration
- `cloud-ingestion` - Restarted to ensure clean state

## Verification

After running the script, check the service logs:

```bash
docker compose -f docker-compose.dev.yml logs -f cloud-telemetry-service
```

You should see:
- No `PRECONDITION_FAILED` errors
- `RabbitMQ consumer setup complete` message
- `Telemetry consumer started` message

## Troubleshooting

### Script fails with "Docker is not running"
- Start Docker Desktop or Docker daemon

### Script fails with "RabbitMQ container is not running"
- The script will attempt to start it automatically
- If it still fails, manually start: `docker compose -f docker-compose.dev.yml up -d rabbitmq`

### Queue still has errors after running script
- Check if there are other queues with similar issues
- Manually delete the queue via RabbitMQ Management UI: http://localhost:5151
- Or use: `docker exec farmiq-cloud-rabbitmq rabbitmqctl delete_queue -p / farmiq.cloud-telemetry-service.ingest.queue`

## Related Files

- `cloud-layer/cloud-telemetry-service/src/utils/rabbitmq.ts` - Queue configuration
- `cloud-layer/cloud-rabbitmq/definitions.json` - RabbitMQ definitions

