# PowerShell script to fix RabbitMQ queue configuration issues.
# Deletes a problematic queue and restarts related services.

param(
    [string]$ComposeFile = "docker-compose.dev.yml",
    [string]$QueueName = "farmiq.cloud-telemetry-service.ingest.queue",
    [string]$RabbitMQContainer = $null,
    [string]$RabbitMQUser = $null,
    [string]$RabbitMQPass = $null,
    [string]$VHost = "/"
)

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

# Use defaults from shared config if values are not provided.
if (-not $RabbitMQContainer) { $RabbitMQContainer = $Script:RabbitMQContainer }
if (-not $RabbitMQUser) { $RabbitMQUser = $Script:RabbitMQUser }
if (-not $RabbitMQPass) { $RabbitMQPass = $Script:RabbitMQPass }

$composePath = Get-DockerComposePath -ComposeFile $ComposeFile

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
function Wait-RabbitMqReadyLocal {
    param(
        [int]$MaxRetries = 30,
        [int]$RetryInterval = 2
    )

    for ($i = 1; $i -le $MaxRetries; $i++) {
        Invoke-Docker exec $RabbitMQContainer rabbitmqctl status | Out-Null
        if ((Get-ExitCode) -eq 0) {
            Write-Host "RabbitMQ is ready." -ForegroundColor Green
            return $true
        }
        Write-Host "  Waiting... ($i/$MaxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds $RetryInterval
    }
    return $false
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RabbitMQ Queue Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Basic Docker accessibility check.
Invoke-Docker ps --format "{{.ID}}" | Out-Null
if ((Get-ExitCode) -ne 0) {
    Write-Host "ERROR: Docker is not accessible. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Ensure RabbitMQ service/container is running.
Write-Host "Checking RabbitMQ container..." -ForegroundColor Yellow
$rabbitmqRunning = Invoke-Docker ps --filter "name=$RabbitMQContainer" --format "{{.Names}}"
if (-not $rabbitmqRunning) {
    Write-Host "RabbitMQ container not running. Starting rabbitmq service..." -ForegroundColor Yellow
    Invoke-Docker compose -f $composePath up -d rabbitmq | Out-Null
    if ((Get-ExitCode) -ne 0) {
        Write-Host "ERROR: Failed to start rabbitmq service." -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 5
}
Write-Host "RabbitMQ container is running." -ForegroundColor Green

# Wait for RabbitMQ health.
Write-Host ""
Write-Host "Waiting for RabbitMQ readiness..." -ForegroundColor Yellow
if (-not (Wait-RabbitMqReadyLocal -MaxRetries 30 -RetryInterval 2)) {
    Write-Host "ERROR: RabbitMQ did not become ready in time." -ForegroundColor Red
    exit 1
}

# Delete problematic queue.
Write-Host ""
Write-Host "Deleting queue: $QueueName" -ForegroundColor Yellow
$deleteOutput = Invoke-Docker exec $RabbitMQContainer rabbitmqctl delete_queue -p $VHost $QueueName 2>&1
if ((Get-ExitCode) -eq 0) {
    Write-Host "Queue deleted successfully." -ForegroundColor Green
} elseif (($deleteOutput | Out-String) -match "no_such_queue") {
    Write-Host "Queue does not exist. Continuing." -ForegroundColor Yellow
} else {
    Write-Host "Warning while deleting queue:" -ForegroundColor Yellow
    Write-Host ($deleteOutput | Out-String) -ForegroundColor Gray
}

# Restart services that declare/consume queue.
Write-Host ""
Write-Host "Restarting related services..." -ForegroundColor Yellow
foreach ($service in @("cloud-telemetry-service", "cloud-ingestion")) {
    Write-Host "  - Restarting $service" -ForegroundColor Gray
    Invoke-Docker compose -f $composePath restart $service | Out-Null
    if ((Get-ExitCode) -ne 0) {
        Write-Host "Warning: Failed to restart $service" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify queue status.
Write-Host ""
Write-Host "Verifying queue presence..." -ForegroundColor Yellow
$queueInfo = Invoke-Docker exec $RabbitMQContainer rabbitmqctl list_queues -p $VHost name arguments 2>&1 | Select-String $QueueName
if ($queueInfo) {
    Write-Host "Queue exists." -ForegroundColor Green
    Write-Host ($queueInfo | Out-String) -ForegroundColor Gray
} else {
    Write-Host "Queue not listed yet. It may be created after consumers reconnect." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done. Optional follow-up logs:" -ForegroundColor Cyan
Write-Host "  docker compose -f $ComposeFile logs -f cloud-telemetry-service" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
