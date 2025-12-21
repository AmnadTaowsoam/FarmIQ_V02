#!/bin/bash
# Verification script for cloud-barn-records-service
# Usage: ./scripts/verify-service.sh [BASE_URL]
# Default BASE_URL: http://localhost:5131

BASE_URL="${1:-http://localhost:5131}"
TENANT_ID="${TENANT_ID:-018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0001}"
FARM_ID="${FARM_ID:-018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0002}"
BARN_ID="${BARN_ID:-018f1a84-bb0e-7d3f-b2e4-9e8b5f8e0003}"

echo "=== Verifying cloud-barn-records-service ==="
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

# Create morbidity event
echo "3. Create Morbidity Event (Idempotent):"
IDEMPOTENCY_KEY="test-morb-$(date +%s)"
curl -s -X POST "$BASE_URL/api/v1/barn-records/morbidity" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"farmId\": \"$FARM_ID\",
    \"barnId\": \"$BARN_ID\",
    \"occurredAt\": \"2025-01-02T06:00:00Z\",
    \"diseaseCode\": \"coccidiosis\",
    \"severity\": \"medium\",
    \"animalCount\": 20,
    \"externalRef\": \"test-morb-ref-001\"
  }" | jq '.' || echo "Response received"
echo ""

# Retry same request (idempotency test)
echo "4. Retry Same Request (Idempotency Test):"
curl -s -X POST "$BASE_URL/api/v1/barn-records/morbidity" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"farmId\": \"$FARM_ID\",
    \"barnId\": \"$BARN_ID\",
    \"occurredAt\": \"2025-01-02T06:00:00Z\",
    \"diseaseCode\": \"coccidiosis\",
    \"severity\": \"medium\",
    \"animalCount\": 20,
    \"externalRef\": \"test-morb-ref-001\"
  }" | jq '.' || echo "Response received"
echo ""

# Create daily count
echo "5. Create Daily Count:"
curl -s -X POST "$BASE_URL/api/v1/barn-records/daily-counts" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"farmId\": \"$FARM_ID\",
    \"barnId\": \"$BARN_ID\",
    \"recordDate\": \"2025-01-02\",
    \"animalCount\": 1000,
    \"averageWeightKg\": 2.5,
    \"externalRef\": \"test-count-ref-001\"
  }" | jq '.' || echo "Response received"
echo ""

# List daily counts
echo "6. List Daily Counts:"
curl -s "$BASE_URL/api/v1/barn-records/daily-counts?tenantId=$TENANT_ID&barnId=$BARN_ID&limit=10" | jq '.' || echo "Response received"
echo ""

# Create mortality event
echo "7. Create Mortality Event:"
curl -s -X POST "$BASE_URL/api/v1/barn-records/mortality" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"farmId\": \"$FARM_ID\",
    \"barnId\": \"$BARN_ID\",
    \"occurredAt\": \"2025-01-02T07:00:00Z\",
    \"causeCode\": \"disease\",
    \"animalCount\": 5,
    \"externalRef\": \"test-mort-ref-001\"
  }" | jq '.' || echo "Response received"
echo ""

echo "=== Verification Complete ==="

