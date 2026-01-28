# Verify Docker Compose Configuration
# Checks that BFF has all required service URL environment variables

param(
    [string]$ComposeFile = "docker-compose.dev.yml"
)

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "Verifying Docker Compose configuration: $ComposeFile" -ForegroundColor Cyan

# Resolve compose file path
$composePath = Get-DockerComposePath -ComposeFile $ComposeFile
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
$requiredVars = Get-RequiredBFFEnvVars

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
$outputFile = Write-ComposeEvidence -ConfigOutput $configOutput -ComposeFile $ComposeFile
Write-Host "`nWriting resolved config to: $outputFile" -ForegroundColor Cyan

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
