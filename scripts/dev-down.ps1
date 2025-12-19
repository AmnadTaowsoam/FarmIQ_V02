# FarmIQ Development Environment Shutdown Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "FarmIQ Development Environment Shutdown" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping all services..." -ForegroundColor Yellow
docker compose --profile ui down
docker compose --profile cloud down
docker compose --profile edge down
docker compose --profile infra down

Write-Host ""
Write-Host "All services stopped." -ForegroundColor Green
Write-Host ""
Write-Host "To remove volumes (data will be lost):" -ForegroundColor Yellow
Write-Host "  docker compose down -v" -ForegroundColor White

