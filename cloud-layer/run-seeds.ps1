# Script to migrate and seed all cloud services
# Usage: .\run-seeds.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== FarmIQ Cloud Services: Migrate & Seed ===" -ForegroundColor Cyan
Write-Host ""

$CLOUD_COMPOSE = "docker-compose.dev.yml"
$SEED_COUNT = $env:SEED_COUNT
if (-not $SEED_COUNT) {
    $SEED_COUNT = "30"
}

Write-Host "SEED_COUNT: $SEED_COUNT" -ForegroundColor Yellow
Write-Host ""

# Function to run command in container
function Run-InContainer {
    param(
        [string]$Service,
        [string]$Command
    )
    
    Write-Host "[$Service] Running: $Command" -ForegroundColor Gray
    try {
        docker compose -f $CLOUD_COMPOSE exec -T $Service sh -c "$Command" 2>&1 | Out-Null
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

# Function to migrate and seed a Prisma service
function MigrateAndSeed-PrismaService {
    param(
        [string]$Service,
        [string]$ServiceName
    )
    
    Write-Host "--- $ServiceName ---" -ForegroundColor Cyan
    
    # Try to migrate (may fail if no migrations, that's OK)
    $migrateCmd = "npx prisma migrate deploy 2>&1 || npx prisma db push --accept-data-loss 2>&1"
    $migrateSuccess = Run-InContainer -Service $Service -Command $migrateCmd
    if (-not $migrateSuccess) {
        Write-Host "[$ServiceName] Migration warning (may be OK if schema already exists)" -ForegroundColor Yellow
    }
    
    # Generate Prisma client
    Run-InContainer -Service $Service -Command "npx prisma generate" | Out-Null
    
    # Run seed
    $seedCmd = "SEED_COUNT=$SEED_COUNT npm run seed"
    $seedSuccess = Run-InContainer -Service $Service -Command $seedCmd
    return $seedSuccess
}

# Check if docker compose is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: docker command not found" -ForegroundColor Red
    exit 1
}

# Check if services are running
Write-Host "Checking if services are running..." -ForegroundColor Yellow
$running = docker compose -f $CLOUD_COMPOSE ps --services --filter "status=running" | Measure-Object -Line

if ($running.Lines -eq 0) {
    Write-Host "ERROR: No services are running. Start them with:" -ForegroundColor Red
    Write-Host "  docker compose -f $CLOUD_COMPOSE up -d" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Results tracking
$results = @()

# Services with Prisma
$prismaServices = @(
    @{Service="cloud-identity-access"; Name="cloud-identity-access"},
    @{Service="cloud-tenant-registry"; Name="cloud-tenant-registry"},
    @{Service="cloud-ingestion"; Name="cloud-ingestion"},
    @{Service="cloud-telemetry-service"; Name="cloud-telemetry-service"},
    @{Service="cloud-api-gateway-bff"; Name="cloud-api-gateway-bff"},
    @{Service="cloud-config-rules-service"; Name="cloud-config-rules-service"},
    @{Service="cloud-audit-log-service"; Name="cloud-audit-log-service"},
    @{Service="cloud-notification-service"; Name="cloud-notification-service"},
    @{Service="cloud-feed-service"; Name="cloud-feed-service"},
    @{Service="cloud-barn-records-service"; Name="cloud-barn-records-service"},
    @{Service="cloud-weighvision-readmodel"; Name="cloud-weighvision-readmodel"},
    @{Service="cloud-reporting-export-service"; Name="cloud-reporting-export-service"}
)

foreach ($svc in $prismaServices) {
    $success = MigrateAndSeed-PrismaService -Service $svc.Service -ServiceName $svc.Name
    $results += @{Service=$svc.Name; Success=$success}
    Write-Host ""
}

# Python service (analytics)
Write-Host "--- cloud-analytics-service (Python) ---" -ForegroundColor Cyan
$seedCmd = "SEED_COUNT=$SEED_COUNT python -m app.seed"
$success = Run-InContainer -Service "cloud-analytics-service" -Command $seedCmd
$results += @{Service="cloud-analytics-service"; Success=$success}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Magenta

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$totalCount = $results.Count

Write-Host "Success: $successCount / $totalCount" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

foreach ($result in $results) {
    $color = if ($result.Success) { "Green" } else { "Red" }
    $status = if ($result.Success) { "[OK]" } else { "[FAIL]" }
    Write-Host "  $status $($result.Service)" -ForegroundColor $color
}

if ($successCount -eq $totalCount) {
    Write-Host ""
    Write-Host "All seeds completed successfully! ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Some seeds failed. Check the output above." -ForegroundColor Yellow
    exit 1
}

