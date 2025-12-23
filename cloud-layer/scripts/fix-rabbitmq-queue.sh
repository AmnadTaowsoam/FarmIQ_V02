#!/bin/bash
# Bash script to fix RabbitMQ queue configuration issues
# This script deletes problematic queues and restarts related services

set -e

COMPOSE_FILE="${1:-docker-compose.dev.yml}"
QUEUE_NAME="${2:-farmiq.cloud-telemetry-service.ingest.queue}"
RABBITMQ_CONTAINER="${3:-farmiq-cloud-rabbitmq}"
RABBITMQ_USER="${4:-farmiq}"
RABBITMQ_PASS="${5:-farmiq_dev}"
VHOST="${6:-/}"

echo "========================================"
echo "RabbitMQ Queue Fix Script"
echo "========================================"
echo ""

# Check if Docker is running
echo "Checking Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "✗ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✓ Docker is running"

# Check if RabbitMQ container is running
echo ""
echo "Checking RabbitMQ container..."
if ! docker ps --format "{{.Names}}" | grep -q "^${RABBITMQ_CONTAINER}$"; then
    echo "✗ RabbitMQ container '${RABBITMQ_CONTAINER}' is not running."
    echo "  Starting RabbitMQ..."
    docker compose -f "$COMPOSE_FILE" up -d rabbitmq
    sleep 5
else
    echo "✓ RabbitMQ container is running"
fi

# Wait for RabbitMQ to be ready
echo ""
echo "Waiting for RabbitMQ to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$READY" = false ]; do
    if docker exec "$RABBITMQ_CONTAINER" rabbitmqctl status > /dev/null 2>&1; then
        READY=true
        echo "✓ RabbitMQ is ready"
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    fi
done

if [ "$READY" = false ]; then
    echo "✗ RabbitMQ did not become ready in time"
    exit 1
fi

# Delete the problematic queue
echo ""
echo "Deleting queue: $QUEUE_NAME"
if docker exec "$RABBITMQ_CONTAINER" rabbitmqctl delete_queue -p "$VHOST" "$QUEUE_NAME" 2>&1; then
    echo "✓ Queue deleted successfully"
else
    # Queue might not exist, which is okay
    if docker exec "$RABBITMQ_CONTAINER" rabbitmqctl list_queues -p "$VHOST" name | grep -q "$QUEUE_NAME"; then
        echo "⚠ Warning: Could not delete queue (it may not exist)"
    else
        echo "ℹ Queue does not exist (this is okay)"
    fi
fi

# Restart services
echo ""
echo "Restarting services..."
echo "  - cloud-telemetry-service"
docker compose -f "$COMPOSE_FILE" restart cloud-telemetry-service

echo "  - cloud-ingestion"
docker compose -f "$COMPOSE_FILE" restart cloud-ingestion

echo ""
echo "✓ Services restarted"

# Wait a bit for services to start
echo ""
echo "Waiting for services to initialize..."
sleep 3

# Verify queue was recreated with correct configuration
echo ""
echo "Verifying queue configuration..."
if docker exec "$RABBITMQ_CONTAINER" rabbitmqctl list_queues -p "$VHOST" name arguments 2>&1 | grep -q "$QUEUE_NAME"; then
    echo "✓ Queue exists"
    docker exec "$RABBITMQ_CONTAINER" rabbitmqctl list_queues -p "$VHOST" name arguments | grep "$QUEUE_NAME"
else
    echo "ℹ Queue will be created when service starts consuming"
fi

echo ""
echo "========================================"
echo "Done! Check service logs to verify:"
echo "  docker compose -f $COMPOSE_FILE logs -f cloud-telemetry-service"
echo "========================================"

