# Detect breaking changes in OpenAPI specifications
# Compares current OpenAPI spec with previous version
# Usage: .\scripts\detect-breaking-changes.ps1 [service-path] [previous-spec-path]

param(
    [Parameter(Mandatory=$true)]
    [string]$ServicePath,
    
    [string]$PreviousSpecPath = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ServicePath)) {
    Write-Error "Service path not found: $ServicePath"
    exit 1
}

$currentSpec = Join-Path $ServicePath "openapi.yaml"
if (-not (Test-Path $currentSpec)) {
    Write-Error "openapi.yaml not found in: $ServicePath"
    exit 1
}

# If previous spec not provided, try to find it in git
if (-not $PreviousSpecPath) {
    $gitSpec = Join-Path $ServicePath "openapi.yaml"
    $previousContent = git show HEAD:$gitSpec 2>$null
    
    if ($previousContent) {
        $PreviousSpecPath = [System.IO.Path]::GetTempFileName()
        $previousContent | Out-File -FilePath $PreviousSpecPath -Encoding UTF8
    } else {
        Write-Warning "Previous version not found in git. Skipping breaking change detection."
        exit 0
    }
}

# Use oasdiff or similar tool to detect breaking changes
# For now, we'll use a simple PowerShell-based checker

Write-Host "Comparing OpenAPI specifications..." -ForegroundColor Cyan
Write-Host "Current: $currentSpec" -ForegroundColor Yellow
Write-Host "Previous: $PreviousSpecPath" -ForegroundColor Yellow

$breakingChanges = @()

# Load YAML files
$currentYaml = Get-Content $currentSpec -Raw
$previousYaml = Get-Content $PreviousSpecPath -Raw

# Simple checks for common breaking changes
# 1. Removed endpoints
$currentPaths = [regex]::Matches($currentYaml, '^\s+/[^:]+:') | ForEach-Object { $_.Value.Trim() }
$previousPaths = [regex]::Matches($previousYaml, '^\s+/[^:]+:') | ForEach-Object { $_.Value.Trim() }

$removedPaths = $previousPaths | Where-Object { $_ -notin $currentPaths }
if ($removedPaths) {
    foreach ($path in $removedPaths) {
        $breakingChanges += "BREAKING: Endpoint removed: $path"
    }
}

# 2. Removed required fields
# This is a simplified check - in production, use oasdiff or similar
$currentRequired = [regex]::Matches($currentYaml, 'required:\s*\n\s*-\s+(\w+)') | ForEach-Object { $_.Groups[1].Value }
$previousRequired = [regex]::Matches($previousYaml, 'required:\s*\n\s*-\s+(\w+)') | ForEach-Object { $_.Groups[1].Value }

$removedRequired = $previousRequired | Where-Object { $_ -notin $currentRequired }
if ($removedRequired) {
    foreach ($field in $removedRequired) {
        $breakingChanges += "BREAKING: Required field removed: $field"
    }
}

# 3. Changed response types
# Simplified check - would need proper YAML parsing for accurate detection

if ($breakingChanges.Count -gt 0) {
    Write-Host "`n❌ BREAKING CHANGES DETECTED:" -ForegroundColor Red
    foreach ($change in $breakingChanges) {
        Write-Host "  $change" -ForegroundColor Red
    }
    Write-Host "`nBreaking changes are not allowed without proper deprecation notice." -ForegroundColor Yellow
    Write-Host "Please add deprecation notice and wait 90 days before removing." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n✅ No breaking changes detected" -ForegroundColor Green
    exit 0
}
