# Validate OpenAPI specifications using Spectral
# Usage: .\scripts\validate-openapi.ps1 [service-path]

param(
    [string]$ServicePath = ""
)

$ErrorActionPreference = "Stop"

# Check if Spectral is installed
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx is not installed. Please install Node.js first."
    exit 1
}

# Install Spectral if not available
Write-Host "Checking Spectral installation..." -ForegroundColor Cyan
npx --yes @stoplight/spectral-cli --version | Out-Null

$spectralConfig = ".spectral.yaml"
if (-not (Test-Path $spectralConfig)) {
    Write-Error "Spectral config file not found: $spectralConfig"
    exit 1
}

# Find OpenAPI files
$openApiFiles = @()

if ($ServicePath -and (Test-Path $ServicePath)) {
    # Validate specific service
    $openApiYaml = Join-Path $ServicePath "openapi.yaml"
    if (Test-Path $openApiYaml) {
        $openApiFiles += $openApiYaml
    }
} else {
    # Find all OpenAPI files in cloud-layer and edge-layer
    $openApiFiles = Get-ChildItem -Path "cloud-layer", "edge-layer" -Recurse -Filter "openapi.yaml" -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
}

if ($openApiFiles.Count -eq 0) {
    Write-Warning "No OpenAPI files found"
    exit 0
}

Write-Host "Found $($openApiFiles.Count) OpenAPI file(s) to validate" -ForegroundColor Cyan

$errors = 0
$warnings = 0

foreach ($file in $openApiFiles) {
    Write-Host "`nValidating: $file" -ForegroundColor Yellow
    
    $result = npx --yes @stoplight/spectral-cli lint "$file" --format json 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        $errors++
        Write-Host "  ❌ Validation failed" -ForegroundColor Red
        
        # Parse JSON output for better display
        try {
            $jsonResult = $result | ConvertFrom-Json
            foreach ($issue in $jsonResult) {
                $severity = $issue.severity
                $message = $issue.message
                $path = $issue.path -join "."
                
                if ($severity -eq "error") {
                    Write-Host "    ERROR: $message (at $path)" -ForegroundColor Red
                } elseif ($severity -eq "warn") {
                    Write-Host "    WARN: $message (at $path)" -ForegroundColor Yellow
                    $warnings++
                }
            }
        } catch {
            Write-Host $result
        }
    } else {
        Write-Host "  ✅ Validation passed" -ForegroundColor Green
    }
}

Write-Host "`n=== Validation Summary ===" -ForegroundColor Cyan
Write-Host "Errors: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings: $warnings" -ForegroundColor $(if ($warnings -gt 0) { "Yellow" } else { "Green" })

if ($errors -gt 0) {
    exit 1
}

exit 0
