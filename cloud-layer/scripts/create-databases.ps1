# PowerShell script to create separate databases for each service
# Run this after starting PostgreSQL container
# Usage: Run from cloud-layer directory: .\scripts\create-databases.ps1

param(
    [string]$POSTGRES_USER = "farmiq",
    [string]$POSTGRES_PASSWORD = "farmiq_dev"
)

# Get script directory and determine docker-compose path
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CloudLayerDir = Split-Path -Parent $ScriptDir
$DockerComposeFile = Join-Path $CloudLayerDir "docker-compose.dev.yml"

# List of databases to create
$DATABASES = @(
    "cloud_identity_access",
    "cloud_tenant_registry",
    "cloud_ingestion",
    "cloud_telemetry",
    "cloud_api_gateway_bff",
    "cloud_config_rules",
    "cloud_audit_log",
    "cloud_notification",
    "cloud_reporting_export",
    "cloud_feed",
    "cloud_barn_records",
    "cloud_weighvision_readmodel",
    "cloud_analytics"
)

Write-Host "Creating databases for each service..." -ForegroundColor Cyan
Write-Host "Using Docker Compose file: $DockerComposeFile" -ForegroundColor Gray

$env:PGPASSWORD = $POSTGRES_PASSWORD

foreach ($DB in $DATABASES) {
    Write-Host "Processing database: $DB" -ForegroundColor Yellow
    
    # Use docker compose exec to check and create database
    $checkQuery = "SELECT 1 FROM pg_database WHERE datname = '$DB';"
    $checkResult = docker compose -f $DockerComposeFile exec -T postgres psql -U $POSTGRES_USER -d postgres -tc $checkQuery 2>&1
    
    if ($checkResult -match "^\s*1\s*$") {
        Write-Host "  ⊙ Database already exists: $DB" -ForegroundColor Gray
    } else {
        $createQuery = "CREATE DATABASE $DB;"
        $createResult = docker compose -f $DockerComposeFile exec -T postgres psql -U $POSTGRES_USER -d postgres -c $createQuery 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Created database: $DB" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to create database: $DB" -ForegroundColor Red
            if ($createResult) {
                Write-Host "    Error: $createResult" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "All databases processed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "List of databases:" -ForegroundColor Cyan
$listQuery = "SELECT datname FROM pg_database WHERE datname LIKE 'cloud_%' ORDER BY datname;"
docker compose -f $DockerComposeFile exec -T postgres psql -U $POSTGRES_USER -d postgres -c $listQuery
