# FarmIQ Cloud Services: Start Prisma Studio Services
# Usage:
#   .\scripts\start-prisma-studio.ps1
#   .\scripts\start-prisma-studio.ps1 -BuildImages

param(
    [switch]$BuildImages = $false
)

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "=== FarmIQ Cloud Services: Prisma Studio ===" -ForegroundColor Cyan
Write-Host ""

$CLOUD_LAYER_DIR = Get-CloudLayerDir
$PrismaComposeFile = "docker-compose.prisma.yml"
$PrismaComposePath = Join-Path $CLOUD_LAYER_DIR $PrismaComposeFile

# Check Docker
if (-not (Test-Docker)) {
    Write-Host "ERROR: Docker is not available" -ForegroundColor Red
    Write-Host "  Please ensure Docker Desktop is running" -ForegroundColor Yellow
    exit 1
}

# Check if main services are running (needed for network and postgres)
Write-Host "Checking if main services are running..." -ForegroundColor Yellow
if (-not (Test-DockerComposeServices -ComposeFile $Script:DockerComposeDev)) {
    Write-Host "WARNING: Main services are not running." -ForegroundColor Yellow
    Write-Host "  Prisma Studio needs:" -ForegroundColor Yellow
    Write-Host "    - PostgreSQL container (for database connection)" -ForegroundColor Gray
    Write-Host "    - farmiq-net network" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Starting main services first..." -ForegroundColor Yellow
    docker compose -f (Get-DockerComposePath -ComposeFile $Script:DockerComposeDev) up -d postgres
    Start-Sleep -Seconds 5
}

# Build images if requested
if ($BuildImages) {
    Write-Host ""
    Write-Host "Building required images..." -ForegroundColor Yellow
    docker compose -f (Get-DockerComposePath -ComposeFile $Script:DockerComposeDev) build --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to build images" -ForegroundColor Red
        exit 1
    }
    Write-Host "Images built successfully" -ForegroundColor Green
}

# Ensure network exists
Write-Host ""
Write-Host "Ensuring farmiq-net network exists..." -ForegroundColor Yellow
$networkExists = docker network ls --format "{{.Name}}" | Select-String -Pattern "^farmiq-net$"
if (-not $networkExists) {
    Write-Host "Creating farmiq-net network..." -ForegroundColor Gray
    docker network create farmiq-net
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create network" -ForegroundColor Red
        exit 1
    }
    Write-Host "Network created" -ForegroundColor Green
} else {
    Write-Host "Network already exists" -ForegroundColor Green
}

# Start Prisma Studio services
Write-Host ""
Write-Host "Starting Prisma Studio services..." -ForegroundColor Yellow
Write-Host "  This will start Prisma Studio for all services" -ForegroundColor Gray
Write-Host "  Access them at:" -ForegroundColor Gray
Write-Host "    - Identity Access: http://localhost:5551" -ForegroundColor Cyan
Write-Host "    - Tenant Registry: http://localhost:5552" -ForegroundColor Cyan
Write-Host "    - Standards: http://localhost:5553" -ForegroundColor Cyan
Write-Host "    - Ingestion: http://localhost:5554" -ForegroundColor Cyan
Write-Host "    - Telemetry: http://localhost:5555" -ForegroundColor Cyan
Write-Host "    - API Gateway BFF: http://localhost:5556" -ForegroundColor Cyan
Write-Host "    - Config Rules: http://localhost:5557" -ForegroundColor Cyan
Write-Host "    - Audit Log: http://localhost:5558" -ForegroundColor Cyan
Write-Host "    - Notification: http://localhost:5559" -ForegroundColor Cyan
Write-Host "    - Reporting Export: http://localhost:5560" -ForegroundColor Cyan
Write-Host "    - Feed: http://localhost:5561" -ForegroundColor Cyan
Write-Host "    - Barn Records: http://localhost:5562" -ForegroundColor Cyan
Write-Host "    - Weighvision Readmodel: http://localhost:5563" -ForegroundColor Cyan
Write-Host "    - Analytics: http://localhost:5564" -ForegroundColor Cyan
Write-Host "    - Billing: http://localhost:5565" -ForegroundColor Cyan
Write-Host "    - Fleet Management: http://localhost:5566" -ForegroundColor Cyan
Write-Host ""

docker compose -f $PrismaComposePath up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to start Prisma Studio services" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. Required images not built. Try:" -ForegroundColor Gray
    Write-Host "     .\scripts\start-prisma-studio.ps1 -BuildImages" -ForegroundColor White
    Write-Host "  2. Main services not running. Start them with:" -ForegroundColor Gray
    Write-Host "     docker compose -f docker-compose.dev.yml up -d" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Prisma Studio services started!" -ForegroundColor Green
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  docker compose -f $PrismaComposeFile logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "  docker compose -f $PrismaComposeFile down" -ForegroundColor Gray
