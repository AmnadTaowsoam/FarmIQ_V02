# Seed All Services Script
# This script runs database migrations and seeds for all services in FarmIQ

$ErrorActionPreference = "Stop"

Write-Host "=== FarmIQ Seed All Services ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$CLOUD_COMPOSE = "cloud-layer\docker-compose.dev.yml"
$EDGE_COMPOSE = "edge-layer\docker-compose.dev.yml"
$SEED_COUNT = $env:SEED_COUNT
if (-not $SEED_COUNT) {
    $SEED_COUNT = "30"
}

Write-Host "SEED_COUNT: $SEED_COUNT" -ForegroundColor Yellow
Write-Host ""

# Function to run command in container
function Run-InContainer {
    param(
        [string]$ComposeFile,
        [string]$Service,
        [string]$Command
    )
    
    Write-Host "[$Service] Running: $Command" -ForegroundColor Gray
    try {
        docker compose -f $ComposeFile exec -T $Service sh -c "$Command"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[$Service] FAILED with exit code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
        Write-Host "[$Service] OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[$Service] ERROR: $_" -ForegroundColor Red
        return $false
    }
}

# Function to seed a Prisma service
function Seed-PrismaService {
    param(
        [string]$ComposeFile,
        [string]$Service,
        [string]$ServiceName
    )
    
    Write-Host "--- Seeding $ServiceName ---" -ForegroundColor Cyan
    
    $migrateCmd = "npm run db:migrate"
    $seedCmd = "npm run db:seed"
    
    $migrateSuccess = Run-InContainer -ComposeFile $ComposeFile -Service $Service -Command $migrateCmd
    if (-not $migrateSuccess) {
        Write-Host "[$ServiceName] Migration failed, skipping seed" -ForegroundColor Yellow
        return $false
    }
    
    $seedSuccess = Run-InContainer -ComposeFile $ComposeFile -Service $Service -Command $seedCmd
    return $seedSuccess
}

# Function to seed a Python service
function Seed-PythonService {
    param(
        [string]$ComposeFile,
        [string]$Service,
        [string]$ServiceName
    )
    
    Write-Host "--- Seeding $ServiceName ---" -ForegroundColor Cyan
    
    $seedCmd = "python -m app.seed"
    if ($SEED_COUNT) {
        $seedCmd = "SEED_COUNT=$SEED_COUNT $seedCmd"
    }
    
    $seedSuccess = Run-InContainer -ComposeFile $ComposeFile -Service $Service -Command $seedCmd
    return $seedSuccess
}

# Check if docker compose is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: docker command not found" -ForegroundColor Red
    exit 1
}

# Check if services are running
Write-Host "Checking if services are running..." -ForegroundColor Yellow
$cloudRunning = docker compose -f $CLOUD_COMPOSE ps --services --filter "status=running" | Measure-Object -Line
$edgeRunning = docker compose -f $EDGE_COMPOSE ps --services --filter "status=running" | Measure-Object -Line

if ($cloudRunning.Lines -eq 0) {
    Write-Host "WARNING: No cloud services are running. Start them with:" -ForegroundColor Yellow
    Write-Host "  docker compose -f $CLOUD_COMPOSE up -d" -ForegroundColor Gray
}

if ($edgeRunning.Lines -eq 0) {
    Write-Host "WARNING: No edge services are running. Start them with:" -ForegroundColor Yellow
    Write-Host "  docker compose -f $EDGE_COMPOSE up -d" -ForegroundColor Gray
}

Write-Host ""

# Results tracking
$results = @()

# ============================================
# CLOUD LAYER SERVICES
# ============================================
Write-Host "=== CLOUD LAYER ===" -ForegroundColor Magenta

# cloud-identity-access
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-identity-access" -ServiceName "cloud-identity-access"
$results += @{Service="cloud-identity-access"; Success=$success}

# cloud-tenant-registry  
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-tenant-registry" -ServiceName "cloud-tenant-registry"
$results += @{Service="cloud-tenant-registry"; Success=$success}

# cloud-ingestion
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-ingestion" -ServiceName "cloud-ingestion"
$results += @{Service="cloud-ingestion"; Success=$success}

# cloud-telemetry-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-telemetry-service" -ServiceName "cloud-telemetry-service"
$results += @{Service="cloud-telemetry-service"; Success=$success}

# cloud-analytics-service (Python)
$success = Seed-PythonService -ComposeFile $CLOUD_COMPOSE -Service "cloud-analytics-service" -ServiceName "cloud-analytics-service"
$results += @{Service="cloud-analytics-service"; Success=$success}

# cloud-api-gateway-bff
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-api-gateway-bff" -ServiceName "cloud-api-gateway-bff"
$results += @{Service="cloud-api-gateway-bff"; Success=$success}

# cloud-config-rules-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-config-rules-service" -ServiceName "cloud-config-rules-service"
$results += @{Service="cloud-config-rules-service"; Success=$success}

# cloud-audit-log-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-audit-log-service" -ServiceName "cloud-audit-log-service"
$results += @{Service="cloud-audit-log-service"; Success=$success}

# cloud-notification-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-notification-service" -ServiceName "cloud-notification-service"
$results += @{Service="cloud-notification-service"; Success=$success}

# cloud-feed-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-feed-service" -ServiceName "cloud-feed-service"
$results += @{Service="cloud-feed-service"; Success=$success}

# cloud-barn-records-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-barn-records-service" -ServiceName "cloud-barn-records-service"
$results += @{Service="cloud-barn-records-service"; Success=$success}

# cloud-weighvision-readmodel
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-weighvision-readmodel" -ServiceName "cloud-weighvision-readmodel"
$results += @{Service="cloud-weighvision-readmodel"; Success=$success}

# cloud-reporting-export-service
$success = Seed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service "cloud-reporting-export-service" -ServiceName "cloud-reporting-export-service"
$results += @{Service="cloud-reporting-export-service"; Success=$success}

# ============================================
# EDGE LAYER SERVICES
# ============================================
Write-Host ""
Write-Host "=== EDGE LAYER ===" -ForegroundColor Magenta

# edge-telemetry-timeseries
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-telemetry-timeseries" -ServiceName "edge-telemetry-timeseries"
$results += @{Service="edge-telemetry-timeseries"; Success=$success}

# edge-weighvision-session
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-weighvision-session" -ServiceName "edge-weighvision-session"
$results += @{Service="edge-weighvision-session"; Success=$success}

# edge-vision-inference (Python)
$success = Seed-PythonService -ComposeFile $EDGE_COMPOSE -Service "edge-vision-inference" -ServiceName "edge-vision-inference"
$results += @{Service="edge-vision-inference"; Success=$success}

# edge-media-store
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-media-store" -ServiceName "edge-media-store"
$results += @{Service="edge-media-store"; Success=$success}

# edge-policy-sync
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-policy-sync" -ServiceName "edge-policy-sync"
$results += @{Service="edge-policy-sync"; Success=$success}

# edge-retention-janitor
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-retention-janitor" -ServiceName "edge-retention-janitor"
$results += @{Service="edge-retention-janitor"; Success=$success}

# edge-observability-agent
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-observability-agent" -ServiceName "edge-observability-agent"
$results += @{Service="edge-observability-agent"; Success=$success}

# edge-ingress-gateway
$success = Seed-PrismaService -ComposeFile $EDGE_COMPOSE -Service "edge-ingress-gateway" -ServiceName "edge-ingress-gateway"
$results += @{Service="edge-ingress-gateway"; Success=$success}

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failCount = ($results | Where-Object { $_.Success -eq $false }).Count
$totalCount = $results.Count

Write-Host "Total Services: $totalCount" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

Write-Host ""
Write-Host "Detailed Results:" -ForegroundColor Yellow
foreach ($result in $results) {
    $status = if ($result.Success) { "✅ OK" } else { "❌ FAIL" }
    $color = if ($result.Success) { "Green" } else { "Red" }
    Write-Host "  $status - $($result.Service)" -ForegroundColor $color
}

Write-Host ""

if ($failCount -gt 0) {
    Write-Host "Some services failed to seed. Check the logs above for details." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "All services seeded successfully! 🎉" -ForegroundColor Green
    exit 0
}

