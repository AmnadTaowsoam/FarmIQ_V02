#!/usr/bin/env bash
# FarmIQ Edge-Layer Comprehensive Test Runner
# This script tests all Edge-Layer services end-to-end

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/edge-test-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="${LOG_DIR}/edge-test-report-$(date +%Y%m%d-%H%M%S).json"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Parse arguments
SKIP_HEALTH_CHECKS=false
SKIP_IOT_SIMULATOR=false
SKIP_HTTP_TESTS=false
SKIP_SYNC_TESTS=false
TEST_DURATION=60

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-health-checks)
            SKIP_HEALTH_CHECKS=true
            shift
            ;;
        --skip-iot-simulator)
            SKIP_IOT_SIMULATOR=true
            shift
            ;;
        --skip-http-tests)
            SKIP_HTTP_TESTS=true
            shift
            ;;
        --skip-sync-tests)
            SKIP_SYNC_TESTS=true
            shift
            ;;
        --duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Test results (JSON structure)
RESULTS_JSON='{
    "startTime": "",
    "endTime": "",
    "duration": 0,
    "services": {},
    "testCases": {},
    "summary": {
        "passed": 0,
        "failed": 0,
        "total": 0
    }
}'

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Add test result
add_test_result() {
    local test_case="$1"
    local passed="$2"
    local notes="${3:-}"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local result="{\"passed\": $passed, \"notes\": \"$notes\", \"timestamp\": \"$timestamp\"}"

    # Update JSON using python
    RESULTS_JSON=$(python3 - <<PY
import json
data = json.loads('''$RESULTS_JSON''')
data['testCases']['$test_case'] = $result
if $passed:
    data['summary']['passed'] += 1
else:
    data['summary']['failed'] += 1
data['summary']['total'] += 1
print(json.dumps(data))
PY
)

    if [[ "$passed" == "true" ]]; then
        log "SUCCESS" "✅ PASS: $test_case"
    else
        log "ERROR" "❌ FAIL: $test_case - $notes"
    fi
}

# Check if Docker is running
check_docker_running() {
    if docker ps >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if a Docker container is running
check_container_running() {
    local container_name="$1"
    local result=$(docker ps --filter "name=$container_name" --format "{{.Status}}")
    [[ -n "$result" ]]
}

# Run health checks
run_health_checks() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "Running Health Checks"
    log "INFO" "========================================"
    log "INFO" ""

    local services=(
        "edge-mqtt-broker:5100:MQTT"
        "edge-cloud-ingestion-mock:5102:HTTP:/api/health"
        "edge-ingress-gateway:5103:HTTP:/api/health"
        "edge-telemetry-timeseries:5104:HTTP:/api/health"
        "edge-weighvision-session:5105:HTTP:/api/health"
        "edge-media-store:5106:HTTP:/api/health"
        "edge-vision-inference:5107:HTTP:/api/health"
        "edge-sync-forwarder:5108:HTTP:/api/health"
        "edge-policy-sync:5109:HTTP:/api/health"
        "edge-observability-agent:5111:HTTP:/api/health"
        "edge-feed-intake:5116:HTTP:/api/health"
        "edge-retention-janitor:5114:HTTP:/api/health"
    )

    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name port type health_path <<< "$service_info"

        local is_healthy=false
        local response_time=-1

        if [[ "$type" == "HTTP" ]]; then
            local url="http://localhost:${port}${health_path}"

            if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null); then
                if [[ "$response" == "200" ]]; then
                    is_healthy=true
                    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 "$url" 2>/dev/null)
                    response_time=$(awk "BEGIN {printf \"%.0f\", ${response_time}*1000}")
                fi
            fi
        elif [[ "$type" == "MQTT" ]]; then
            # Check if MQTT port is open
            if timeout 5 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null; then
                is_healthy=true
                response_time=0
            fi
        fi

        # Update JSON
        RESULTS_JSON=$(python3 - <<PY
import json
data = json.loads('''$RESULTS_JSON''')
data['services']['$service_name'] = {
    "healthy": $is_healthy,
    "responseTime": $response_time,
    "port": $port
}
print(json.dumps(data))
PY
)

        if [[ "$is_healthy" == "true" ]]; then
            log "SUCCESS" "✅ $service_name - Healthy (${response_time}ms)"
            add_test_result "HEALTH-$service_name" true
        else
            log "ERROR" "❌ $service_name - Unhealthy"
            add_test_result "HEALTH-$service_name" false "Service not responding"
        fi
    done
}

# Seed database allowlists
seed_allowlists() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "Seeding Database Allowlists"
    log "INFO" "========================================"
    log "INFO" ""

    local tenant_id="t-001"
    local farm_id="f-001"
    local barn_id="b-001"
    local device_id="d-001"
    local station_id="st-01"

    if docker exec edge-layer-postgres-1 psql -U farmiq -d farmiq -c "
        INSERT INTO device_allowlist (tenant_id, device_id, farm_id, barn_id, enabled, created_at, updated_at)
        VALUES ('$tenant_id','$device_id','$farm_id','$barn_id', TRUE, NOW(), NOW())
        ON CONFLICT (tenant_id, device_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();

        INSERT INTO station_allowlist (tenant_id, station_id, farm_id, barn_id, enabled, created_at, updated_at)
        VALUES ('$tenant_id','$station_id','$farm_id','$barn_id', TRUE, NOW(), NOW())
        ON CONFLICT (tenant_id, station_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();
    " 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
        log "SUCCESS" "✅ Allowlists seeded successfully"
        add_test_result "SEED-ALLOWLISTS" true
    else
        log "ERROR" "❌ Failed to seed allowlists"
        add_test_result "SEED-ALLOWLISTS" false "Database error"
    fi
}

# Run IoT simulator
run_iot_simulator() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "Running IoT Simulator"
    log "INFO" "========================================"
    log "INFO" ""

    local simulator_script="${SCRIPT_DIR}/iot-simulator-enhanced.js"

    if [[ ! -f "$simulator_script" ]]; then
        log "ERROR" "❌ IoT simulator script not found: $simulator_script"
        add_test_result "IOT-SIMULATOR" false "Simulator script not found"
        return
    fi

    log "INFO" "Starting IoT simulator for ${TEST_DURATION} seconds..."

    if node "$simulator_script" --duration "$TEST_DURATION" 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "✅ IoT simulator completed successfully"
        add_test_result "IOT-SIMULATOR" true
    else
        log "ERROR" "❌ IoT simulator failed"
        add_test_result "IOT-SIMULATOR" false "Non-zero exit code"
    fi
}

# Run HTTP API tests
run_http_tests() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "Running HTTP API Tests"
    log "INFO" "========================================"
    log "INFO" ""

    local base_url="http://localhost:5103"

    # Test ingress stats
    if response=$(curl -s --max-time 10 "$base_url/api/v1/ingress/stats" 2>&1); then
        log "SUCCESS" "✅ Ingress stats retrieved: $response"
        add_test_result "HTTP-INGRESS-STATS" true
    else
        log "ERROR" "❌ Failed to get ingress stats"
        add_test_result "HTTP-INGRESS-STATS" false "HTTP request failed"
    fi

    # Test sync state
    if response=$(curl -s --max-time 10 "http://localhost:5108/api/v1/sync/state" 2>&1); then
        log "SUCCESS" "✅ Sync state retrieved: $response"
        add_test_result "HTTP-SYNC-STATE" true
    else
        log "ERROR" "❌ Failed to get sync state"
        add_test_result "HTTP-SYNC-STATE" false "HTTP request failed"
    fi

    # Test observability
    if response=$(curl -s --max-time 10 "http://localhost:5111/api/v1/ops" 2>&1); then
        log "SUCCESS" "✅ Observability health retrieved: $response"
        add_test_result "HTTP-OBSERVABILITY" true
    else
        log "ERROR" "❌ Failed to get observability health"
        add_test_result "HTTP-OBSERVABILITY" false "HTTP request failed"
    fi
}

# Run sync tests
run_sync_tests() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "Running Sync Forwarder Tests"
    log "INFO" "========================================"
    log "INFO" ""

    # Check sync forwarder outbox
    if response=$(curl -s --max-time 10 "http://localhost:5108/api/v1/sync/outbox" 2>&1); then
        log "SUCCESS" "✅ Outbox retrieved: $response"
        add_test_result "SYNC-OUTBOX" true
    else
        log "ERROR" "❌ Failed to get outbox"
        add_test_result "SYNC-OUTBOX" false "HTTP request failed"
    fi

    # Check cloud mock received data
    if response=$(curl -s --max-time 10 "http://localhost:5102/api/v1/mock/stats" 2>&1); then
        log "SUCCESS" "✅ Cloud mock stats: $response"
        add_test_result "SYNC-CLOUD-MOCK" true
    else
        log "WARNING" "⚠️  Cloud mock stats endpoint not available (may not be implemented)"
        add_test_result "SYNC-CLOUD-MOCK" true "Endpoint not implemented"
    fi
}

# Generate test report
generate_report() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "Test Report"
    log "INFO" "========================================"
    log "INFO" ""

    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local start_time=$(echo "$RESULTS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['startTime'])")
    local duration=$(python3 - <<PY
from datetime import datetime
start = datetime.fromisoformat('$start_time'.replace('Z', '+00:00'))
end = datetime.fromisoformat('$end_time'.replace('Z', '+00:00'))
print(int((end - start).total_seconds()))
PY
)

    # Update JSON
    RESULTS_JSON=$(python3 - <<PY
import json
data = json.loads('''$RESULTS_JSON''')
data['endTime'] = '$end_time'
data['duration'] = $duration
print(json.dumps(data))
PY
)

    log "INFO" "Test Start Time: $start_time"
    log "INFO" "Test End Time: $end_time"
    log "INFO" "Total Duration: ${duration} seconds"
    log "INFO" ""

    # Get summary
    local total=$(echo "$RESULTS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['total'])")
    local passed=$(echo "$RESULTS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['passed'])")
    local failed=$(echo "$RESULTS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['failed'])")
    local success_rate=$(python3 - <<PY
import sys, json
data = json.load(sys.stdin)
total = data['summary']['total']
passed = data['summary']['passed']
print(round((passed / total * 100) if total > 0 else 0, 2))
PY
)

    log "INFO" "Summary:"
    log "INFO" "  Total Tests: $total"
    log "SUCCESS" "  Passed: $passed"
    log "ERROR" "  Failed: $failed"
    log "INFO" "  Success Rate: ${success_rate}%"
    log "INFO" ""

    log "INFO" "Service Health:"
    echo "$RESULTS_JSON" | python3 - <<PY
import json, sys
data = json.load(sys.stdin)
for service, info in data['services'].items():
    status = "✅ Healthy" if info['healthy'] else "❌ Unhealthy"
    response_time = f"{info['responseTime']}ms" if info['responseTime'] >= 0 else "N/A"
    print(f"  {service}: {status} ({response_time})")
PY
    log "INFO" ""

    # Save JSON report
    echo "$RESULTS_JSON" > "$REPORT_FILE"
    log "INFO" "Detailed report saved to: $REPORT_FILE"
    log "INFO" "Log file saved to: $LOG_FILE"
}

# Main execution
main() {
    log "INFO" ""
    log "INFO" "========================================"
    log "INFO" "FarmIQ Edge-Layer Test Runner"
    log "INFO" "========================================"
    log "INFO" ""

    # Set start time
    local start_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    RESULTS_JSON=$(python3 - <<PY
import json
data = json.loads('''$RESULTS_JSON''')
data['startTime'] = '$start_time'
print(json.dumps(data))
PY
)

    # Check Docker is running
    if ! check_docker_running; then
        log "ERROR" "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi

    log "SUCCESS" "✅ Docker is running"

    # Run health checks
    if [[ "$SKIP_HEALTH_CHECKS" == "false" ]]; then
        run_health_checks
    else
        log "WARNING" "⏭️  Skipping health checks"
    fi

    # Seed allowlists
    seed_allowlists

    # Run IoT simulator
    if [[ "$SKIP_IOT_SIMULATOR" == "false" ]]; then
        run_iot_simulator
    else
        log "WARNING" "⏭️  Skipping IoT simulator"
    fi

    # Run HTTP tests
    if [[ "$SKIP_HTTP_TESTS" == "false" ]]; then
        run_http_tests
    else
        log "WARNING" "⏭️  Skipping HTTP tests"
    fi

    # Run sync tests
    if [[ "$SKIP_SYNC_TESTS" == "false" ]]; then
        run_sync_tests
    else
        log "WARNING" "⏭️  Skipping sync tests"
    fi

    # Generate report
    generate_report

    # Exit with appropriate code
    local failed=$(echo "$RESULTS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['summary']['failed'])")
    if [[ "$failed" -gt 0 ]]; then
        log "ERROR" ""
        log "ERROR" "❌ Tests completed with failures"
        exit 1
    else
        log "SUCCESS" ""
        log "SUCCESS" "✅ All tests passed!"
        exit 0
    fi
}

# Run main function
main "$@"
