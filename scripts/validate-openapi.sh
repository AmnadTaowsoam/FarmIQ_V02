#!/bin/bash
# Validate OpenAPI specifications using Spectral
# Usage: ./scripts/validate-openapi.sh [service-path]

set -e

SERVICE_PATH="${1:-}"

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Check Spectral config
SPECTRAL_CONFIG=".spectral.yaml"
if [ ! -f "$SPECTRAL_CONFIG" ]; then
    echo "Error: Spectral config file not found: $SPECTRAL_CONFIG"
    exit 1
fi

# Find OpenAPI files
if [ -n "$SERVICE_PATH" ] && [ -d "$SERVICE_PATH" ]; then
    # Validate specific service
    OPENAPI_FILE="$SERVICE_PATH/openapi.yaml"
    if [ -f "$OPENAPI_FILE" ]; then
        OPENAPI_FILES=("$OPENAPI_FILE")
    else
        echo "Warning: openapi.yaml not found in $SERVICE_PATH"
        exit 0
    fi
else
    # Find all OpenAPI files
    OPENAPI_FILES=($(find cloud-layer edge-layer -name "openapi.yaml" -type f 2>/dev/null || true))
fi

if [ ${#OPENAPI_FILES[@]} -eq 0 ]; then
    echo "Warning: No OpenAPI files found"
    exit 0
fi

echo "Found ${#OPENAPI_FILES[@]} OpenAPI file(s) to validate"

ERRORS=0
WARNINGS=0

for file in "${OPENAPI_FILES[@]}"; do
    echo ""
    echo "Validating: $file"
    
    if npx --yes @stoplight/spectral-cli lint "$file" --format json > /tmp/spectral-output.json 2>&1; then
        echo "  ✅ Validation passed"
        
        # Count warnings
        WARN_COUNT=$(jq '[.[] | select(.severity == "warn")] | length' /tmp/spectral-output.json 2>/dev/null || echo "0")
        WARNINGS=$((WARNINGS + WARN_COUNT))
    else
        ERRORS=$((ERRORS + 1))
        echo "  ❌ Validation failed"
        
        # Display errors and warnings
        jq -r '.[] | "    \(.severity | ascii_upcase): \(.message) (at \(.path | join(".")))"' /tmp/spectral-output.json 2>/dev/null || cat /tmp/spectral-output.json
    fi
done

echo ""
echo "=== Validation Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    exit 1
fi

exit 0
