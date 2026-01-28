# PowerShell script to create separate databases for each service
# Run this after starting PostgreSQL container
# Usage: Run from cloud-layer directory: .\scripts\01-create-databases.ps1

param(
    [string]$ComposeFile = "docker-compose.dev.yml"
)

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "Creating databases for each service..." -ForegroundColor Cyan
Write-Host "Using Docker Compose file: $ComposeFile" -ForegroundColor Gray
Write-Host ""

$databases = Get-AllDatabases
$successCount = 0
$failCount = 0

foreach ($DB in $databases) {
    Write-Host "Processing database: $DB" -ForegroundColor Yellow

    if (Test-PostgresDatabase -DbName $DB -ComposeFile $ComposeFile) {
        Write-Host "  [EXISTS] Database already exists: $DB" -ForegroundColor Gray
        $successCount++
    } else {
        if (New-PostgresDatabase -DbName $DB -ComposeFile $ComposeFile) {
            Write-Host "  [OK] Created database: $DB" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  [FAILED] Failed to create database: $DB" -ForegroundColor Red
            $failCount++
        }
    }
}

Write-Host ""
Write-Host "All databases processed!" -ForegroundColor Cyan
Write-Host "Success: $successCount, Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

# List all cloud databases
$composePath = Get-DockerComposePath -ComposeFile $ComposeFile
Write-Host "List of databases:" -ForegroundColor Cyan
$listQuery = 'SELECT datname FROM pg_database WHERE datname LIKE ''cloud_%'' ORDER BY datname;'
docker compose -f $composePath exec -T postgres psql -U $Script:PostgresUser -d postgres -c $listQuery
