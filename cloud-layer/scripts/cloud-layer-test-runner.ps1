# FarmIQ Cloud-Layer Comprehensive Test Runner
# This script tests all Cloud-Layer services end-to-end
# Simulates Edge-Layer sending data to Cloud-Layer

param(
    [switch]$SkipHealthChecks = $false,
    [switch]$SkipIngestionTests = $false,
    [switch]$SkipServiceTests = $false,
    [switch]$SkipBFFTests = $false,
    [switch]$SkipFrontendTests = $false,
    [switch]$SkipDatabaseTests = $false,
    [int]$TestDuration = 60,
    [string]$LogDir = "logs"
)

# Script configuration
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$LogFile = Join-Path $ScriptDir "$LogDir\cloud-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ReportFile = Join-Path $ScriptDir "$LogDir\cloud-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

# Create log directory if it doesn't exist
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Test results
$Results = @{
    StartTime = Get-Date -Format "o"
    EndTime = $null
    Duration = 0
    Services = @{}
    TestCases = @{}
    Summary = @{
        Passed = 0
        Failed = 0
        Total = 0
    }
}

# Service endpoints
$Services = @{
    "postgres" = @{ Port = 5140; Type = "TCP"; HealthPath = "" }
    "vault" = @{ Port = 8200; Type = "HTTP"; HealthPath = "/v1/sys/health" }
    "rabbitmq" = @{ Port = 5150; Type = "TCP"; HealthPath = "" }
    "cloud-identity-access" = @{ Port = 5120; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-tenant-registry" = @{ Port = 5121; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-ingestion" = @{ Port = 5122; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-telemetry-service" = @{ Port = 5123; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-analytics-service" = @{ Port = 5124; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-api-gateway-bff" = @{ Port = 5125; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-config-rules-service" = @{ Port = 5126; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-audit-log-service" = @{ Port = 5127; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-notification-service" = @{ Port = 5128; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-reporting-export-service" = @{ Port = 5129; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-feed-service" = @{ Port = 5130; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-barn-records-service" = @{ Port = 5131; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-weighvision-readmodel" = @{ Port = 5132; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-standards-service" = @{ Port = 5133; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-llm-insights-service" = @{ Port = 5134; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-ml-model-service" = @{ Port = 5135; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-mlflow-registry" = @{ Port = 5136; Type = "HTTP"; HealthPath = "/health" }
    "cloud-feature-store" = @{ Port = 5137; Type = "HTTP"; HealthPath = "/health" }
    "cloud-drift-detection" = @{ Port = 5138; Type = "HTTP"; HealthPath = "/health" }
    "cloud-inference-server" = @{ Port = 5139; Type = "HTTP"; HealthPath = "/health" }
    "cloud-hybrid-router" = @{ Port = 5141; Type = "HTTP"; HealthPath = "/health" }
    "cloud-fleet-management" = @{ Port = 5144; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-billing-service" = @{ Port = 5145; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-advanced-analytics" = @{ Port = 5146; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-data-pipeline" = @{ Port = 5147; Type = "HTTP"; HealthPath = "/api/health" }
    "cloud-bi-metabase" = @{ Port = 5148; Type = "HTTP"; HealthPath = "/api/health" }
    "dashboard-web" = @{ Port = 5142; Type = "HTTP"; HealthPath = "/" }
    "admin-web" = @{ Port = 5143; Type = "HTTP"; HealthPath = "/" }
}

# Test data
$TestTenantId = "t-001"
$TestFarmId = "f-001"
$TestBarnId = "b-001"
$TestDeviceId = "d-001"
$TestBatchId = "batch-test-001"
$TestStationId = "st-01"
$TestWVDeviceId = "wv-001"
$APIKey = "edge-local-key"

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Test result function
function Add-TestResult {
    param(
        [string]$TestCase,
        [bool]$Passed,
        [string]$Notes = ""
    )

    $Results.TestCases[$TestCase] = @{
        Passed = $Passed
        Notes = $Notes
        Timestamp = Get-Date -Format "o"
    }

    if ($Passed) {
        $Results.Summary.Passed++
        Write-Log "✅ PASS: $TestCase" -Level "SUCCESS"
    } else {
        $Results.Summary.Failed++
        Write-Log "❌ FAIL: $TestCase - $Notes" -Level "ERROR"
    }

    $Results.Summary.Total++
}

# Check if Docker is running
function Test-DockerRunning {
    try {
        $null = docker ps 2>&1
        return $true
    } catch {
        return $false
    }
}

# Check if a Docker container is running
function Test-ContainerRunning {
    param(
        [string]$ContainerName
    )

    $result = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
    return -not [string]::IsNullOrEmpty($result)
}

# Wait for service to be healthy
function Wait-ServiceHealthy {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$TimeoutSeconds = 60
    )

    $startTime = Get-Date
    $timeout = New-TimeSpan -Seconds $TimeoutSeconds

    while ((Get-Date) - $startTime -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            # Service not ready yet
        }

        Start-Sleep -Seconds 1
    }

    return $false
}

# Run health checks
function Invoke-HealthChecks {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running Health Checks" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    foreach ($service in $Services.GetEnumerator()) {
        $serviceName = $service.Key
        $serviceConfig = $service.Value

        $isHealthy = $false
        $responseTime = 0

        if ($serviceConfig.Type -eq "HTTP") {
            $url = "http://localhost:$($serviceConfig.Port)$($serviceConfig.HealthPath)"

            try {
                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
                $stopwatch.Stop()

                if ($response.StatusCode -eq 200) {
                    $isHealthy = $true
                    $responseTime = $stopwatch.ElapsedMilliseconds
                }
            } catch {
                $isHealthy = $false
                $responseTime = -1
            }
        } elseif ($serviceConfig.Type -eq "TCP") {
            # Check if TCP port is open
            try {
                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                $tcpClient.Connect("localhost", $serviceConfig.Port)
                $stopwatch.Stop()

                if ($tcpClient.Connected) {
                    $isHealthy = $true
                    $responseTime = $stopwatch.ElapsedMilliseconds
                    $tcpClient.Close()
                }
            } catch {
                $isHealthy = $false
                $responseTime = -1
            }
        }

        $Results.Services[$serviceName] = @{
            Healthy = $isHealthy
            ResponseTime = $responseTime
            Port = $serviceConfig.Port
        }

        if ($isHealthy) {
            Write-Log "✅ $serviceName - Healthy (${responseTime}ms)" -Level "SUCCESS"
            Add-TestResult -TestCase "HEALTH-$serviceName" -Passed $true
        } else {
            Write-Log "❌ $serviceName - Unhealthy" -Level "ERROR"
            Add-TestResult -TestCase "HEALTH-$serviceName" -Passed $false -Notes "Service not responding"
        }
    }

    Write-Log "`nHealth Check Summary:" -Level "INFO"
    $healthyCount = ($Results.Services.Values | Where-Object { $_.Healthy }).Count
    $totalServices = $Results.Services.Count
    Write-Log "  Healthy: $healthyCount / $totalServices" -Level $(
        if ($healthyCount -eq $totalServices) { "SUCCESS" } else { "ERROR" }
    )
}

# Run ingestion tests
function Invoke-IngestionTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running Edge Data Ingestion Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    $ingestionUrl = "http://localhost:5122/api/v1/ingestion"

    # Test TC-INGEST-01: Ingest telemetry data
    Write-Log "TC-INGEST-01: Ingest telemetry data" -Level "INFO"
    $telemetryEvent = @{
        schema_version = "1.0"
        event_id = "evt-telemetry-cloud-001"
        trace_id = "trace-cloud-001"
        tenant_id = $TestTenantId
        device_id = $TestDeviceId
        event_type = "telemetry.reading"
        ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        payload = @{
            value = 26.4
            unit = "C"
            sensor_type = "temperature"
        }
    }

    try {
        $body = $telemetryEvent | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$ingestionUrl/telemetry" -Method Post -Body $body -ContentType "application/json" -Headers @{ "X-API-Key" = $APIKey }
        Add-TestResult -TestCase "TC-INGEST-01" -Passed $true -Notes "Telemetry ingested successfully"
    } catch {
        Add-TestResult -TestCase "TC-INGEST-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-INGEST-02: Ingest feed intake data
    Write-Log "TC-INGEST-02: Ingest feed intake data" -Level "INFO"
    $feedEvent = @{
        schema_version = "1.0"
        event_id = "evt-feed-cloud-001"
        trace_id = "trace-cloud-001"
        tenant_id = $TestTenantId
        barn_id = $TestBarnId
        event_type = "feed.intake"
        ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        payload = @{
            feed_type = "starter"
            quantity_kg = 150.5
            silo_id = "silo-001"
        }
    }

    try {
        $body = $feedEvent | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$ingestionUrl/feed" -Method Post -Body $body -ContentType "application/json" -Headers @{ "X-API-Key" = $APIKey }
        Add-TestResult -TestCase "TC-INGEST-02" -Passed $true -Notes "Feed intake ingested successfully"
    } catch {
        Add-TestResult -TestCase "TC-INGEST-02" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-INGEST-03: Ingest barn records
    Write-Log "TC-INGEST-03: Ingest barn records" -Level "INFO"
    $barnEvent = @{
        schema_version = "1.0"
        event_id = "evt-barn-cloud-001"
        trace_id = "trace-cloud-001"
        tenant_id = $TestTenantId
        barn_id = $TestBarnId
        event_type = "barn.record.created"
        ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        payload = @{
            batch_id = $TestBatchId
            bird_count = 5000
            average_weight_g = 1200
        }
    }

    try {
        $body = $barnEvent | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$ingestionUrl/barn-records" -Method Post -Body $body -ContentType "application/json" -Headers @{ "X-API-Key" = $APIKey }
        Add-TestResult -TestCase "TC-INGEST-03" -Passed $true -Notes "Barn records ingested successfully"
    } catch {
        Add-TestResult -TestCase "TC-INGEST-03" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-INGEST-04: Ingest weighvision session
    Write-Log "TC-INGEST-04: Ingest weighvision session" -Level "INFO"
    $wvEvent = @{
        schema_version = "1.0"
        event_id = "evt-wv-cloud-001"
        trace_id = "trace-cloud-001"
        tenant_id = $TestTenantId
        device_id = $TestWVDeviceId
        event_type = "weighvision.session.created"
        ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        payload = @{
            batch_id = $TestBatchId
            station_id = $TestStationId
        }
    }

    try {
        $body = $wvEvent | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$ingestionUrl/weighvision" -Method Post -Body $body -ContentType "application/json" -Headers @{ "X-API-Key" = $APIKey }
        Add-TestResult -TestCase "TC-INGEST-04" -Passed $true -Notes "WeighVision session ingested successfully"
    } catch {
        Add-TestResult -TestCase "TC-INGEST-04" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-INGEST-06: Invalid API key
    Write-Log "TC-INGEST-06: Invalid API key" -Level "INFO"
    try {
        $body = $telemetryEvent | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$ingestionUrl/telemetry" -Method Post -Body $body -ContentType "application/json" -Headers @{ "X-API-Key" = "invalid-key" } -ErrorAction Stop
        Add-TestResult -TestCase "TC-INGEST-06" -Passed $false -Notes "Should have returned 401 Unauthorized"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Add-TestResult -TestCase "TC-INGEST-06" -Passed $true -Notes "Correctly rejected invalid API key"
        } else {
            Add-TestResult -TestCase "TC-INGEST-06" -Passed $false -Notes "Expected 401, got $($_.Exception.Response.StatusCode)"
        }
    }
}

# Run service tests
function Invoke-ServiceTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running Cloud Service Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    # Test TC-TELEM-01: Query latest telemetry
    Write-Log "TC-TELEM-01: Query latest telemetry" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5123/api/v1/telemetry/latest?tenant_id=$TestTenantId&device_id=$TestDeviceId" -Method Get
        Add-TestResult -TestCase "TC-TELEM-01" -Passed $true -Notes "Retrieved latest telemetry"
    } catch {
        Add-TestResult -TestCase "TC-TELEM-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-FEED-01: Get feed deliveries
    Write-Log "TC-FEED-01: Get feed deliveries" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5130/api/v1/feed/deliveries?tenant_id=$TestTenantId&barn_id=$TestBarnId" -Method Get
        Add-TestResult -TestCase "TC-FEED-01" -Passed $true -Notes "Retrieved feed deliveries"
    } catch {
        Add-TestResult -TestCase "TC-FEED-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-BARN-01: Get barn list
    Write-Log "TC-BARN-01: Get barn list" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5131/api/v1/barns?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-BARN-01" -Passed $true -Notes "Retrieved barn list"
    } catch {
        Add-TestResult -TestCase "TC-BARN-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-WV-01: Get weighvision sessions
    Write-Log "TC-WV-01: Get weighvision sessions" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5132/api/v1/weighvision/sessions?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-WV-01" -Passed $true -Notes "Retrieved weighvision sessions"
    } catch {
        Add-TestResult -TestCase "TC-WV-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-ANALYTICS-01: Get KPI summary
    Write-Log "TC-ANALYTICS-01: Get KPI summary" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5124/api/v1/analytics/kpi/summary?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-ANALYTICS-01" -Passed $true -Notes "Retrieved KPI summary"
    } catch {
        Add-TestResult -TestCase "TC-ANALYTICS-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-NOTIF-01: Get notifications
    Write-Log "TC-NOTIF-01: Get notifications" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5128/api/v1/notifications?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-NOTIF-01" -Passed $true -Notes "Retrieved notifications"
    } catch {
        Add-TestResult -TestCase "TC-NOTIF-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }
}

# Run BFF tests
function Invoke-BFFTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running BFF (API Gateway) Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    # Test TC-BFF-01: Get telemetry via BFF
    Write-Log "TC-BFF-01: Get telemetry via BFF" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5125/bff/api/v1/telemetry/latest?tenant_id=$TestTenantId&device_id=$TestDeviceId" -Method Get
        Add-TestResult -TestCase "TC-BFF-01" -Passed $true -Notes "Retrieved telemetry via BFF"
    } catch {
        Add-TestResult -TestCase "TC-BFF-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-BFF-02: Get feed data via BFF
    Write-Log "TC-BFF-02: Get feed data via BFF" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5125/bff/api/v1/feed/deliveries?tenant_id=$TestTenantId&barn_id=$TestBarnId" -Method Get
        Add-TestResult -TestCase "TC-BFF-02" -Passed $true -Notes "Retrieved feed data via BFF"
    } catch {
        Add-TestResult -TestCase "TC-BFF-02" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-BFF-03: Get barn data via BFF
    Write-Log "TC-BFF-03: Get barn data via BFF" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5125/bff/api/v1/barns?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-BFF-03" -Passed $true -Notes "Retrieved barn data via BFF"
    } catch {
        Add-TestResult -TestCase "TC-BFF-03" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-BFF-04: Get analytics via BFF
    Write-Log "TC-BFF-04: Get analytics via BFF" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5125/bff/api/v1/analytics/kpi/summary?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-BFF-04" -Passed $true -Notes "Retrieved analytics via BFF"
    } catch {
        Add-TestResult -TestCase "TC-BFF-04" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-BFF-05: Get weighvision via BFF
    Write-Log "TC-BFF-05: Get weighvision via BFF" -Level "INFO"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5125/bff/api/v1/weighvision/sessions?tenant_id=$TestTenantId" -Method Get
        Add-TestResult -TestCase "TC-BFF-05" -Passed $true -Notes "Retrieved weighvision via BFF"
    } catch {
        Add-TestResult -TestCase "TC-BFF-05" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }
}

# Run frontend tests
function Invoke-FrontendTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running Frontend Application Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    # Test TC-FE-01: Dashboard web loads
    Write-Log "TC-FE-01: Dashboard web loads" -Level "INFO"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5142/" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Add-TestResult -TestCase "TC-FE-01" -Passed $true -Notes "Dashboard web loaded successfully"
        } else {
            Add-TestResult -TestCase "TC-FE-01" -Passed $false -Notes "Status code: $($response.StatusCode)"
        }
    } catch {
        Add-TestResult -TestCase "TC-FE-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-FE-02: Admin web loads
    Write-Log "TC-FE-02: Admin web loads" -Level "INFO"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5143/" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Add-TestResult -TestCase "TC-FE-02" -Passed $true -Notes "Admin web loaded successfully"
        } else {
            Add-TestResult -TestCase "TC-FE-02" -Passed $false -Notes "Status code: $($response.StatusCode)"
        }
    } catch {
        Add-TestResult -TestCase "TC-FE-02" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }
}

# Run database tests
function Invoke-DatabaseTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running Database Persistence Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    # Test TC-DB-01: Telemetry stored
    Write-Log "TC-DB-01: Telemetry stored in database" -Level "INFO"
    try {
        $query = "SELECT COUNT(*) FROM telemetry_readings WHERE tenant_id = '$TestTenantId' AND device_id = '$TestDeviceId'"
        $result = docker exec farmiq-cloud-postgres psql -U farmiq -d cloud_telemetry -t -c $query 2>&1
        $count = [int]($result -replace '\s+', '')
        if ($count -gt 0) {
            Add-TestResult -TestCase "TC-DB-01" -Passed $true -Notes "Found $count telemetry records"
        } else {
            Add-TestResult -TestCase "TC-DB-01" -Passed $false -Notes "No telemetry records found"
        }
    } catch {
        Add-TestResult -TestCase "TC-DB-01" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-DB-02: Feed data stored
    Write-Log "TC-DB-02: Feed data stored in database" -Level "INFO"
    try {
        $query = "SELECT COUNT(*) FROM feed_intake_events WHERE tenant_id = '$TestTenantId' AND barn_id = '$TestBarnId'"
        $result = docker exec farmiq-cloud-postgres psql -U farmiq -d cloud_feed -t -c $query 2>&1
        $count = [int]($result -replace '\s+', '')
        if ($count -gt 0) {
            Add-TestResult -TestCase "TC-DB-02" -Passed $true -Notes "Found $count feed records"
        } else {
            Add-TestResult -TestCase "TC-DB-02" -Passed $false -Notes "No feed records found"
        }
    } catch {
        Add-TestResult -TestCase "TC-DB-02" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-DB-03: Barn records stored
    Write-Log "TC-DB-03: Barn records stored in database" -Level "INFO"
    try {
        $query = "SELECT COUNT(*) FROM barn_records WHERE tenant_id = '$TestTenantId' AND barn_id = '$TestBarnId'"
        $result = docker exec farmiq-cloud-postgres psql -U farmiq -d cloud_barn_records -t -c $query 2>&1
        $count = [int]($result -replace '\s+', '')
        if ($count -gt 0) {
            Add-TestResult -TestCase "TC-DB-03" -Passed $true -Notes "Found $count barn records"
        } else {
            Add-TestResult -TestCase "TC-DB-03" -Passed $false -Notes "No barn records found"
        }
    } catch {
        Add-TestResult -TestCase "TC-DB-03" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }

    # Test TC-DB-04: WeighVision stored
    Write-Log "TC-DB-04: WeighVision stored in database" -Level "INFO"
    try {
        $query = "SELECT COUNT(*) FROM weighvision_sessions WHERE tenant_id = '$TestTenantId'"
        $result = docker exec farmiq-cloud-postgres psql -U farmiq -d cloud_weighvision_readmodel -t -c $query 2>&1
        $count = [int]($result -replace '\s+', '')
        if ($count -gt 0) {
            Add-TestResult -TestCase "TC-DB-04" -Passed $true -Notes "Found $count weighvision sessions"
        } else {
            Add-TestResult -TestCase "TC-DB-04" -Passed $false -Notes "No weighvision sessions found"
        }
    } catch {
        Add-TestResult -TestCase "TC-DB-04" -Passed $false -Notes "Error: $($_.Exception.Message)"
    }
}

# Generate report
function Generate-Report {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Generating Test Report" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    $Results.EndTime = Get-Date -Format "o"
    $startTime = [DateTime]::Parse($Results.StartTime)
    $endTime = [DateTime]::Parse($Results.EndTime)
    $Results.Duration = ($endTime - $startTime).TotalSeconds

    # Save JSON report
    $Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportFile -Encoding UTF8
    Write-Log "JSON report saved to: $ReportFile" -Level "INFO"

    # Print summary
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Test Execution Summary" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"
    Write-Log "Total Tests: $($Results.Summary.Total)" -Level "INFO"
    Write-Log "Passed: $($Results.Summary.Passed)" -Level "SUCCESS"
    Write-Log "Failed: $($Results.Summary.Failed)" -Level $(
        if ($Results.Summary.Failed -gt 0) { "ERROR" } else { "SUCCESS" }
    )
    Write-Log "Duration: $([Math]::Round($Results.Duration, 2)) seconds" -Level "INFO"
    Write-Log "Log file: $LogFile" -Level "INFO"
    Write-Log "Report file: $ReportFile" -Level "INFO"

    # Print failed tests
    if ($Results.Summary.Failed -gt 0) {
        Write-Log "`nFailed Tests:" -Level "ERROR"
        foreach ($testCase in $Results.TestCases.GetEnumerator()) {
            if (-not $testCase.Value.Passed) {
                Write-Log "  - $($testCase.Key): $($testCase.Value.Notes)" -Level "ERROR"
            }
        }
    }

    # Exit with appropriate code
    if ($Results.Summary.Failed -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# Main execution
function Main {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "FarmIQ Cloud-Layer Test Runner" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"
    Write-Log "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Level "INFO"
    Write-Log "Log File: $LogFile" -Level "INFO"

    # Check Docker
    if (-not (Test-DockerRunning)) {
        Write-Log "ERROR: Docker is not running!" -Level "ERROR"
        exit 1
    }

    # Run health checks
    if (-not $SkipHealthChecks) {
        Invoke-HealthChecks
    } else {
        Write-Log "Skipping health checks..." -Level "INFO"
    }

    # Run ingestion tests
    if (-not $SkipIngestionTests) {
        Invoke-IngestionTests
    } else {
        Write-Log "Skipping ingestion tests..." -Level "INFO"
    }

    # Run service tests
    if (-not $SkipServiceTests) {
        Invoke-ServiceTests
    } else {
        Write-Log "Skipping service tests..." -Level "INFO"
    }

    # Run BFF tests
    if (-not $SkipBFFTests) {
        Invoke-BFFTests
    } else {
        Write-Log "Skipping BFF tests..." -Level "INFO"
    }

    # Run frontend tests
    if (-not $SkipFrontendTests) {
        Invoke-FrontendTests
    } else {
        Write-Log "Skipping frontend tests..." -Level "INFO"
    }

    # Run database tests
    if (-not $SkipDatabaseTests) {
        Invoke-DatabaseTests
    } else {
        Write-Log "Skipping database tests..." -Level "INFO"
    }

    # Generate report
    Generate-Report
}

# Run main function
Main
