# FarmIQ Development Environment Startup Script
# Starts all services using docker-compose profiles

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "FarmIQ Development Environment Startup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ".env file created. Please review and update if needed." -ForegroundColor Yellow
    }
}

# Start infrastructure services first
Write-Host "Starting infrastructure services (postgres, rabbitmq)..." -ForegroundColor Green
docker compose --profile infra up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start infrastructure services!" -ForegroundColor Red
    exit 1
}

# Wait for infrastructure to be healthy
Write-Host "Waiting for infrastructure services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start edge services
Write-Host "Starting edge services..." -ForegroundColor Green
docker compose --profile edge up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start edge services!" -ForegroundColor Red
    exit 1
}

# Start cloud services
Write-Host "Starting cloud services..." -ForegroundColor Green
docker compose --profile cloud up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start cloud services!" -ForegroundColor Red
    exit 1
}

# Start UI
Write-Host "Starting dashboard web..." -ForegroundColor Green
docker compose --profile ui up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start dashboard web!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Services Started Successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Edge Ingress Gateway: http://localhost:5103/api/health" -ForegroundColor White
Write-Host "  Cloud API Gateway BFF: http://localhost:5125/api/health" -ForegroundColor White
Write-Host "  Dashboard: http://localhost:5130" -ForegroundColor White
Write-Host ""
Write-Host "API Documentation:" -ForegroundColor Yellow
Write-Host "  Edge services: http://localhost:5103/api-docs (example)" -ForegroundColor White
Write-Host "  Cloud services: http://localhost:5125/api-docs (example)" -ForegroundColor White
Write-Host ""
Write-Host "Infrastructure:" -ForegroundColor Yellow
Write-Host "  RabbitMQ Management: http://localhost:5151" -ForegroundColor White
Write-Host "  PostgreSQL: localhost:5140" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  docker compose logs -f <service-name>" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "  .\scripts\dev-down.ps1" -ForegroundColor White

