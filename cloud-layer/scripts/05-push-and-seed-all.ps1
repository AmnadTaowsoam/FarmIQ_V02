# PowerShell script to push schemas and seed data for all services
# Run from cloud-layer directory: .\scripts\push-and-seed-all.ps1

param(
    [switch]$SkipSeed = $false,
    [switch]$SkipPush = $false
)

$ErrorActionPreference = "Continue"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Push Schemas and Seed Data for All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$DockerComposeFile = $Script:DockerComposeDev
$composePath = Get-DockerComposePath -ComposeFile $DockerComposeFile

# Get services sorted by priority (tenant-registry first)
$sortedServices = Get-PrismaServices -SortedByPriority

# Step 1: Push Schemas
if (-not $SkipPush) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Step 1: Pushing Schemas" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""

    $successCount = 0
    $failCount = 0

    foreach ($service in $sortedServices) {
        $serviceName = $service.Service
        Write-Host "Pushing schema for $serviceName..." -ForegroundColor Yellow

        $result = docker compose -f $composePath exec -T $serviceName npx prisma db push --accept-data-loss --skip-generate 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Success: Schema pushed successfully" -ForegroundColor Green
            $successCount++

            # Generate Prisma Client after pushing schema
            Write-Host "  Generating Prisma Client..." -ForegroundColor Gray
            docker compose -f $composePath exec -T $serviceName npx prisma generate 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Success: Prisma Client generated" -ForegroundColor Green
            }
        } else {
            Write-Host "  Failed: Failed to push schema" -ForegroundColor Red
            if ($result) {
                Write-Host "    Error: $result" -ForegroundColor Red
            }
            $failCount++
        }
        Write-Host ""
    }

    Write-Host "Schema Push Summary: $successCount succeeded, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""
}

# Step 2: Seed Data
if (-not $SkipSeed) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Step 2: Seeding Data" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""

    $seedSuccessCount = 0
    $seedFailCount = 0
    $skipCount = 0

    foreach ($service in $sortedServices) {
        $serviceName = $service.Service
        $hasSeed = $service.HasSeed

        if (-not $hasSeed) {
            Write-Host "Skipping seed for $serviceName (no seed script)" -ForegroundColor Gray
            $skipCount++
            Write-Host ""
            continue
        }

        Write-Host "Seeding data for $serviceName..." -ForegroundColor Yellow

        # Try different seed commands
        $seedCommands = @(
            "npm run db:seed",
            "npx prisma db seed",
            "ts-node prisma/seed.ts"
        )

        $seeded = $false
        foreach ($cmd in $seedCommands) {
            $result = docker compose -f $composePath exec -T $serviceName $cmd 2>&1

            if ($LASTEXITCODE -eq 0 -or $result -match "Seed completed|seed command|Upserted|Created") {
                Write-Host "  Success: Data seeded successfully (using: $cmd)" -ForegroundColor Green
                $seedSuccessCount++
                $seeded = $true
                break
            }
        }

        if (-not $seeded) {
            Write-Host "  Failed: Failed to seed data" -ForegroundColor Red
            $seedFailCount++
        }
        Write-Host ""
    }

    Write-Host "Seed Summary: $seedSuccessCount succeeded, $seedFailCount failed, $skipCount skipped" -ForegroundColor $(if ($seedFailCount -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All operations completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
