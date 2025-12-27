# FarmIQ Cloud Layer: Build/Up + Migrate/Seed helper
# Usage:
#   .\scripts\dev-up-and-seed.ps1
#   SEED_COUNT=50 .\scripts\dev-up-and-seed.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== FarmIQ Cloud Layer: Build/Up + Seed ===" -ForegroundColor Cyan
Write-Host ""

$CLOUD_COMPOSE = "docker-compose.dev.yml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: docker command not found" -ForegroundColor Red
    exit 1
}

Write-Host "Building and starting cloud-layer services..." -ForegroundColor Green
docker compose -f $CLOUD_COMPOSE up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: docker compose up/build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running migrations + seeds..." -ForegroundColor Green
& "$PSScriptRoot\\run-seeds.ps1"
exit $LASTEXITCODE
