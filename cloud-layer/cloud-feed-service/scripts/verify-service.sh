#!/bin/bash
# Verification script for cloud-feed-service
# Usage: ./scripts/verify-service.sh [BASE_URL]
# Default BASE_URL: http://localhost:5130

BASE_URL="${1:-http://localhost:5130}"
TENANT_ID="${TENANT_ID:-018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001}"
FARM_ID="${FARM_ID:-018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002}"
BARN_ID="${BARN_ID:-018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003}"

echo "=== Verifying cloud-feed-service ==="
echo "Base URL: $BASE_URL"
echo ""

# Health check
echo "1. Health Check:"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/health"
echo ""

# Ready check
echo "2. Ready Check:"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/ready"
echo ""

# Create intake record (with idempotency)
echo "3. Create Feed Intake Record (Idempotent):"
IDEMPOTENCY_KEY="test-intake-$(date +%s)"
curl -s -X POST "$BASE_URL/api/v1/feed/intake-records" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"farmId\": \"$FARM_ID\",
    \"barnId\": \"$BARN_ID\",
    \"source\": \"MANUAL\",
    \"quantityKg\": 100.5,
    \"occurredAt\": \"2025-01-02T06:00:00Z\",
    \"externalRef\": \"test-ext-ref-001\"
  }" | jq '.' || echo "Response received"
echo ""

# Retry same request (should return same record)
echo "4. Retry Same Request (Idempotency Test):"
curl -s -X POST "$BASE_URL/api/v1/feed/intake-records" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"farmId\": \"$FARM_ID\",
    \"barnId\": \"$BARN_ID\",
    \"source\": \"MANUAL\",
    \"quantityKg\": 100.5,
    \"occurredAt\": \"2025-01-02T06:00:00Z\",
    \"externalRef\": \"test-ext-ref-001\"
  }" | jq '.' || echo "Response received"
echo ""

# List intake records
echo "5. List Feed Intake Records:"
curl -s "$BASE_URL/api/v1/feed/intake-records?tenantId=$TENANT_ID&barnId=$BARN_ID&limit=10" | jq '.' || echo "Response received"
echo ""

# Create formula
echo "6. Create Feed Formula:"
curl -s -X POST "$BASE_URL/api/v1/feed/formulas" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"name\": \"Test Starter Feed\",
    \"species\": \"broiler\",
    \"proteinPct\": 22.5,
    \"energyKcalPerKg\": 3000,
    \"externalRef\": \"test-formula-001\"
  }" | jq '.' || echo "Response received"
echo ""

# List formulas
echo "7. List Feed Formulas:"
curl -s "$BASE_URL/api/v1/feed/formulas?tenantId=$TENANT_ID&limit=10" | jq '.' || echo "Response received"
echo ""

echo "=== Verification Complete ==="

