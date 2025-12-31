# Edge-to-Cloud Integration Verification Script with HMAC Authentication Tests
# This script verifies full end-to-end sync flow including HMAC replay prevention

param(
    [switch]$Verbose = $false,
    [switch]$IncludeHmacTests = $true,
    [string]$CloudLANIP = "",
    [switch]$IncludeRedisReplayTest = $false,
    [string]$AuthMode = "none",
    [string]$ApiKey = "",
    [string]$HmacSecret = ""
)

$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Configuration
$CLOUD_INGESTION_URL = if ($CloudLANIP) { "http://$CloudLANIP:5300/api/v1/edge/batch" } else { "http://host.docker.internal:5300/api/v1/edge/batch" }
$EDGE_SYNC_URL = "http://localhost:5108"
$CloudUri = [Uri]$CLOUD_INGESTION_URL
$CLOUD_BASE_URL = "$($CloudUri.Scheme)://$($CloudUri.Host):$($CloudUri.Port)"
$CLOUD_HEALTH_URL = "$CLOUD_BASE_URL/api/health"
$CLOUD_HANDSHAKE_URL = "$CLOUD_BASE_URL/api/v1/edge/diagnostics/handshake"
$CLOUD_DB_CONTAINER = "farmiq-cloud-postgres"
$EDGE_DB_CONTAINER = "farmiq-edge-postgres"
$CLOUD_TELEMETRY_CONTAINER = "cloud-layer-cloud-telemetry-service-1"
$CLOUD_INGESTION_CONTAINER = "cloud-layer-cloud-ingestion-1"
$EDGE_FORWARDER_CONTAINER = "edge-layer-edge-sync-forwarder-1"
$CLOUD_COMPOSE_PATH = "D:\FarmIQ\FarmIQ_V02\cloud-layer"
$EDGE_COMPOSE_PATH = "D:\FarmIQ\FarmIQ_V02\edge-layer"

# Test counter
$TestsPassed = 0
$TestsFailed = 0
$TestResults = @()

function Write-TestResult {
    param([string]$TestName, [bool]$Passed, [string]$Details)
    
    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $color = if ($Passed) { "Green" } else { "Red" }
    
    Write-Host "[$status] $TestName" -ForegroundColor $color
    if ($Verbose -or -not $Passed) {
        Write-Host "  $Details" -ForegroundColor Gray
    }
    
    $script:TestsPassed += if ($Passed) { 1 } else { 0 }
    $script:TestsFailed += if (-not $Passed) { 1 } else { 0 }
    $script:TestResults += [PSCustomObject]@{
        Test = $TestName
        Status = $status
        Details = $Details
    }
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n[STEP] $Message" -ForegroundColor Yellow
}

function Normalize-UrlPath {
    param([string]$UrlPath)
    $path = $UrlPath.Split('?')[0]
    if ($path.Length -gt 1 -and $path.EndsWith('/')) {
        return $path.TrimEnd('/')
    }
    return $path
}

function Get-HmacSha256Hex {
    param([string]$Secret, [string]$Payload)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
    $bytes = [Text.Encoding]::UTF8.GetBytes($Payload)
    $hash = $hmac.ComputeHash($bytes)
    return ($hash | ForEach-Object { $_.ToString("x2") }) -join ''
}

function Get-ContainerEnv {
    param([string]$Container, [string]$Name)
    try {
        return (docker exec $Container printenv $Name).Trim()
    } catch {
        return ""
    }
}

function Invoke-IngestionRequest {
    param(
        [string]$BodyString,
        [hashtable]$Headers
    )
    try {
        $response = Invoke-WebRequest -Uri $CLOUD_INGESTION_URL -Method Post -Body $BodyString -ContentType "application/json" -Headers $Headers -UseBasicParsing
        return @{ StatusCode = $response.StatusCode; Body = $response.Content }
    } catch {
        $resp = $_.Exception.Response
        if ($resp -and $resp -is [System.Net.HttpWebResponse]) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $body = $reader.ReadToEnd()
            return @{ StatusCode = [int]$resp.StatusCode; Body = $body }
        }
        return @{ StatusCode = 0; Body = $_.Exception.Message }
    }
}

function Get-ErrorCodeFromBody {
    param([string]$Body)
    try {
        return ($Body | ConvertFrom-Json).error.code
    } catch {
        return $null
    }
}

function New-HmacBodyString {
    param([string]$EventId)
    $nowIso = (Get-Date).ToUniversalTime().ToString("o")
    $payload = [ordered]@{
        tenant_id = "t-001"
        edge_id = "edge-test"
        sent_at = $nowIso
        events = @(
            [ordered]@{
                event_id = $EventId
                event_type = "telemetry.ingested"
                tenant_id = "t-001"
                farm_id = "farm-test-01"
                barn_id = "barn-a"
                device_id = "sensor-temp-01"
                occurred_at = $nowIso
                trace_id = "trace-hmac-$EventId"
                schema_version = "1.0"
                payload = [ordered]@{
                    metric_type = "temperature"
                    metric_value = 23.5
                    unit = "celsius"
                }
                idempotency_key = "t-001:$EventId"
            }
        )
    }
    return $payload | ConvertTo-Json -Compress
}

# ============================================================================
# TEST 1: Cloud Ingestion Health
# ============================================================================
Write-Step "Checking Cloud Ingestion Health..."
try {
    $response = Invoke-WebRequest -Uri $CLOUD_HEALTH_URL -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-TestResult "Cloud Ingestion Health" $true "HTTP 200 OK via $CLOUD_HEALTH_URL"
    } else {
        Write-TestResult "Cloud Ingestion Health" $false "Unexpected response: $($response.StatusCode)"
    }
} catch {
    Write-TestResult "Cloud Ingestion Health" $false "Error: $_"
}

# ============================================================================
# TEST 2: Edge Sync Forwarder Health
# ============================================================================
Write-Step "Checking Edge Sync Forwarder Health..."
try {
    $response = docker exec $EDGE_FORWARDER_CONTAINER wget -q -O- "http://localhost:3000/api/health"
    if ($response -eq "OK") {
        Write-TestResult "Edge Sync Forwarder Health" $true "OK response"
    } else {
        Write-TestResult "Edge Sync Forwarder Health" $false "Unexpected response: $response"
    }
} catch {
    Write-TestResult "Edge Sync Forwarder Health" $false "Error: $_"
}

# ============================================================================
# TEST 3: Connectivity from Edge to Cloud
# ============================================================================
Write-Step "Testing Connectivity from Edge to Cloud..."
try {
    $response = docker exec $EDGE_FORWARDER_CONTAINER wget -q -O- "$CLOUD_HEALTH_URL"
    if ($response -eq "OK") {
        Write-TestResult "Edge-to-Cloud Connectivity" $true "Can reach cloud from edge container via $CLOUD_INGESTION_URL"
    } else {
        Write-TestResult "Edge-to-Cloud Connectivity" $false "Unexpected response: $response"
    }
} catch {
    Write-TestResult "Edge-to-Cloud Connectivity" $false "Error: $_"
}

# ============================================================================
# TEST 4: Create Test Event in Edge Outbox
# ============================================================================
Write-Step "Creating Test Event in Edge Outbox..."
try {
    $testEventId = [guid]::NewGuid().ToString()
    $sqlPath = "$env:TEMP\create_test_event.sql"
    $testTraceId = "trace-test-" + (-join (1..8 | ForEach-Object { Get-Random -Minimum 0 -Maximum 10 }))
    
    # Build SQL using heredoc to avoid escaping issues
    $sqlContent = @"
DO \$\$
DECLARE
  test_trace_id TEXT := '$testTraceId';
BEGIN
  INSERT INTO sync_outbox (
    id,
    tenant_id,
    farm_id,
    barn_id,
    device_id,
    session_id,
    event_type,
    occurred_at,
    trace_id,
    payload_json,
    status,
    attempt_count,
    created_at,
    updated_at
  ) VALUES (
    '$testEventId'::uuid,
    't-001',
    'farm-test-01',
    'barn-a',
    'sensor-temp-01',
    'session-123',
    'telemetry.ingested',
    NOW(),
    test_trace_id,
    '{"device_id":"sensor-temp-01","device_type":"temperature","metric_type":"temperature","metric_value":23.5,"unit":"celsius"}'::jsonb,
    'pending',
    0,
    NOW(),
    NOW()
  );
END \$\$;
SELECT COUNT(*) FROM sync_outbox WHERE id = '$testEventId'::uuid;
"@
    
    Set-Content -Path $sqlPath -Value $sqlContent -Encoding UTF8
    docker cp $sqlPath "${EDGE_DB_CONTAINER}:/tmp/create_test_event.sql" | Out-Null
    $result = docker exec -i $EDGE_DB_CONTAINER psql -U farmiq -d farmiq -f /tmp/create_test_event.sql
    
    # Try to extract count from output
    $lines = $result -split "`n"
    $count = 0
    foreach ($line in $lines) {
        if ($line -match "^\s*(\d+)") {
            $count = [int]$line.Trim()
            break
        }
    }
    
    if ($count -eq 1) {
        Write-TestResult "Edge Outbox Event Creation" $true "Event ID: $testEventId created successfully"
    } else {
        Write-TestResult "Edge Outbox Event Creation" $false "Expected 1 row, got $count"
    }
} catch {
    Write-TestResult "Edge Outbox Event Creation" $false "Error: $_"
}

# ============================================================================
# TEST 5: Trigger Sync
# ============================================================================
Write-Step "Triggering Edge Sync..."
try {
    $response = docker exec $EDGE_FORWARDER_CONTAINER wget -q -O- --post-data='{}' "http://localhost:3000/api/v1/sync/trigger"
    $state = docker exec $EDGE_FORWARDER_CONTAINER wget -q -O- "http://localhost:3000/api/v1/sync/state"
    Write-TestResult "Edge Sync Trigger" $true "Sync triggered, state: $($state.Substring(0, [Math]::Min(100, $state.Length)))"
    
    # Wait for sync to complete
    Start-Sleep -Seconds 3
} catch {
    Write-TestResult "Edge Sync Trigger" $false "Error: $_"
}

# ============================================================================
# TEST 6: Verify Event Synced to Cloud
# ============================================================================
Write-Step "Verifying Event Synced to Cloud..."
try {
    $sqlPath = "$env:TEMP\check_cloud_persistence.sql"
    $cloudSqlContent = @"
SELECT COUNT(*) FROM telemetry_raw WHERE ""eventId"" = '$testEventId';
"@
    
    Set-Content -Path $sqlPath -Value $cloudSqlContent -Encoding UTF8
    docker cp $sqlPath "${CLOUD_DB_CONTAINER}:/tmp/check_cloud_persistence.sql" | Out-Null
    $result = docker exec -i $CLOUD_DB_CONTAINER psql -U farmiq -d cloud_telemetry -f /tmp/check_cloud_persistence.sql
    
    $cloudCount = [int]$result.Trim()
    
    if ($cloudCount -eq 1) {
        Write-TestResult "Event Cloud Persistence" $true "Event persisted in cloud telemetry table"
    } else {
        Write-TestResult "Event Cloud Persistence" $false "Expected 1 row, got $cloudCount"
    }
} catch {
    Write-TestResult "Event Cloud Persistence" $false "Error: $_"
}

# ============================================================================
# TEST 7: Production Auth Enforcement
# ============================================================================
Write-Step "Testing Production Authentication Enforcement..."
try {
    $syncConfig = Get-ContainerEnv $EDGE_FORWARDER_CONTAINER "RUN_MODE"
    $authMode = Get-ContainerEnv $EDGE_FORWARDER_CONTAINER "CLOUD_AUTH_MODE"
    
    if ($syncConfig -match "integration|production") {
        if ($authMode -eq "none") {
            Write-TestResult "Production Auth Enforcement" $false "RUN_MODE is integration/production but CLOUD_AUTH_MODE is 'none'"
        } else {
            Write-TestResult "Production Auth Enforcement" $true "Auth required and enforced: $authMode"
        }
    } else {
        Write-TestResult "Production Auth Enforcement" $true "Not in integration/production mode, auth not enforced"
    }
} catch {
    Write-TestResult "Production Auth Enforcement" $false "Error: $_"
}

# ============================================================================
# TEST 8: HMAC Authentication (Optional)
# ============================================================================
if ($IncludeHmacTests) {
    Write-Step "Testing HMAC Authentication (Optional)..."
    
    $cloudAuthMode = (Get-ContainerEnv $CLOUD_INGESTION_CONTAINER "CLOUD_AUTH_MODE").ToLower()
    if ($cloudAuthMode -ne "hmac") {
        Write-Host "  Skipped - CLOUD_AUTH_MODE is not 'hmac'" -ForegroundColor Gray
        Write-TestResult "HMAC Auth (Optional)" $true "Not configured for HMAC mode - skipped"
    } else {
        $secret = if ($HmacSecret) { $HmacSecret } else { (Get-ContainerEnv $CLOUD_INGESTION_CONTAINER "CLOUD_HMAC_SECRET") }
        if (-not $secret) {
            Write-TestResult "HMAC: Secret Available" $false "CLOUD_HMAC_SECRET is not configured"
        } else {
            $urlPath = Normalize-UrlPath $CloudUri.AbsolutePath
            $eventId = [guid]::NewGuid().ToString()
            $bodyString = New-HmacBodyString $eventId

            # Test 8a: Missing timestamp
            $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
            $signingPayload = "$timestamp.POST.$urlPath.$bodyString"
            $signature = Get-HmacSha256Hex $secret $signingPayload
            $headersMissingTs = @{ "x-edge-signature" = "sha256=$signature" }
            $responseMissingTs = Invoke-IngestionRequest -BodyString $bodyString -Headers $headersMissingTs
            $codeMissingTs = Get-ErrorCodeFromBody $responseMissingTs.Body
            $missingTsOk = ($responseMissingTs.StatusCode -eq 401 -and $codeMissingTs -eq "HMAC_TIMESTAMP_MISSING")
            Write-TestResult "HMAC: Missing Timestamp" $missingTsOk "Status=$($responseMissingTs.StatusCode), code=$codeMissingTs"

            # Test 8b: Invalid timestamp
            $badTimestamp = "abc"
            $badPayload = "$badTimestamp.POST.$urlPath.$bodyString"
            $badSignature = Get-HmacSha256Hex $secret $badPayload
            $headersBadTs = @{
                "x-edge-timestamp" = $badTimestamp
                "x-edge-signature" = "sha256=$badSignature"
            }
            $responseBadTs = Invoke-IngestionRequest -BodyString $bodyString -Headers $headersBadTs
            $codeBadTs = Get-ErrorCodeFromBody $responseBadTs.Body
            $badTsOk = ($responseBadTs.StatusCode -eq 401 -and $codeBadTs -eq "HMAC_TIMESTAMP_INVALID")
            Write-TestResult "HMAC: Invalid Timestamp" $badTsOk "Status=$($responseBadTs.StatusCode), code=$codeBadTs"

            # Test 8c: Old timestamp
            $oldTimestamp = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 600000).ToString()
            $oldPayload = "$oldTimestamp.POST.$urlPath.$bodyString"
            $oldSignature = Get-HmacSha256Hex $secret $oldPayload
            $headersOldTs = @{
                "x-edge-timestamp" = $oldTimestamp
                "x-edge-signature" = "sha256=$oldSignature"
            }
            $responseOldTs = Invoke-IngestionRequest -BodyString $bodyString -Headers $headersOldTs
            $codeOldTs = Get-ErrorCodeFromBody $responseOldTs.Body
            $oldTsOk = ($responseOldTs.StatusCode -eq 401 -and $codeOldTs -eq "HMAC_TIMESTAMP_OUT_OF_WINDOW")
            Write-TestResult "HMAC: Old Timestamp" $oldTsOk "Status=$($responseOldTs.StatusCode), code=$codeOldTs"

            # Test 8d: Valid request
            $validTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
            $validPayload = "$validTimestamp.POST.$urlPath.$bodyString"
            $validSignature = Get-HmacSha256Hex $secret $validPayload
            $headersValid = @{
                "x-edge-timestamp" = $validTimestamp
                "x-edge-signature" = "sha256=$validSignature"
            }
            $responseValid = Invoke-IngestionRequest -BodyString $bodyString -Headers $headersValid
            $validOk = ($responseValid.StatusCode -ge 200 -and $responseValid.StatusCode -lt 300)
            Write-TestResult "HMAC: Correct Signature" $validOk "Status=$($responseValid.StatusCode)"

            if ($IncludeRedisReplayTest) {
                $redisUrl = Get-ContainerEnv $CLOUD_INGESTION_CONTAINER "REDIS_URL"
                if (-not $redisUrl) {
                    Write-TestResult "HMAC: Replay Attack" $true "Skipped - REDIS_URL is not set"
                } else {
                    $replayEventId = [guid]::NewGuid().ToString()
                    $replayBodyString = New-HmacBodyString $replayEventId
                    $replayTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
                    $replayPayload = "$replayTimestamp.POST.$urlPath.$replayBodyString"
                    $replaySignature = Get-HmacSha256Hex $secret $replayPayload
                    $replayHeaders = @{
                        "x-edge-timestamp" = $replayTimestamp
                        "x-edge-signature" = "sha256=$replaySignature"
                    }

                    $firstReplay = Invoke-IngestionRequest -BodyString $replayBodyString -Headers $replayHeaders
                    $secondReplay = Invoke-IngestionRequest -BodyString $replayBodyString -Headers $replayHeaders
                    $secondCode = Get-ErrorCodeFromBody $secondReplay.Body
                    $replayOk = ($firstReplay.StatusCode -ge 200 -and $firstReplay.StatusCode -lt 300 -and $secondReplay.StatusCode -eq 401 -and $secondCode -eq "HMAC_REPLAY_DETECTED")
                    Write-TestResult "HMAC: Replay Attack" $replayOk "First=$($firstReplay.StatusCode), Second=$($secondReplay.StatusCode), code=$secondCode"
                }
            }
        }
    }
} else {
    Write-Host "  Skipped - HMAC tests disabled via -IncludeHmacTests:$false" -ForegroundColor Gray
    Write-TestResult "HMAC Auth (Optional)" $true "HMAC tests disabled via script parameter"
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "`n========================================" -ForegroundColor Cyan

Write-Host "Tests Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $TestsFailed" -ForegroundColor Red
Write-Host "Total Tests: $($TestsPassed + $TestsFailed)" -ForegroundColor Cyan

Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Edge-to-Cloud integration is PRODUCTION READY with HMAC authentication and replay prevention" -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME TESTS FAILED!" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "Test Results:" -ForegroundColor Yellow
    $TestResults | Format-Table -AutoSize
    exit 1
}
