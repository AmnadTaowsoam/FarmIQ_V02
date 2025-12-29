#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BFF_BASE_URL:-http://localhost:5125}"
URL="$BASE_URL/api/v1/tenants"

status=$(curl -s -o /tmp/tenants_smoke.json -w "%{http_code}" "$URL" || true)

echo "Tenant smoke: GET $URL"

case "$status" in
  200)
    echo "OK: tenants endpoint reachable (200)."
    ;;
  401)
    echo "AUTH REQUIRED: tenants endpoint returned 401 (expected if auth enforced)."
    ;;
  404)
    echo "MISSING PROXY: tenants endpoint returned 404. BFF route not configured or service down."
    ;;
  000)
    echo "NETWORK ERROR: could not reach BFF at $BASE_URL."
    ;;
  *)
    echo "UNEXPECTED: tenants endpoint returned status $status."
    ;;
 esac
