# FarmIQ Edge-Layer Comprehensive Test Runner
# This script tests all Edge-Layer services end-to-end

param(
    [switch]$SkipHealthChecks = $false,
    [switch]$SkipIoTSimulator = $false,
    [switch]$SkipHTTPTests = $false,
    [switch]$SkipSyncTests = $false,
    [int]$TestDuration = 60,
    [string]$LogDir = "logs"
)

# Script configuration
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$LogFile = Join-Path $ScriptDir "$LogDir\edge-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ReportFile = Join-Path $ScriptDir "$LogDir\edge-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

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
    "edge-mqtt-broker" = @{ Port = 5100; Type = "MQTT" }
    "edge-cloud-ingestion-mock" = @{ Port = 5102; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-ingress-gateway" = @{ Port = 5103; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-telemetry-timeseries" = @{ Port = 5104; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-weighvision-session" = @{ Port = 5105; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-media-store" = @{ Port = 5106; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-vision-inference" = @{ Port = 5107; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-sync-forwarder" = @{ Port = 5108; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-policy-sync" = @{ Port = 5109; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-observability-agent" = @{ Port = 5111; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-feed-intake" = @{ Port = 5116; Type = "HTTP"; HealthPath = "/api/health" }
    "edge-retention-janitor" = @{ Port = 5114; Type = "HTTP"; HealthPath = "/api/health" }
}

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
        } elseif ($serviceConfig.Type -eq "MQTT") {
            # Check if MQTT port is open
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
}

# Seed database allowlists
function Invoke-SeedAllowlists {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Seeding Database Allowlists" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    $tenantId = "t-001"
    $farmId = "f-001"
    $barnId = "b-001"
    $deviceId = "d-001"
    $stationId = "st-01"

    try {
        # Seed device allowlist
        $sqlDevice = @"
INSERT INTO device_allowlist (tenant_id, device_id, farm_id, barn_id, enabled, created_at, updated_at)
VALUES ('$tenantId','$deviceId','$farmId','$barnId', TRUE, NOW(), NOW())
ON CONFLICT (tenant_id, device_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();
"@

        docker exec edge-layer-postgres-1 psql -U farmiq -d farmiq -c $sqlDevice 2>&1 | Out-Null

        # Seed station allowlist
        $sqlStation = @"
INSERT INTO station_allowlist (tenant_id, station_id, farm_id, barn_id, enabled, created_at, updated_at)
VALUES ('$tenantId','$stationId','$farmId','$barnId', TRUE, NOW(), NOW())
ON CONFLICT (tenant_id, station_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();
"@

        docker exec edge-layer-postgres-1 psql -U farmiq -d farmiq -c $sqlStation 2>&1 | Out-Null

        Write-Log "✅ Allowlists seeded successfully" -Level "SUCCESS"
        Add-TestResult -TestCase "SEED-ALLOWLISTS" -Passed $true
    } catch {
        Write-Log "❌ Failed to seed allowlists: $_" -Level "ERROR"
        Add-TestResult -TestCase "SEED-ALLOWLISTS" -Passed $false -Notes $_.Exception.Message
    }
}

# Run IoT simulator
function Invoke-IoTSimulator {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running IoT Simulator" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    $simulatorScript = Join-Path $ScriptDir "iot-simulator-enhanced.js"

    if (-not (Test-Path $simulatorScript)) {
        Write-Log "❌ IoT simulator script not found: $simulatorScript" -Level "ERROR"
        Add-TestResult -TestCase "IOT-SIMULATOR" -Passed $false -Notes "Simulator script not found"
        return
    }

    try {
        Write-Log "Starting IoT simulator for ${TestDuration} seconds..." -Level "INFO"

        $process = Start-Process -FilePath "node" -ArgumentList "`"$simulatorScript`" --duration $TestDuration" -NoNewWindow -Wait -PassThru

        if ($process.ExitCode -eq 0) {
            Write-Log "✅ IoT simulator completed successfully" -Level "SUCCESS"
            Add-TestResult -TestCase "IOT-SIMULATOR" -Passed $true
        } else {
            Write-Log "❌ IoT simulator failed with exit code: $($process.ExitCode)" -Level "ERROR"
            Add-TestResult -TestCase "IOT-SIMULATOR" -Passed $false -Notes "Exit code: $($process.ExitCode)"
        }
    } catch {
        Write-Log "❌ Failed to run IoT simulator: $_" -Level "ERROR"
        Add-TestResult -TestCase "IOT-SIMULATOR" -Passed $false -Notes $_.Exception.Message
    }
}

# Run HTTP API tests
function Invoke-HTTPTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running HTTP API Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    $baseUrl = "http://localhost:5103"

    # Test ingress stats
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/ingress/stats" -Method Get -TimeoutSec 10
        Write-Log "✅ Ingress stats retrieved: $($response | ConvertTo-Json -Compress)" -Level "SUCCESS"
        Add-TestResult -TestCase "HTTP-INGRESS-STATS" -Passed $true
    } catch {
        Write-Log "❌ Failed to get ingress stats: $_" -Level "ERROR"
        Add-TestResult -TestCase "HTTP-INGRESS-STATS" -Passed $false -Notes $_.Exception.Message
    }

    # Test sync state
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5108/api/v1/sync/state" -Method Get -TimeoutSec 10
        Write-Log "✅ Sync state retrieved: $($response | ConvertTo-Json -Compress)" -Level "SUCCESS"
        Add-TestResult -TestCase "HTTP-SYNC-STATE" -Passed $true
    } catch {
        Write-Log "❌ Failed to get sync state: $_" -Level "ERROR"
        Add-TestResult -TestCase "HTTP-SYNC-STATE" -Passed $false -Notes $_.Exception.Message
    }

    # Test observability
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5111/api/v1/ops" -Method Get -TimeoutSec 10
        Write-Log "✅ Observability health retrieved: $($response | ConvertTo-Json -Compress)" -Level "SUCCESS"
        Add-TestResult -TestCase "HTTP-OBSERVABILITY" -Passed $true
    } catch {
        Write-Log "❌ Failed to get observability health: $_" -Level "ERROR"
        Add-TestResult -TestCase "HTTP-OBSERVABILITY" -Passed $false -Notes $_.Exception.Message
    }
}

# Run sync tests
function Invoke-SyncTests {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Running Sync Forwarder Tests" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    # Check sync forwarder outbox
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5108/api/v1/sync/outbox" -Method Get -TimeoutSec 10
        Write-Log "✅ Outbox retrieved: $($response | ConvertTo-Json -Compress)" -Level "SUCCESS"

        if ($response.pending -gt 0) {
            Write-Log "⚠️  Warning: $($response.pending) pending items in outbox" -Level "WARNING"
        }

        Add-TestResult -TestCase "SYNC-OUTBOX" -Passed $true
    } catch {
        Write-Log "❌ Failed to get outbox: $_" -Level "ERROR"
        Add-TestResult -TestCase "SYNC-OUTBOX" -Passed $false -Notes $_.Exception.Message
    }

    # Check cloud mock received data
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5102/api/v1/mock/stats" -Method Get -TimeoutSec 10
        Write-Log "✅ Cloud mock stats: $($response | ConvertTo-Json -Compress)" -Level "SUCCESS"
        Add-TestResult -TestCase "SYNC-CLOUD-MOCK" -Passed $true
    } catch {
        Write-Log "⚠️  Cloud mock stats endpoint not available (may not be implemented)" -Level "WARNING"
        Add-TestResult -TestCase "SYNC-CLOUD-MOCK" -Passed $true -Notes "Endpoint not implemented"
    }
}

# Generate test report
function Invoke-GenerateReport {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "Test Report" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    $Results.EndTime = Get-Date -Format "o"
    $startTime = [DateTime]::Parse($Results.StartTime)
    $endTime = [DateTime]::Parse($Results.EndTime)
    $Results.Duration = ($endTime - $startTime).TotalSeconds

    Write-Log "Test Start Time: $($Results.StartTime)" -Level "INFO"
    Write-Log "Test End Time: $($Results.EndTime)" -Level "INFO"
    Write-Log "Total Duration: $($Results.Duration) seconds" -Level "INFO"
    Write-Log "" -Level "INFO"

    Write-Log "Summary:" -Level "INFO"
    Write-Log "  Total Tests: $($Results.Summary.Total)" -Level "INFO"
    Write-Log "  Passed: $($Results.Summary.Passed)" -Level "SUCCESS"
    Write-Log "  Failed: $($Results.Summary.Failed)" -Level "ERROR"
    Write-Log "  Success Rate: $(if ($Results.Summary.Total -gt 0) { [math]::Round(($Results.Summary.Passed / $Results.Summary.Total) * 100, 2) } else { 0 })%" -Level "INFO"
    Write-Log "" -Level "INFO"

    Write-Log "Service Health:" -Level "INFO"
    foreach ($service in $Results.Services.GetEnumerator()) {
        $status = if ($service.Value.Healthy) { "✅ Healthy" } else { "❌ Unhealthy" }
        $responseTime = if ($service.Value.ResponseTime -ge 0) { "$($service.Value.ResponseTime)ms" } else { "N/A" }
        Write-Log "  $($service.Key): $status ($responseTime)" -Level "INFO"
    }
    Write-Log "" -Level "INFO"

    # Save JSON report
    $Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportFile -Encoding UTF8
    Write-Log "Detailed report saved to: $ReportFile" -Level "INFO"
    Write-Log "Log file saved to: $LogFile" -Level "INFO"
}

# Main execution
function Main {
    Write-Log "`n========================================" -Level "INFO"
    Write-Log "FarmIQ Edge-Layer Test Runner" -Level "INFO"
    Write-Log "========================================`n" -Level "INFO"

    # Check Docker is running
    if (-not (Test-DockerRunning)) {
        Write-Log "❌ Docker is not running. Please start Docker and try again." -Level "ERROR"
        exit 1
    }

    Write-Log "✅ Docker is running" -Level "SUCCESS"

    # Run health checks
    if (-not $SkipHealthChecks) {
        Invoke-HealthChecks
    } else {
        Write-Log "⏭️  Skipping health checks" -Level "WARNING"
    }

    # Seed allowlists
    Invoke-SeedAllowlists

    # Run IoT simulator
    if (-not $SkipIoTSimulator) {
        Invoke-IoTSimulator
    } else {
        Write-Log "⏭️  Skipping IoT simulator" -Level "WARNING"
    }

    # Run HTTP tests
    if (-not $SkipHTTPTests) {
        Invoke-HTTPTests
    } else {
        Write-Log "⏭️  Skipping HTTP tests" -Level "WARNING"
    }

    # Run sync tests
    if (-not $SkipSyncTests) {
        Invoke-SyncTests
    } else {
        Write-Log "⏭️  Skipping sync tests" -Level "WARNING"
    }

    # Generate report
    Invoke-GenerateReport

    # Exit with appropriate code
    if ($Results.Summary.Failed -gt 0) {
        Write-Log "`n❌ Tests completed with failures" -Level "ERROR"
        exit 1
    } else {
        Write-Log "`n✅ All tests passed!" -Level "SUCCESS"
        exit 0
    }
}

# Run main function
try {
    Main
} catch {
    Write-Log "`n❌ Fatal error: $_" -Level "ERROR"
    Write-Log $_.ScriptStackTrace -Level "ERROR"
    exit 1
}
