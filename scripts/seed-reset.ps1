# Seed Reset Script
# This script resets all databases and reseeds them
# WARNING: This will delete all existing data!

$ErrorActionPreference = "Stop"

Write-Host "=== FarmIQ Seed Reset ===" -ForegroundColor Cyan
Write-Host "WARNING: This will DELETE all existing data and reseed!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Are you sure you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Resetting and reseeding all databases..." -ForegroundColor Yellow
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

# Function to reset and seed a Prisma service
function Reset-AndSeed-PrismaService {
    param(
        [string]$ComposeFile,
        [string]$Service,
        [string]$ServiceName
    )
    
    Write-Host "--- Resetting and Seeding $ServiceName ---" -ForegroundColor Cyan
    
    # Reset database (drop and recreate)
    Write-Host "[$Service] Resetting database..." -ForegroundColor Gray
    docker compose -f $ComposeFile exec -T $Service sh -c "npm run db:reset" 2>&1 | Out-Null
    
    # Migrate
    Write-Host "[$Service] Running migrations..." -ForegroundColor Gray
    docker compose -f $ComposeFile exec -T $Service sh -c "npm run db:migrate" 2>&1 | Out-Null
    
    # Seed
    Write-Host "[$Service] Seeding data..." -ForegroundColor Gray
    docker compose -f $ComposeFile exec -T $Service sh -c "SEED_COUNT=$SEED_COUNT npm run db:seed" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$ServiceName] ✅ OK" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[$ServiceName] ❌ FAILED" -ForegroundColor Red
        return $false
    }
}

# Function to reset and seed a Python service
function Reset-AndSeed-PythonService {
    param(
        [string]$ComposeFile,
        [string]$Service,
        [string]$ServiceName
    )
    
    Write-Host "--- Resetting and Seeding $ServiceName ---" -ForegroundColor Cyan
    
    # For Python services, we'll just reseed (no reset command)
    Write-Host "[$Service] Seeding data..." -ForegroundColor Gray
    docker compose -f $ComposeFile exec -T $Service sh -c "SEED_COUNT=$SEED_COUNT python -m app.seed" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$ServiceName] ✅ OK" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[$ServiceName] ❌ FAILED" -ForegroundColor Red
        return $false
    }
}

# Results tracking
$results = @()

# Cloud Layer Services
Write-Host "=== CLOUD LAYER ===" -ForegroundColor Magenta

$services = @(
    @{Name="cloud-identity-access"; Type="Prisma"},
    @{Name="cloud-tenant-registry"; Type="Prisma"},
    @{Name="cloud-ingestion"; Type="Prisma"},
    @{Name="cloud-telemetry-service"; Type="Prisma"},
    @{Name="cloud-analytics-service"; Type="Python"},
    @{Name="cloud-api-gateway-bff"; Type="Prisma"},
    @{Name="cloud-config-rules-service"; Type="Prisma"},
    @{Name="cloud-audit-log-service"; Type="Prisma"},
    @{Name="cloud-notification-service"; Type="Prisma"},
    @{Name="cloud-feed-service"; Type="Prisma"},
    @{Name="cloud-barn-records-service"; Type="Prisma"},
    @{Name="cloud-weighvision-readmodel"; Type="Prisma"},
    @{Name="cloud-reporting-export-service"; Type="Prisma"}
)

foreach ($svc in $services) {
    if ($svc.Type -eq "Prisma") {
        $success = Reset-AndSeed-PrismaService -ComposeFile $CLOUD_COMPOSE -Service $svc.Name -ServiceName $svc.Name
    } else {
        $success = Reset-AndSeed-PythonService -ComposeFile $CLOUD_COMPOSE -Service $svc.Name -ServiceName $svc.Name
    }
    $results += @{Service=$svc.Name; Success=$success}
}

# Edge Layer Services
Write-Host ""
Write-Host "=== EDGE LAYER ===" -ForegroundColor Magenta

$edgeServices = @(
    @{Name="edge-telemetry-timeseries"; Type="Prisma"},
    @{Name="edge-weighvision-session"; Type="Prisma"},
    @{Name="edge-vision-inference"; Type="Python"},
    @{Name="edge-media-store"; Type="Prisma"},
    @{Name="edge-policy-sync"; Type="Prisma"},
    @{Name="edge-retention-janitor"; Type="Prisma"},
    @{Name="edge-observability-agent"; Type="Prisma"},
    @{Name="edge-ingress-gateway"; Type="Prisma"}
)

foreach ($svc in $edgeServices) {
    if ($svc.Type -eq "Prisma") {
        $success = Reset-AndSeed-PrismaService -ComposeFile $EDGE_COMPOSE -Service $svc.Name -ServiceName $svc.Name
    } else {
        $success = Reset-AndSeed-PythonService -ComposeFile $EDGE_COMPOSE -Service $svc.Name -ServiceName $svc.Name
    }
    $results += @{Service=$svc.Name; Success=$success}
}

# Summary
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failCount = ($results | Where-Object { $_.Success -eq $false }).Count
$totalCount = $results.Count

Write-Host "Total Services: $totalCount" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "Some services failed to reset/seed. Check the logs above for details." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "All databases reset and reseeded successfully! 🎉" -ForegroundColor Green
    exit 0
}
