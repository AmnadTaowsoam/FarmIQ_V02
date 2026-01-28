# FarmIQ Cloud Services: Ensure schema (when missing) + seed
# Usage:
#   .\scripts\run-seeds.ps1
#   $env:SEED_COUNT=50; .\scripts\run-seeds.ps1

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "=== FarmIQ Cloud Services: Seed ===" -ForegroundColor Cyan
Write-Host ""

$CLOUD_LAYER_DIR = Get-CloudLayerDir

$SEED_COUNT = $env:SEED_COUNT
if (-not $SEED_COUNT) {
    $SEED_COUNT = "30"
}

Write-Host "SEED_COUNT: $SEED_COUNT" -ForegroundColor Yellow
Write-Host ""

# Ensure schema and seed for a Prisma service
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
    $seed1 = Invoke-ContainerCommand -Service $Service -Command $SeedCommand -ComposeFile $Script:DockerComposeDev
    if ($seed1.Success) { return $true }

    $outputText = if ($seed1.Output -is [string]) { $seed1.Output } else { ($seed1.Output | Out-String) }
    
    # Always show error output for debugging
    if ($outputText -and $outputText.Trim()) {
        Write-Host "[$ServiceName] Error output:" -ForegroundColor Yellow
        $errorLines = $outputText -split "`n|`r`n" | Where-Object { $_.Trim() }
        foreach ($line in $errorLines | Select-Object -First 20) {
            Write-Host "  $line" -ForegroundColor Gray
        }
    }
    
    # Check for missing schema/tables
    $missingTable = $outputText -match "P2021|P1001|does not exist in the current database|relation.*does not exist|Table.*does not exist"
    if ($missingTable) {
        Write-Host "[$ServiceName] Missing schema detected (error code P2021/P1001)" -ForegroundColor Yellow
    } else {
        # Show the actual error for debugging
        Write-Host "[$ServiceName] Seed failed with unknown error (not a missing table)" -ForegroundColor Red
        return $false
    }

    Write-Host "[$ServiceName] Missing tables detected; creating schema..." -ForegroundColor Yellow

    # Prefer migration.sql when available (most reliable in flaky networks).
    if ($MigrationsDir) {
        $migrationsPath = Join-Path $CLOUD_LAYER_DIR $MigrationsDir
        if (Test-Path $migrationsPath) {
            $applied = Invoke-PrismaMigrations -DbName $DbName -MigrationsDir $migrationsPath -ComposeFile $Script:DockerComposeDev
            if ($applied) {
                Write-Host "[$ServiceName] Migrations applied, retrying seed..." -ForegroundColor Gray
                $seed2 = Invoke-ContainerCommand -Service $Service -Command $SeedCommand -ComposeFile $Script:DockerComposeDev
                if ($seed2.Success) {
                    return $true
                } else {
                    Write-Host "[$ServiceName] Seed still failed after migrations" -ForegroundColor Red
                    return $false
                }
            } else {
                Write-Host "[$ServiceName] Failed to apply migrations, trying db push..." -ForegroundColor Yellow
            }
        }
    }

    # Fallback: prisma db push without generate.
    Write-Host "[$ServiceName] Applying schema with 'prisma db push'..." -ForegroundColor Gray
    $push = Invoke-ContainerCommand -Service $Service -Command "npx prisma db push --skip-generate --accept-data-loss" -ComposeFile $Script:DockerComposeDev
    if (-not $push.Success) {
        Write-Host "[$ServiceName] Failed to push schema to database" -ForegroundColor Red
        return $false
    }

    Write-Host "[$ServiceName] Schema applied, retrying seed..." -ForegroundColor Gray
    $seed3 = Invoke-ContainerCommand -Service $Service -Command $SeedCommand -ComposeFile $Script:DockerComposeDev
    return $seed3.Success
}

if (-not (Test-Docker)) {
    Write-Host "ERROR: Docker is not available" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "    1. Ensure Docker Desktop is running (check system tray)" -ForegroundColor Yellow
    Write-Host "    2. Try restarting Docker Desktop" -ForegroundColor Yellow
    Write-Host "    3. Restart your PowerShell terminal session" -ForegroundColor Yellow
    Write-Host "    4. Verify Docker is accessible: docker version" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  If you see 'permission denied' errors:" -ForegroundColor Yellow
    Write-Host "    - Restart Docker Desktop" -ForegroundColor Gray
    Write-Host "    - Close and reopen your terminal" -ForegroundColor Gray
    Write-Host "    - Run PowerShell as Administrator if needed" -ForegroundColor Gray
    exit 1
}

Write-Host "Checking if services are running..." -ForegroundColor Yellow
if (-not (Test-DockerComposeServices -ComposeFile $Script:DockerComposeDev)) {
    Write-Host "ERROR: No services are running. Start them with:" -ForegroundColor Red
    Write-Host "  docker compose -f $Script:DockerComposeDev up -d" -ForegroundColor Gray
    exit 1
}

Write-Host ""

$results = @()

# Process Prisma services
$prismaServices = Get-PrismaServices
foreach ($svc in $prismaServices) {
    $seedCmd = if ($svc.Name -eq "cloud-standards-service") { "npm run db:seed" } else { "" }
    $ok = EnsureSchemaAndSeed-PrismaService -Service $svc.Service -ServiceName $svc.Name -DbName $svc.DbName -MigrationsDir $svc.MigrationsDir -SeedCommand $seedCmd
    $results += @{ Service=$svc.Name; Success=$ok }
    Write-Host ""
}

# Process Python services
$pythonServices = Get-PythonServices
foreach ($svc in $pythonServices) {
    Write-Host "--- $($svc.Name) (Python) ---" -ForegroundColor Cyan
    $analyticsOk = (Invoke-ContainerCommand -Service $svc.Service -Command "SEED_COUNT=$SEED_COUNT python -m app.seed" -ComposeFile $Script:DockerComposeDev).Success
    $results += @{ Service=$svc.Name; Success=$analyticsOk }
    Write-Host ""
}

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
