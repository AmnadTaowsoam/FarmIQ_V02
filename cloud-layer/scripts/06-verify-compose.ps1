# Verify Docker Compose configuration.
# Checks that BFF has all required service URL environment variables.

param(
    [string]$ComposeFile = "docker-compose.dev.yml"
)

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "Verifying Docker Compose configuration: $ComposeFile" -ForegroundColor Cyan

# Resolve docker executable path for reliable invocation in PowerShell.
$dockerPath = $null
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    $dockerPath = $dockerCmd.Source
}
if (-not $dockerPath) {
    $whereResult = where.exe docker 2>&1
    if ($whereResult -and $whereResult -notmatch "INFO:|not found|could not be found") {
        $dockerPath = ($whereResult | Select-Object -First 1).ToString().Trim()
    }
}
if (-not $dockerPath) {
    $dockerPath = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
}
if ($dockerPath -and -not $dockerPath.EndsWith(".exe")) {
    if (Test-Path ($dockerPath + ".exe")) {
        $dockerPath = $dockerPath + ".exe"
    }
}

# Resolve compose file path
$composePath = Get-DockerComposePath -ComposeFile $ComposeFile
if (-not (Test-Path $composePath)) {
    Write-Host "ERROR: Compose file not found: $composePath" -ForegroundColor Red
    exit 1
}

# Run docker compose config
Write-Host ""
Write-Host "Running: docker compose -f $ComposeFile config" -ForegroundColor Yellow
$configOutput = & $dockerPath compose -f $composePath config 2>&1
$exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }

if ($exitCode -ne 0 -or [string]::IsNullOrWhiteSpace(($configOutput | Out-String))) {
    Write-Host ("WARN: docker compose config unavailable in this PowerShell session (docker: {0}, exit: {1})." -f $dockerPath, $exitCode) -ForegroundColor Yellow
    Write-Host "Falling back to raw compose file content for env-var verification." -ForegroundColor Yellow
    $configOutput = Get-Content -Raw $composePath
}

# Check required BFF env vars
$requiredVars = Get-RequiredBFFEnvVars
$missing = @()
$found = @()

Write-Host ""
Write-Host "Checking BFF environment variables..." -ForegroundColor Cyan

foreach ($requiredVar in $requiredVars) {
    $patternResolved = "{0}\s*:\s*(.+)" -f [regex]::Escape($requiredVar)
    $patternRaw = "-\s*{0}=(.+)" -f [regex]::Escape($requiredVar)
    if ($configOutput -match $patternResolved -or $configOutput -match $patternRaw) {
        $value = $matches[1].Trim()
        Write-Host ("  [OK] {0} = {1}" -f $requiredVar, $value) -ForegroundColor Green
        $found += $requiredVar
    } else {
        Write-Host ("  [MISSING] {0}" -f $requiredVar) -ForegroundColor Red
        $missing += $requiredVar
    }
}

# Check optional var
$optionalVar = "WEIGHVISION_READMODEL_BASE_URL"
$optionalResolved = "{0}\s*:\s*(.+)" -f [regex]::Escape($optionalVar)
$optionalRaw = "-\s*{0}=(.+)" -f [regex]::Escape($optionalVar)
if ($configOutput -match $optionalResolved -or $configOutput -match $optionalRaw) {
    $value = $matches[1].Trim()
    Write-Host ("  [OPTIONAL] {0} = {1}" -f $optionalVar, $value) -ForegroundColor Yellow
} else {
    Write-Host ("  [OPTIONAL MISSING] {0}" -f $optionalVar) -ForegroundColor Yellow
}

# Write resolved compose config as evidence
$outputFile = Write-ComposeEvidence -ConfigOutput $configOutput -ComposeFile $ComposeFile
Write-Host ""
Write-Host "Writing resolved config to: $outputFile" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host ("  Required vars found: {0}/{1}" -f $found.Count, $requiredVars.Count) -ForegroundColor $(if ($missing.Count -eq 0) { "Green" } else { "Yellow" })

if ($missing.Count -gt 0) {
    Write-Host ("  Missing vars: {0}" -f ($missing -join ", ")) -ForegroundColor Red
    exit 1
}

Write-Host "  All required environment variables present." -ForegroundColor Green
exit 0
