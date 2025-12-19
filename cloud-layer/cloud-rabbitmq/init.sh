#!/bin/bash
set -e

# Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ to be ready..."
until rabbitmqctl status > /dev/null 2>&1; do
  sleep 2
done

echo "RabbitMQ is ready"

# Load definitions if file exists (exchanges, queues, bindings)
# Note: User is created via RABBITMQ_DEFAULT_USER/RABBITMQ_DEFAULT_PASS env vars
if [ -f /etc/rabbitmq/definitions.json ]; then
  echo "Loading RabbitMQ definitions (exchanges, queues, bindings)..."
  rabbitmqctl import_definitions /etc/rabbitmq/definitions.json || true
fi

echo "RabbitMQ initialization complete"

