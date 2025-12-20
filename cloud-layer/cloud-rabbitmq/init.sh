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

# Create default user if it doesn't exist (needed when definitions.json is present)
# Wait a bit more for RabbitMQ to be fully initialized
sleep 2
USER="${RABBITMQ_DEFAULT_USER:-farmiq}"
PASS="${RABBITMQ_DEFAULT_PASS:-farmiq_dev}"

if ! rabbitmqctl list_users | grep -q "^${USER}"; then
  echo "Creating user ${USER}..."
  rabbitmqctl add_user "${USER}" "${PASS}" || true
fi

# Set permissions for default user
echo "Setting permissions for user ${USER}..."
rabbitmqctl set_permissions -p / "${USER}" ".*" ".*" ".*" || true

echo "RabbitMQ initialization complete"

