#!/bin/bash
# Verify Docker Compose Configuration
# Checks that BFF has all required service URL environment variables

set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.dev.yml}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUD_LAYER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_PATH="$CLOUD_LAYER_DIR/$COMPOSE_FILE"

echo "Verifying Docker Compose configuration: $COMPOSE_FILE"

if [ ! -f "$COMPOSE_PATH" ]; then
    echo "ERROR: Compose file not found: $COMPOSE_PATH" >&2
    exit 1
fi

# Run docker compose config
echo ""
echo "Running: docker compose -f $COMPOSE_FILE config"
CONFIG_OUTPUT=$(docker compose -f "$COMPOSE_PATH" config 2>&1)

if [ $? -ne 0 ]; then
    echo "ERROR: docker compose config failed" >&2
    echo "$CONFIG_OUTPUT" >&2
    exit 1
fi

# Check for required BFF env vars
REQUIRED_VARS=(
    "REGISTRY_BASE_URL"
    "FEED_SERVICE_URL"
    "BARN_RECORDS_SERVICE_URL"
    "TELEMETRY_BASE_URL"
    "ANALYTICS_BASE_URL"
    "REPORTING_EXPORT_BASE_URL"
)

echo ""
echo "Checking BFF environment variables..."
MISSING=()
FOUND=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if echo "$CONFIG_OUTPUT" | grep -qE "^[[:space:]]*${VAR}[[:space:]]*:"; then
        VALUE=$(echo "$CONFIG_OUTPUT" | grep -E "^[[:space:]]*${VAR}[[:space:]]*:" | sed -E "s/^[[:space:]]*${VAR}[[:space:]]*:[[:space:]]*(.+)$/\1/" | tr -d ' ')
        echo "  ✓ $VAR = $VALUE"
        FOUND+=("$VAR")
    else
        echo "  ✗ $VAR - MISSING"
        MISSING+=("$VAR")
    fi
done

# Check for optional WEIGHVISION_READMODEL_BASE_URL
if echo "$CONFIG_OUTPUT" | grep -qE "^[[:space:]]*WEIGHVISION_READMODEL_BASE_URL[[:space:]]*:"; then
    VALUE=$(echo "$CONFIG_OUTPUT" | grep -E "^[[:space:]]*WEIGHVISION_READMODEL_BASE_URL[[:space:]]*:" | sed -E "s/^[[:space:]]*WEIGHVISION_READMODEL_BASE_URL[[:space:]]*:[[:space:]]*(.+)$/\1/" | tr -d ' ')
    echo "  ⚠ WEIGHVISION_READMODEL_BASE_URL = $VALUE (service not in compose)"
else
    echo "  ⚠ WEIGHVISION_READMODEL_BASE_URL - MISSING (expected if service exists)"
fi

# Output resolved config to evidence directory
EVIDENCE_DIR="$CLOUD_LAYER_DIR/evidence"
mkdir -p "$EVIDENCE_DIR"

OUTPUT_FILE="$EVIDENCE_DIR/compose.${COMPOSE_FILE%.yml}.resolved.yml"
echo ""
echo "Writing resolved config to: $OUTPUT_FILE"
echo "$CONFIG_OUTPUT" > "$OUTPUT_FILE"

# Summary
echo ""
echo "Summary:"
echo "  Required vars found: ${#FOUND[@]}/${#REQUIRED_VARS[@]}"
if [ ${#MISSING[@]} -gt 0 ]; then
    echo "  Missing vars: ${MISSING[*]}" >&2
    exit 1
else
    echo "  All required environment variables present ✓"
    exit 0
fi

