# FarmIQ Cloud Services: Ensure schema (when missing) + seed
# Usage:
#   .\scripts\run-seeds.ps1
#   $env:SEED_COUNT=50; .\scripts\run-seeds.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== FarmIQ Cloud Services: Seed ===" -ForegroundColor Cyan
Write-Host ""

$CLOUD_COMPOSE = "docker-compose.dev.yml"
$CLOUD_LAYER_DIR = (Split-Path -Parent $PSScriptRoot)

$SEED_COUNT = $env:SEED_COUNT
if (-not $SEED_COUNT) {
    $SEED_COUNT = "30"
}

Write-Host "SEED_COUNT: $SEED_COUNT" -ForegroundColor Yellow
Write-Host ""

function Run-InContainer {
    param(
        [string]$Service,
        [string]$Command
    )

    Write-Host "[$Service] Running: $Command" -ForegroundColor Gray
    $output = docker compose -f $CLOUD_COMPOSE exec -T $Service sh -c "$Command" 2>&1
    $code = $LASTEXITCODE

    if ($code -ne 0) {
        Write-Host $output
        Write-Host "[$Service] FAILED with exit code $code" -ForegroundColor Red
        return @{ Success = $false; Output = $output }
    }

    Write-Host "[$Service] OK" -ForegroundColor Green
    return @{ Success = $true; Output = $output }
}

# Apply prisma/migrations/*/migration.sql using psql (no Prisma engine download).
function Apply-MigrationsViaPsql {
    param(
        [string]$DbName,
        [string]$MigrationsDir
    )

    $postgresContainer = docker compose -f $CLOUD_COMPOSE ps -q postgres
    if (-not $postgresContainer) {
        Write-Host "[postgres] ERROR: postgres container not found" -ForegroundColor Red
        return $false
    }

    if (-not (Test-Path $MigrationsDir)) {
        Write-Host "[migrations] WARN: $MigrationsDir not found" -ForegroundColor Yellow
        return $false
    }

    $migrationFolders = Get-ChildItem -Path $MigrationsDir -Directory | Sort-Object Name
    if (-not $migrationFolders) {
        Write-Host "[migrations] WARN: no migrations found in $MigrationsDir" -ForegroundColor Yellow
        return $false
    }

    foreach ($folder in $migrationFolders) {
        $sqlPath = Join-Path $folder.FullName "migration.sql"
        if (-not (Test-Path $sqlPath)) {
            Write-Host "[migrations] WARN: missing $sqlPath" -ForegroundColor Yellow
            continue
        }

        Write-Host "[postgres] Applying $($folder.Name) to $DbName" -ForegroundColor Gray
        $sql = Get-Content -Raw $sqlPath
        $null = $sql | docker exec -i $postgresContainer psql -U farmiq -d $DbName -v ON_ERROR_STOP=1 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[postgres] FAILED applying $($folder.Name) to $DbName" -ForegroundColor Red
            return $false
        }
    }

    return $true
}

function EnsureSchemaAndSeed-PrismaService {
    param(
        [string]$Service,
        [string]$ServiceName,
        [string]$DbName,
        [string]$MigrationsDir = "",
        [string]$SeedCommand = ""
    )

    Write-Host "--- $ServiceName ---" -ForegroundColor Cyan

    if (-not $SeedCommand) {
        $SeedCommand = "SEED_COUNT=$SEED_COUNT npm run seed"
    } else {
        $SeedCommand = $SeedCommand.Replace('$SEED_COUNT', $SEED_COUNT)
    }

    # Fast path: try seed first (no schema changes, no Prisma engine downloads).
    $seed1 = Run-InContainer -Service $Service -Command $SeedCommand
    if ($seed1.Success) { return $true }

    $outputText = ($seed1.Output | Out-String)
    $missingTable = $outputText -match "P2021" -or $outputText -match "does not exist in the current database"
    if (-not $missingTable) { return $false }

    Write-Host "[$ServiceName] Missing tables detected; creating schema..." -ForegroundColor Yellow

    # Prefer migration.sql when available (most reliable in flaky networks).
    if ($MigrationsDir) {
        $migrationsPath = Join-Path $CLOUD_LAYER_DIR $MigrationsDir
        if (Test-Path $migrationsPath) {
            $applied = Apply-MigrationsViaPsql -DbName $DbName -MigrationsDir $migrationsPath
            if ($applied) {
                $seed2 = Run-InContainer -Service $Service -Command $SeedCommand
                return $seed2.Success
            }
        }
    }

    # Fallback: prisma db push without generate.
    $push = Run-InContainer -Service $Service -Command "npx prisma db push --skip-generate --accept-data-loss"
    if (-not $push.Success) { return $false }

    $seed3 = Run-InContainer -Service $Service -Command $SeedCommand
    return $seed3.Success
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: docker command not found" -ForegroundColor Red
    exit 1
}

Write-Host "Checking if services are running..." -ForegroundColor Yellow
$running = docker compose -f $CLOUD_COMPOSE ps --services --filter "status=running" | Measure-Object -Line
if ($running.Lines -eq 0) {
    Write-Host "ERROR: No services are running. Start them with:" -ForegroundColor Red
    Write-Host "  docker compose -f $CLOUD_COMPOSE up -d" -ForegroundColor Gray
    exit 1
}

Write-Host ""

$results = @()

$prismaServices = @(
    @{ Service="cloud-identity-access"; Name="cloud-identity-access"; DbName="cloud_identity_access"; MigrationsDir="cloud-identity-access/prisma/migrations" },
    @{ Service="cloud-tenant-registry"; Name="cloud-tenant-registry"; DbName="cloud_tenant_registry" },
    @{ Service="cloud-standards-service"; Name="cloud-standards-service"; DbName="cloud_standards_service"; SeedCommand="npm run db:seed" },
    @{ Service="cloud-ingestion"; Name="cloud-ingestion"; DbName="cloud_ingestion" },
    @{ Service="cloud-telemetry-service"; Name="cloud-telemetry-service"; DbName="cloud_telemetry" },
    @{ Service="cloud-api-gateway-bff"; Name="cloud-api-gateway-bff"; DbName="cloud_api_gateway_bff" },
    @{ Service="cloud-config-rules-service"; Name="cloud-config-rules-service"; DbName="cloud_config_rules" },
    @{ Service="cloud-audit-log-service"; Name="cloud-audit-log-service"; DbName="cloud_audit_log" },
    @{ Service="cloud-notification-service"; Name="cloud-notification-service"; DbName="cloud_notification" },
    @{ Service="cloud-feed-service"; Name="cloud-feed-service"; DbName="cloud_feed" },
    @{ Service="cloud-barn-records-service"; Name="cloud-barn-records-service"; DbName="cloud_barn_records" },
    @{ Service="cloud-weighvision-readmodel"; Name="cloud-weighvision-readmodel"; DbName="cloud_weighvision_readmodel" },
    @{ Service="cloud-reporting-export-service"; Name="cloud-reporting-export-service"; DbName="cloud_reporting_export"; MigrationsDir="cloud-reporting-export-service/prisma/migrations" }
)

foreach ($svc in $prismaServices) {
    $ok = EnsureSchemaAndSeed-PrismaService -Service $svc.Service -ServiceName $svc.Name -DbName $svc.DbName -MigrationsDir $svc.MigrationsDir -SeedCommand $svc.SeedCommand
    $results += @{ Service=$svc.Name; Success=$ok }
    Write-Host ""
}

Write-Host "--- cloud-analytics-service (Python) ---" -ForegroundColor Cyan
$analyticsOk = (Run-InContainer -Service "cloud-analytics-service" -Command "SEED_COUNT=$SEED_COUNT python -m app.seed").Success
$results += @{ Service="cloud-analytics-service"; Success=$analyticsOk }

Write-Host ""
Write-Host "--- cloud-llm-insights-service (Python) ---" -ForegroundColor Cyan
$llmInsightsOk = (Run-InContainer -Service "cloud-llm-insights-service" -Command "SEED_COUNT=$SEED_COUNT python -m app.seed").Success
$results += @{ Service="cloud-llm-insights-service"; Success=$llmInsightsOk }

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Magenta

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$totalCount = $results.Count

Write-Host "Success: $successCount / $totalCount" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

foreach ($result in $results) {
    $color = if ($result.Success) { "Green" } else { "Red" }
    $status = if ($result.Success) { "[OK]" } else { "[FAIL]" }
    Write-Host "  $status $($result.Service)" -ForegroundColor $color
}

if ($successCount -eq $totalCount) {
    Write-Host ""
    Write-Host "All seeds completed successfully!" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Some seeds failed. Check the output above." -ForegroundColor Yellow
exit 1
