# FarmIQ Cloud Layer: Build/Up + Migrate/Seed helper
# Usage:
#   .\scripts\dev-up-and-seed.ps1
#   SEED_COUNT=50 .\scripts\dev-up-and-seed.ps1

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "=== FarmIQ Cloud Layer: Build/Up + Seed ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Docker)) {
    Write-Host "ERROR: docker command not found" -ForegroundColor Red
    exit 1
}

Write-Host "Building and starting cloud-layer services..." -ForegroundColor Green
$composePath = Get-DockerComposePath -ComposeFile $Script:DockerComposeDev
docker compose -f $composePath up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: docker compose up/build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running migrations + seeds..." -ForegroundColor Green
& "$PSScriptRoot\04-run-seeds.ps1"
exit $LASTEXITCODE
