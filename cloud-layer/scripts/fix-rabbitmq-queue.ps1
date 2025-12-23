# PowerShell script to fix RabbitMQ queue configuration issues
# This script deletes problematic queues and restarts related services

param(
    [string]$ComposeFile = "docker-compose.dev.yml",
    [string]$QueueName = "farmiq.cloud-telemetry-service.ingest.queue",
    [string]$RabbitMQContainer = "farmiq-cloud-rabbitmq",
    [string]$RabbitMQUser = "farmiq",
    [string]$RabbitMQPass = "farmiq_dev",
    [string]$VHost = "/"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RabbitMQ Queue Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Check if RabbitMQ container is running
Write-Host ""
Write-Host "Checking RabbitMQ container..." -ForegroundColor Yellow
$rabbitmqRunning = docker ps --filter "name=$RabbitMQContainer" --format "{{.Names}}"
if (-not $rabbitmqRunning) {
    Write-Host "✗ RabbitMQ container '$RabbitMQContainer' is not running." -ForegroundColor Red
    Write-Host "  Starting RabbitMQ..." -ForegroundColor Yellow
    docker compose -f $ComposeFile up -d rabbitmq
    Start-Sleep -Seconds 5
} else {
    Write-Host "✓ RabbitMQ container is running" -ForegroundColor Green
}

# Wait for RabbitMQ to be ready
Write-Host ""
Write-Host "Waiting for RabbitMQ to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
$ready = $false

while ($retryCount -lt $maxRetries -and -not $ready) {
    try {
        $result = docker exec $RabbitMQContainer rabbitmqctl status 2>&1
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            Write-Host "✓ RabbitMQ is ready" -ForegroundColor Green
        }
    } catch {
        # Continue waiting
    }
    
    if (-not $ready) {
        $retryCount++
        Write-Host "  Waiting... ($retryCount/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Host "✗ RabbitMQ did not become ready in time" -ForegroundColor Red
    exit 1
}

# Delete the problematic queue
Write-Host ""
Write-Host "Deleting queue: $QueueName" -ForegroundColor Yellow
try {
    $deleteResult = docker exec $RabbitMQContainer rabbitmqctl delete_queue -p $VHost $QueueName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Queue deleted successfully" -ForegroundColor Green
    } else {
        # Queue might not exist, which is okay
        if ($deleteResult -match "no_such_queue") {
            Write-Host "ℹ Queue does not exist (this is okay)" -ForegroundColor Yellow
        } else {
            Write-Host "⚠ Warning: $deleteResult" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠ Warning: Could not delete queue: $_" -ForegroundColor Yellow
}

# Restart services
Write-Host ""
Write-Host "Restarting services..." -ForegroundColor Yellow
Write-Host "  - cloud-telemetry-service" -ForegroundColor Gray
docker compose -f $ComposeFile restart cloud-telemetry-service

Write-Host "  - cloud-ingestion" -ForegroundColor Gray
docker compose -f $ComposeFile restart cloud-ingestion

Write-Host ""
Write-Host "✓ Services restarted" -ForegroundColor Green

# Wait a bit for services to start
Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify queue was recreated with correct configuration
Write-Host ""
Write-Host "Verifying queue configuration..." -ForegroundColor Yellow
try {
    $queueInfo = docker exec $RabbitMQContainer rabbitmqctl list_queues -p $VHost name arguments 2>&1 | Select-String $QueueName
    if ($queueInfo) {
        Write-Host "✓ Queue exists" -ForegroundColor Green
        Write-Host "  $queueInfo" -ForegroundColor Gray
    } else {
        Write-Host "ℹ Queue will be created when service starts consuming" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not verify queue: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done! Check service logs to verify:" -ForegroundColor Cyan
Write-Host "  docker compose -f $ComposeFile logs -f cloud-telemetry-service" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

