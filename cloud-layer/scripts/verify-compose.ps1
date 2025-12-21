# Verify Docker Compose Configuration
# Checks that BFF has all required service URL environment variables

param(
    [string]$ComposeFile = "docker-compose.dev.yml"
)

$ErrorActionPreference = "Stop"

Write-Host "Verifying Docker Compose configuration: $ComposeFile" -ForegroundColor Cyan

# Resolve compose file path
$composePath = Join-Path $PSScriptRoot ".." $ComposeFile
if (-not (Test-Path $composePath)) {
    Write-Host "ERROR: Compose file not found: $composePath" -ForegroundColor Red
    exit 1
}

# Run docker compose config
Write-Host "`nRunning: docker compose -f $ComposeFile config" -ForegroundColor Yellow
$configOutput = docker compose -f $composePath config 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: docker compose config failed" -ForegroundColor Red
    Write-Host $configOutput
    exit 1
}

# Check for required BFF env vars
$requiredVars = @(
    "REGISTRY_BASE_URL",
    "FEED_SERVICE_URL",
    "BARN_RECORDS_SERVICE_URL",
    "TELEMETRY_BASE_URL",
    "ANALYTICS_BASE_URL",
    "REPORTING_EXPORT_BASE_URL"
)

Write-Host "`nChecking BFF environment variables..." -ForegroundColor Cyan
$missing = @()
$found = @()

foreach ($var in $requiredVars) {
    if ($configOutput -match "$var\s*:\s*(.+)") {
        $value = $matches[1].Trim()
        Write-Host "  ✓ $var = $value" -ForegroundColor Green
        $found += $var
    } else {
        Write-Host "  ✗ $var - MISSING" -ForegroundColor Red
        $missing += $var
    }
}

# Check for optional WEIGHVISION_READMODEL_BASE_URL
if ($configOutput -match "WEIGHVISION_READMODEL_BASE_URL\s*:\s*(.+)") {
    $value = $matches[1].Trim()
    Write-Host "  ⚠ WEIGHVISION_READMODEL_BASE_URL = $value (service not in compose)" -ForegroundColor Yellow
} else {
    Write-Host "  ⚠ WEIGHVISION_READMODEL_BASE_URL - MISSING (expected if service exists)" -ForegroundColor Yellow
}

# Output resolved config to evidence directory
$evidenceDir = Join-Path $PSScriptRoot ".." "evidence"
if (-not (Test-Path $evidenceDir)) {
    New-Item -ItemType Directory -Path $evidenceDir | Out-Null
}

$outputFile = Join-Path $evidenceDir "compose.$($ComposeFile -replace '\.yml$', '').resolved.yml"
Write-Host "`nWriting resolved config to: $outputFile" -ForegroundColor Cyan
$configOutput | Out-File -FilePath $outputFile -Encoding utf8

# Summary
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  Required vars found: $($found.Count)/$($requiredVars.Count)" -ForegroundColor $(if ($missing.Count -eq 0) { "Green" } else { "Yellow" })
if ($missing.Count -gt 0) {
    Write-Host "  Missing vars: $($missing -join ', ')" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  All required environment variables present ✓" -ForegroundColor Green
    exit 0
}

