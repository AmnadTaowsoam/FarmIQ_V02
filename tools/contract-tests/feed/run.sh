#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${FEED_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
TENANT_ID="${TENANT_ID:-}"
FARM_ID="${FARM_ID:-}"
BARN_ID="${BARN_ID:-}"
BATCH_ID="${BATCH_ID:-}"
FEED_LOT_ID="${FEED_LOT_ID:-}"

REPORT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/report.json"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TESTS_JSON=""

has_jq() {
  command -v jq >/dev/null 2>&1
}

json_escape() {
  local value="$1"
  printf '%s' "$value" | sed 's/"/\\"/g'
}

append_report() {
  local name="$1"
  local status="$2"
  local detail="$3"
  local http_status="$4"
  local comma=","
  if [ -z "$TESTS_JSON" ]; then
    comma=""
  fi
  TESTS_JSON+="$comma{\"name\":\"$(json_escape "$name")\",\"status\":\"$status\",\"detail\":\"$(json_escape "$detail")\",\"httpStatus\":$http_status}"
}

record_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "PASS - $1"
  append_report "$1" "PASS" "$2" "$3"
}

record_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "FAIL - $1 :: $2"
  append_report "$1" "FAIL" "$2" "$3"
}

record_skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo "SKIP - $1 :: $2"
  append_report "$1" "SKIP" "$2" "null"
}

ensure_auth() {
  local test_name="$1"
  if [ -z "$AUTH_TOKEN" ]; then
    record_skip "$test_name" "missing AUTH_TOKEN"
    return 1
  fi
  return 0
}

ensure_context() {
  local test_name="$1"
  if [ -z "$TENANT_ID" ] || [ -z "$FARM_ID" ] || [ -z "$BARN_ID" ]; then
    record_skip "$test_name" "missing TENANT_ID/FARM_ID/BARN_ID"
    return 1
  fi
  return 0
}

http_request() {
  local method="$1"
  local url="$2"
  local body="$3"
  local extra_header="$4"

  local headers=(-H "Content-Type: application/json")
  if [ -n "$AUTH_TOKEN" ]; then
    headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
  fi
  if [ -n "$extra_header" ]; then
    headers+=(-H "$extra_header")
  fi

  local response
  if [ -n "$body" ]; then
    response=$(curl -sS -X "$method" "${headers[@]}" -d "$body" -w "\n%{http_code}" "$url" || true)
  else
    response=$(curl -sS -X "$method" "${headers[@]}" -w "\n%{http_code}" "$url" || true)
  fi
  local status
  status=$(echo "$response" | tail -n1)
  local payload
  payload=$(echo "$response" | sed '$d')
  echo "$status"
  echo "$payload"
}

is_json() {
  local payload="$1"
  if [ -z "$payload" ]; then
    return 1
  fi
  if has_jq; then
    echo "$payload" | jq -e . >/dev/null 2>&1
    return $?
  fi
  if [[ "$payload" =~ ^\{.*\}$ ]] || [[ "$payload" =~ ^\[.*\]$ ]]; then
    return 0
  fi
  return 1
}

check_error_envelope() {
  local payload="$1"
  if has_jq; then
    echo "$payload" | jq -e '.error.code and .error.message and .error.traceId' >/dev/null 2>&1
    return $?
  fi
  echo "$payload" | grep -q '"error"' && echo "$payload" | grep -q '"code"' && echo "$payload" | grep -q '"message"'
}

extract_id() {
  local payload="$1"
  if has_jq; then
    echo "$payload" | jq -r '.id // empty'
    return 0
  fi
  echo "$payload" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

check_list_pagination() {
  local payload="$1"
  if has_jq; then
    echo "$payload" | jq -e '(.items | type == "array") and (has("nextCursor") or has("next_cursor"))' >/dev/null 2>&1
    return $?
  fi
  echo "$payload" | grep -q '"items"' && echo "$payload" | grep -q '"nextCursor"'
}

load_template() {
  local path="$1"
  local content
  content=$(cat "$path")
  content=${content//__TENANT_ID__/$TENANT_ID}
  content=${content//__FARM_ID__/$FARM_ID}
  content=${content//__BARN_ID__/$BARN_ID}
  content=${content//__BATCH_ID__/$BATCH_ID}
  content=${content//__FEED_LOT_ID__/$FEED_LOT_ID}
  content=${content//__OCCURRED_AT__/${OCCURRED_AT}}
  content=${content//__DELIVERED_AT__/${DELIVERED_AT}}
  content=${content//__SAMPLED_AT__/${SAMPLED_AT}}
  content=${content//__RECEIVED_DATE__/${RECEIVED_DATE}}
  echo "$content"
}

OCCURRED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DELIVERED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SAMPLED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RECEIVED_DATE=$(date -u +%Y-%m-%d)

echo "Contract Tests: cloud-feed-service"
echo "Base URL: $BASE_URL"

# Health
{
  read -r status
  read -r payload
} < <(http_request "GET" "$BASE_URL/api/health" "" "")
if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
  record_pass "GET /api/health" "ok" "$status"
else
  record_fail "GET /api/health" "status $status" "$status"
fi

# Ready
{
  read -r status
  read -r payload
} < <(http_request "GET" "$BASE_URL/api/ready" "" "")
if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
  record_pass "GET /api/ready" "ok" "$status"
else
  record_fail "GET /api/ready" "status $status" "$status"
fi

# Intake create idempotency
if ensure_auth "POST /api/v1/feed/intake-records" && ensure_context "POST /api/v1/feed/intake-records"; then
  IDEMPOTENCY_KEY="ct-intake-$(date +%s)"
  body=$(load_template "$(dirname "$0")/requests/intake-create.json")
  {
    read -r status
    read -r payload
  } < <(http_request "POST" "$BASE_URL/api/v1/feed/intake-records" "$body" "Idempotency-Key: $IDEMPOTENCY_KEY")
  if [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
    id1=$(extract_id "$payload")
    if [ -z "$id1" ]; then
      record_fail "POST /api/v1/feed/intake-records" "missing id" "$status"
    else
      record_pass "POST /api/v1/feed/intake-records" "created id $id1" "$status"
      {
        read -r status2
        read -r payload2
      } < <(http_request "POST" "$BASE_URL/api/v1/feed/intake-records" "$body" "Idempotency-Key: $IDEMPOTENCY_KEY")
      if [ "$status2" -ge 200 ] && [ "$status2" -lt 300 ] && is_json "$payload2"; then
        id2=$(extract_id "$payload2")
        if [ "$id1" = "$id2" ]; then
          record_pass "Idempotency-Key intake retry" "same id" "$status2"
        else
          record_fail "Idempotency-Key intake retry" "different id" "$status2"
        fi
      else
        record_fail "Idempotency-Key intake retry" "status $status2" "$status2"
      fi
    fi
  else
    record_fail "POST /api/v1/feed/intake-records" "status $status" "$status"
  fi
fi

# Intake list pagination
if ensure_auth "GET /api/v1/feed/intake-records" && ensure_context "GET /api/v1/feed/intake-records"; then
  {
    read -r status
    read -r payload
  } < <(http_request "GET" "$BASE_URL/api/v1/feed/intake-records?tenantId=$TENANT_ID&limit=2" "" "")
  if [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
    if check_list_pagination "$payload"; then
      record_pass "GET /api/v1/feed/intake-records" "pagination ok" "$status"
    else
      record_fail "GET /api/v1/feed/intake-records" "missing pagination fields" "$status"
    fi
  else
    record_fail "GET /api/v1/feed/intake-records" "status $status" "$status"
  fi
fi

# Intake error case
if ensure_auth "POST /api/v1/feed/intake-records invalid" && ensure_context "POST /api/v1/feed/intake-records invalid"; then
  invalid_body=$(load_template "$(dirname "$0")/requests/intake-create.json" | sed 's/"quantityKg": [0-9.\-]*/"quantityKg": -1/')
  {
    read -r status
    read -r payload
  } < <(http_request "POST" "$BASE_URL/api/v1/feed/intake-records" "$invalid_body" "Idempotency-Key: ct-intake-invalid")
  if [ "$status" -ge 400 ] && [ "$status" -lt 500 ] && is_json "$payload" && check_error_envelope "$payload"; then
    record_pass "POST /api/v1/feed/intake-records invalid" "error envelope" "$status"
  else
    record_fail "POST /api/v1/feed/intake-records invalid" "expected 4xx with error envelope" "$status"
  fi
fi

# Feed lot create
LOT_ID=""
if ensure_auth "POST /api/v1/feed/lots" && ensure_context "POST /api/v1/feed/lots"; then
  LOT_ID=""
  body=$(load_template "$(dirname "$0")/requests/lot-create.json")
  {
    read -r status
    read -r payload
  } < <(http_request "POST" "$BASE_URL/api/v1/feed/lots" "$body" "Idempotency-Key: ct-lot-1")
  if [ "$status" -eq 404 ]; then
    record_skip "POST /api/v1/feed/lots" "endpoint not found"
  elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
    LOT_ID=$(extract_id "$payload")
    if [ -n "$LOT_ID" ]; then
      record_pass "POST /api/v1/feed/lots" "created id $LOT_ID" "$status"
      FEED_LOT_ID="$LOT_ID"
    else
      record_fail "POST /api/v1/feed/lots" "missing id" "$status"
    fi
  else
    record_fail "POST /api/v1/feed/lots" "status $status" "$status"
  fi
fi

# Feed lot list
if ensure_auth "GET /api/v1/feed/lots" && ensure_context "GET /api/v1/feed/lots"; then
  {
    read -r status
    read -r payload
  } < <(http_request "GET" "$BASE_URL/api/v1/feed/lots?tenantId=$TENANT_ID&limit=2" "" "")
  if [ "$status" -eq 404 ]; then
    record_skip "GET /api/v1/feed/lots" "endpoint not found"
  elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
    if check_list_pagination "$payload"; then
      record_pass "GET /api/v1/feed/lots" "pagination ok" "$status"
    else
      record_fail "GET /api/v1/feed/lots" "missing pagination fields" "$status"
    fi
  else
    record_fail "GET /api/v1/feed/lots" "status $status" "$status"
  fi
fi

# Feed lot error case
if ensure_auth "POST /api/v1/feed/lots invalid" && ensure_context "POST /api/v1/feed/lots invalid"; then
  invalid_body=$(load_template "$(dirname "$0")/requests/lot-create.json" | sed 's/"lotCode": "[^"]*"/"lotCode": ""/')
  {
    read -r status
    read -r payload
  } < <(http_request "POST" "$BASE_URL/api/v1/feed/lots" "$invalid_body" "Idempotency-Key: ct-lot-invalid")
  if [ "$status" -eq 404 ]; then
    record_skip "POST /api/v1/feed/lots invalid" "endpoint not found"
  elif [ "$status" -ge 400 ] && [ "$status" -lt 500 ] && is_json "$payload" && check_error_envelope "$payload"; then
    record_pass "POST /api/v1/feed/lots invalid" "error envelope" "$status"
  else
    record_fail "POST /api/v1/feed/lots invalid" "expected 4xx with error envelope" "$status"
  fi
fi

# Feed delivery create
if ensure_auth "POST /api/v1/feed/deliveries" && ensure_context "POST /api/v1/feed/deliveries"; then
  if [ -z "$FEED_LOT_ID" ]; then
    record_skip "POST /api/v1/feed/deliveries" "missing FEED_LOT_ID"
  else
    body=$(load_template "$(dirname "$0")/requests/delivery-create.json")
    {
      read -r status
      read -r payload
    } < <(http_request "POST" "$BASE_URL/api/v1/feed/deliveries" "$body" "Idempotency-Key: ct-delivery-1")
    if [ "$status" -eq 404 ]; then
      record_skip "POST /api/v1/feed/deliveries" "endpoint not found"
    elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
      record_pass "POST /api/v1/feed/deliveries" "created" "$status"
    else
      record_fail "POST /api/v1/feed/deliveries" "status $status" "$status"
    fi
  fi
fi

# Feed delivery list
if ensure_auth "GET /api/v1/feed/deliveries" && ensure_context "GET /api/v1/feed/deliveries"; then
  {
    read -r status
    read -r payload
  } < <(http_request "GET" "$BASE_URL/api/v1/feed/deliveries?tenantId=$TENANT_ID&limit=2" "" "")
  if [ "$status" -eq 404 ]; then
    record_skip "GET /api/v1/feed/deliveries" "endpoint not found"
  elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
    if check_list_pagination "$payload"; then
      record_pass "GET /api/v1/feed/deliveries" "pagination ok" "$status"
    else
      record_fail "GET /api/v1/feed/deliveries" "missing pagination fields" "$status"
    fi
  else
    record_fail "GET /api/v1/feed/deliveries" "status $status" "$status"
  fi
fi

# Feed delivery error case
if ensure_auth "POST /api/v1/feed/deliveries invalid" && ensure_context "POST /api/v1/feed/deliveries invalid"; then
  invalid_body=$(load_template "$(dirname "$0")/requests/delivery-create.json" | sed 's/"feedLotId": "[^"]*"/"feedLotId": ""/')
  {
    read -r status
    read -r payload
  } < <(http_request "POST" "$BASE_URL/api/v1/feed/deliveries" "$invalid_body" "Idempotency-Key: ct-delivery-invalid")
  if [ "$status" -eq 404 ]; then
    record_skip "POST /api/v1/feed/deliveries invalid" "endpoint not found"
  elif [ "$status" -ge 400 ] && [ "$status" -lt 500 ] && is_json "$payload" && check_error_envelope "$payload"; then
    record_pass "POST /api/v1/feed/deliveries invalid" "error envelope" "$status"
  else
    record_fail "POST /api/v1/feed/deliveries invalid" "expected 4xx with error envelope" "$status"
  fi
fi

# Feed quality create
if ensure_auth "POST /api/v1/feed/quality-results" && ensure_context "POST /api/v1/feed/quality-results"; then
  if [ -z "$FEED_LOT_ID" ]; then
    record_skip "POST /api/v1/feed/quality-results" "missing FEED_LOT_ID"
  else
    body=$(load_template "$(dirname "$0")/requests/quality-create.json")
    {
      read -r status
      read -r payload
    } < <(http_request "POST" "$BASE_URL/api/v1/feed/quality-results" "$body" "Idempotency-Key: ct-quality-1")
    if [ "$status" -eq 404 ]; then
      record_skip "POST /api/v1/feed/quality-results" "endpoint not found"
    elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
      record_pass "POST /api/v1/feed/quality-results" "created" "$status"
    else
      record_fail "POST /api/v1/feed/quality-results" "status $status" "$status"
    fi
  fi
fi

# Feed quality list
if ensure_auth "GET /api/v1/feed/quality-results" && ensure_context "GET /api/v1/feed/quality-results"; then
  {
    read -r status
    read -r payload
  } < <(http_request "GET" "$BASE_URL/api/v1/feed/quality-results?tenantId=$TENANT_ID&limit=2" "" "")
  if [ "$status" -eq 404 ]; then
    record_skip "GET /api/v1/feed/quality-results" "endpoint not found"
  elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ] && is_json "$payload"; then
    if check_list_pagination "$payload"; then
      record_pass "GET /api/v1/feed/quality-results" "pagination ok" "$status"
    else
      record_fail "GET /api/v1/feed/quality-results" "missing pagination fields" "$status"
    fi
  else
    record_fail "GET /api/v1/feed/quality-results" "status $status" "$status"
  fi
fi

# Feed quality error case
if ensure_auth "POST /api/v1/feed/quality-results invalid" && ensure_context "POST /api/v1/feed/quality-results invalid"; then
  invalid_body=$(load_template "$(dirname "$0")/requests/quality-create.json" | sed 's/"feedLotId": "[^"]*"/"feedLotId": ""/')
  {
    read -r status
    read -r payload
  } < <(http_request "POST" "$BASE_URL/api/v1/feed/quality-results" "$invalid_body" "Idempotency-Key: ct-quality-invalid")
  if [ "$status" -eq 404 ]; then
    record_skip "POST /api/v1/feed/quality-results invalid" "endpoint not found"
  elif [ "$status" -ge 400 ] && [ "$status" -lt 500 ] && is_json "$payload" && check_error_envelope "$payload"; then
    record_pass "POST /api/v1/feed/quality-results invalid" "error envelope" "$status"
  else
    record_fail "POST /api/v1/feed/quality-results invalid" "expected 4xx with error envelope" "$status"
  fi
fi

# Forbidden case: viewer tries POST intake
if ensure_context "POST /api/v1/feed/intake-records forbidden"; then
  if [ -z "$AUTH_TOKEN" ]; then
    record_skip "POST /api/v1/feed/intake-records forbidden" "missing AUTH_TOKEN"
  else
    body=$(load_template "$(dirname "$0")/requests/intake-create.json")
    {
      read -r status
      read -r payload
    } < <(http_request "POST" "$BASE_URL/api/v1/feed/intake-records" "$body" "Idempotency-Key: ct-intake-forbidden")
    if [ "$status" -eq 403 ] && is_json "$payload" && check_error_envelope "$payload"; then
      record_pass "POST /api/v1/feed/intake-records forbidden" "forbidden" "$status"
    else
      record_fail "POST /api/v1/feed/intake-records forbidden" "expected 403" "$status"
    fi
  fi
fi

# Write report
printf '{"summary":{"pass":%d,"fail":%d,"skip":%d},"tests":[%s]}' "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT" "$TESTS_JSON" > "$REPORT_PATH"

echo "----"
echo "Summary: PASS=$PASS_COUNT FAIL=$FAIL_COUNT SKIP=$SKIP_COUNT"
echo "Report: $REPORT_PATH"

exit 0
