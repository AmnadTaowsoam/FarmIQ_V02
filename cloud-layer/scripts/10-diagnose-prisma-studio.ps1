# Prisma Studio diagnostics script.
# Checks Docker, network, PostgreSQL, Prisma Studio containers, and recent logs.

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

function Get-DockerExe {
    $cmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        if ($cmd.Source.EndsWith(".exe")) { return $cmd.Source }
        if (Test-Path ($cmd.Source + ".exe")) { return ($cmd.Source + ".exe") }
    }
    return "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
}

$dockerExe = Get-DockerExe
function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & $dockerExe @Args
}
function Get-ExitCode {
    if ($null -eq $LASTEXITCODE) { return 0 }
    return $LASTEXITCODE
}

Write-Host "=== Prisma Studio Container Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# 1) Docker check
Write-Host "1. Checking Docker status..." -ForegroundColor Yellow
Invoke-Docker ps --format "{{.ID}}" | Out-Null
if ((Get-ExitCode) -ne 0) {
    Write-Host "   ERROR: Docker is not accessible." -ForegroundColor Red
    Write-Host "   Start Docker Desktop and run again." -ForegroundColor Yellow
    exit 1
}
Write-Host "   OK: Docker is accessible." -ForegroundColor Green

# 2) farmiq-net check/create
Write-Host ""
Write-Host "2. Checking farmiq-net network..." -ForegroundColor Yellow
$network = Invoke-Docker network ls --filter name=^farmiq-net$ --format "{{.Name}}"
if ($network -eq "farmiq-net") {
    Write-Host "   OK: Network farmiq-net exists." -ForegroundColor Green
} else {
    Write-Host "   WARN: Network farmiq-net does not exist. Creating..." -ForegroundColor Yellow
    Invoke-Docker network create farmiq-net | Out-Null
    if ((Get-ExitCode) -eq 0) {
        Write-Host "   OK: Network created." -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Failed to create farmiq-net." -ForegroundColor Red
    }
}

# 3) PostgreSQL check
Write-Host ""
Write-Host "3. Checking PostgreSQL container..." -ForegroundColor Yellow
$postgresContainer = Invoke-Docker ps --filter "name=farmiq-cloud-postgres" --format "{{.Names}}" | Select-Object -First 1
if (-not $postgresContainer) {
    $postgresContainer = Invoke-Docker ps --filter "name=postgres" --format "{{.Names}}" | Select-Object -First 1
}

if ($postgresContainer) {
    Write-Host "   OK: PostgreSQL running: $postgresContainer" -ForegroundColor Green
    Write-Host "   Testing PostgreSQL connection..." -ForegroundColor Yellow
    Invoke-Docker exec $postgresContainer psql -U $Script:PostgresUser -d postgres -c "SELECT 1;" | Out-Null
    if ((Get-ExitCode) -eq 0) {
        Write-Host "   OK: PostgreSQL connection successful." -ForegroundColor Green
    } else {
        Write-Host "   ERROR: PostgreSQL connection failed." -ForegroundColor Red
    }
} else {
    Write-Host "   ERROR: PostgreSQL container is not running." -ForegroundColor Red
}

# 4) Prisma Studio containers and logs
Write-Host ""
Write-Host "4. Checking Prisma Studio containers/logs..." -ForegroundColor Yellow

$prismaContainers = Invoke-Docker @("ps", "-a", "--filter", "name=prisma-studio", "--format", "{{.Names}}")
if (-not $prismaContainers) {
    Write-Host "   WARN: No prisma-studio containers found." -ForegroundColor Yellow
} else {
    foreach ($container in $prismaContainers) {
        Write-Host ""
        Write-Host ("   Container: {0}" -f $container) -ForegroundColor Cyan
        $status = Invoke-Docker inspect --format "{{.State.Status}} ({{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}})" $container 2>$null
        if ((Get-ExitCode) -eq 0) {
            Write-Host ("   Status: {0}" -f $status) -ForegroundColor Gray
        }

        $logs = Invoke-Docker logs --tail 20 $container 2>&1
        if (($logs | Out-String) -match "P1001|ECONNREFUSED|Can't reach database|connect") {
            Write-Host "   ERROR: Database connectivity issue detected in logs." -ForegroundColor Red
        } elseif (($logs | Out-String) -match "Schema parsing|Invalid schema|Prisma schema") {
            Write-Host "   ERROR: Prisma schema issue detected in logs." -ForegroundColor Red
        } elseif (($logs | Out-String) -match "Error|ERROR|Exception") {
            Write-Host "   WARN: Error patterns found in recent logs." -ForegroundColor Yellow
        } else {
            Write-Host "   OK: No obvious error pattern in recent logs." -ForegroundColor Green
        }

        Write-Host "   Recent logs (tail 8):" -ForegroundColor Gray
        $logs | Select-Object -Last 8 | ForEach-Object { Write-Host ("     {0}" -f $_) -ForegroundColor Gray }
    }
}

# 5) Summary table
Write-Host ""
Write-Host "5. Prisma Studio container summary:" -ForegroundColor Yellow
Invoke-Docker @("ps", "-a", "--filter", "name=prisma-studio", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
Write-Host "Suggested next steps:" -ForegroundColor Yellow
Write-Host "1. If Prisma Studio containers are missing, run docker compose -f docker-compose.prisma.yml up -d" -ForegroundColor White
Write-Host "2. If DB connection errors appear, verify postgres container and DATABASE_URL values." -ForegroundColor White
Write-Host "3. If schema errors appear, validate each service prisma/schema.prisma." -ForegroundColor White
