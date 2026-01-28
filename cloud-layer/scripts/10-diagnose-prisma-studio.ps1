# Prisma Studio Container Diagnostic Script
# This script checks why containers are exiting

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "=== Prisma Studio Container Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "1. Checking Docker status..." -ForegroundColor Yellow
if (-not (Test-Docker)) {
    Write-Host "   ✗ Docker is not running or not accessible" -ForegroundColor Red
    Write-Host "   → Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✓ Docker is running" -ForegroundColor Green

# Check network
Write-Host ""
Write-Host "2. Checking farmiq-net network..." -ForegroundColor Yellow
$network = docker network ls --filter name=farmiq-net --format "{{.Name}}"
if ($network -eq "farmiq-net") {
    Write-Host "   ✓ Network 'farmiq-net' exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ Network 'farmiq-net' does not exist" -ForegroundColor Red
    Write-Host "   → Creating network..." -ForegroundColor Yellow
    docker network create farmiq-net
    Write-Host "   ✓ Network created" -ForegroundColor Green
}

# Check PostgreSQL
Write-Host ""
Write-Host "3. Checking PostgreSQL container..." -ForegroundColor Yellow
$postgres = docker ps --filter name=postgres --format "{{.Names}}"
if ($postgres) {
    Write-Host "   ✓ PostgreSQL container is running: $postgres" -ForegroundColor Green

    # Test connection
    Write-Host "   → Testing PostgreSQL connection..." -ForegroundColor Yellow
    $testConn = docker exec $postgres psql -U $Script:PostgresUser -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ PostgreSQL connection successful" -ForegroundColor Green
    } else {
        Write-Host "   ✗ PostgreSQL connection failed" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ PostgreSQL container is not running" -ForegroundColor Red
    Write-Host "   → Please start PostgreSQL first" -ForegroundColor Yellow
}

# Check container logs
Write-Host ""
Write-Host "4. Checking Prisma Studio container logs..." -ForegroundColor Yellow

$containers = @(
    "cloud-layer-prisma-studio-barn-records-1",
    "cloud-layer-prisma-studio-feed-1",
    "cloud-layer-prisma-studio-notification-1",
    "cloud-layer-prisma-studio-analytics-1"
)

foreach ($container in $containers) {
    Write-Host ""
    Write-Host "   Container: $container" -ForegroundColor Cyan
    $logs = docker logs $container 2>&1 | Select-Object -Last 10

    if ($logs -match "Error|error|ERROR") {
        Write-Host "   ✗ Errors found:" -ForegroundColor Red
        $logs | Where-Object { $_ -match "Error|error|ERROR" } | ForEach-Object {
            Write-Host "     $_" -ForegroundColor Red
        }
    } elseif ($logs -match "Can't reach database|ECONNREFUSED|P1001") {
        Write-Host "   ✗ Database connection error" -ForegroundColor Red
        Write-Host "     → Check if PostgreSQL is running" -ForegroundColor Yellow
        Write-Host "     → Check DATABASE_URL in docker-compose.prisma.yml" -ForegroundColor Yellow
    } elseif ($logs -match "Schema parsing|Invalid schema") {
        Write-Host "   ✗ Prisma schema error" -ForegroundColor Red
        Write-Host "     → Check prisma/schema.prisma file" -ForegroundColor Yellow
    } else {
        Write-Host "   Last 10 log lines:" -ForegroundColor Gray
        $logs | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
    }
}

# Check container status
Write-Host ""
Write-Host "5. Container status summary..." -ForegroundColor Yellow
docker ps -a --filter "name=prisma-studio" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If PostgreSQL is not running, start it first" -ForegroundColor White
Write-Host "2. If network is missing, it has been created automatically" -ForegroundColor White
Write-Host "3. Check the error messages above for specific issues" -ForegroundColor White
Write-Host "4. Try restarting containers: docker-compose -f docker-compose.prisma.yml up -d" -ForegroundColor White
