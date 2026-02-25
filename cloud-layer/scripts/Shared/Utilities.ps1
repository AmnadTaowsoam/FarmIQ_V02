# FarmIQ Cloud Layer - Shared Utilities Module
# This module contains common utility functions used across scripts

# Import configuration
$ConfigPath = Join-Path $PSScriptRoot "Config.ps1"
. $ConfigPath

<#
.SYNOPSIS
    Checks if Docker is installed and running
.DESCRIPTION
    Verifies that Docker command is available and Docker daemon is responsive
.OUTPUTS
    Boolean indicating if Docker is available
#>
function Test-Docker {
    try {
        # Check if docker command exists using multiple methods
        $dockerPath = $null
        
        # Method 1: Try Get-Command
        $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
        if ($dockerCmd) {
            $dockerPath = $dockerCmd.Source
        }
        
        # Method 2: Try where.exe (works better in conda/other environments)
        if (-not $dockerPath) {
            $whereResult = where.exe docker 2>&1
            if ($whereResult -and $whereResult -notmatch "INFO:|not found|could not be found") {
                $dockerPath = ($whereResult | Select-Object -First 1).ToString().Trim()
                if (Test-Path $dockerPath) {
                    # Add to PATH for this session if not already there
                    $dockerDir = Split-Path $dockerPath -Parent
                    if ($env:PATH -notlike "*$dockerDir*") {
                        $env:PATH = "$dockerDir;$env:PATH"
                    }
                }
            }
        }
        
        # Method 3: Try common Docker Desktop installation paths
        if (-not $dockerPath) {
            $commonPaths = @(
                "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
                "${env:ProgramFiles}\Docker\Docker\resources\bin\docker.exe",
                "${env:ProgramFiles(x86)}\Docker\Docker\resources\bin\docker.exe"
            )
            foreach ($path in $commonPaths) {
                if (Test-Path $path) {
                    $dockerPath = $path
                    # Add to PATH for this session
                    $dockerDir = Split-Path $path -Parent
                    if ($env:PATH -notlike "*$dockerDir*") {
                        $env:PATH = "$dockerDir;$env:PATH"
                    }
                    break
                }
            }
        }
        
        if (-not $dockerPath -or -not (Test-Path $dockerPath)) {
            return $false
        }
        
        # Try to verify docker daemon is accessible
        # Use a simple command that doesn't require full daemon access
        $output = & $dockerPath ps --format "{{.ID}}" 2>&1
        $exitCode = $LASTEXITCODE

        # Final fallback: try docker.exe from default install location directly
        if ($exitCode -ne 0) {
            $dockerExe = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
            if (Test-Path $dockerExe) {
                $dockerPath = $dockerExe
                $output = & $dockerPath ps --format "{{.ID}}" 2>&1
                $exitCode = $LASTEXITCODE
            }
        }
        
        # If we get permission denied, docker exists but daemon isn't accessible
        if ($output -match "permission denied|Cannot connect to the Docker daemon|dockerDesktopLinuxEngine") {
            return $false
        }
        
        return $exitCode -eq 0
    } catch {
        return $false
    }
}

<#
.SYNOPSIS
    Checks if Docker Compose services are running
.DESCRIPTION
    Verifies that at least one service is running in specified compose file
.PARAMETER ComposeFile
    Path to Docker Compose file
.OUTPUTS
    Boolean indicating if services are running
#>
function Test-DockerComposeServices {
    param([string]$ComposeFile = $Script:DockerComposeDev)

    $composePath = Get-DockerComposePath -ComposeFile $ComposeFile
    $running = docker compose -f $composePath ps --services --filter "status=running" | Measure-Object -Line
    return $running.Lines -gt 0
}

<#
.SYNOPSIS
    Runs a command inside a Docker container
.DESCRIPTION
    Executes a command inside a Docker Compose service container
.PARAMETER Service
    Name of the Docker Compose service
.PARAMETER Command
    Command to execute
.PARAMETER ComposeFile
    Path to Docker Compose file
.OUTPUTS
    Hashtable with Success (boolean) and Output (string) properties
#>
function Invoke-ContainerCommand {
    param(
        [string]$Service,
        [string]$Command,
        [string]$ComposeFile = $Script:DockerComposeDev
    )

    $composePath = Get-DockerComposePath -ComposeFile $ComposeFile
    Write-Host "[$Service] Running: $Command" -ForegroundColor Gray

    # Check if Docker is available before attempting command
    if (-not (Test-Docker)) {
        $errorMsg = "Docker is not available. Please ensure Docker Desktop is running."
        Write-Host "[$Service] ERROR: $errorMsg" -ForegroundColor Red
        return @{ Success = $false; Output = $errorMsg }
    }

    try {
        # Capture both stdout and stderr, prevent PowerShell from throwing exceptions
        $ErrorActionPreference = 'Continue'
        $output = docker compose -f $composePath exec -T $Service sh -c "$Command" 2>&1
        $code = $LASTEXITCODE
        
        # Convert output to string if it's an array, handling both string and ErrorRecord types
        $outputText = ""
        if ($output -is [array]) {
            $outputParts = @()
            foreach ($item in $output) {
                if ($item -is [System.Management.Automation.ErrorRecord]) {
                    $outputParts += $item.ToString()
                } else {
                    $outputParts += $item.ToString()
                }
            }
            $outputText = $outputParts -join "`n"
        } elseif ($output -is [System.Management.Automation.ErrorRecord]) {
            $outputText = $output.ToString()
        } else {
            $outputText = $output.ToString()
        }

        # Check for Docker API errors
        if ($outputText -match "500 Internal Server Error|API route|dockerDesktopLinuxEngine|Access is denied") {
            $errorMsg = "Docker API error detected. Docker Desktop may not be running properly. Please restart Docker Desktop."
            Write-Host "[$Service] ERROR: $errorMsg" -ForegroundColor Red
            Write-Host "  Details: $outputText" -ForegroundColor Yellow
            return @{ Success = $false; Output = $outputText }
        }

        if ($code -ne 0) {
            Write-Host "[$Service] Command failed with exit code $code" -ForegroundColor Red
            Write-Host "  Full output:" -ForegroundColor Yellow
            # Display output with proper formatting
            $outputLines = $outputText -split "`n|`r`n"
            foreach ($line in $outputLines) {
                $trimmed = $line.Trim()
                if ($trimmed) {
                    Write-Host "    $trimmed" -ForegroundColor Gray
                }
            }
            return @{ Success = $false; Output = $outputText }
        }

        Write-Host "[$Service] OK" -ForegroundColor Green
        return @{ Success = $true; Output = $outputText }
    } catch {
        # If we get here, there was an exception in PowerShell itself
        $errorMsg = "PowerShell exception: $($_.Exception.Message)"
        $fullError = "$errorMsg`n$($_.Exception.StackTrace)"
        Write-Host "[$Service] ERROR: $errorMsg" -ForegroundColor Red
        Write-Host "  Stack trace: $($_.Exception.StackTrace)" -ForegroundColor Yellow
        if ($_.Exception.InnerException) {
            Write-Host "  Inner Exception: $($_.Exception.InnerException.Message)" -ForegroundColor Yellow
        }
        return @{ Success = $false; Output = $fullError }
    }
}

<#
.SYNOPSIS
    Applies Prisma migrations using psql
.DESCRIPTION
    Applies migration.sql files directly to PostgreSQL without using Prisma engine
.PARAMETER DbName
    Name of the database
.PARAMETER MigrationsDir
    Path to migrations directory
.PARAMETER ComposeFile
    Path to Docker Compose file
.OUTPUTS
    Boolean indicating success
#>
function Invoke-PrismaMigrations {
    param(
        [string]$DbName,
        [string]$MigrationsDir,
        [string]$ComposeFile = $Script:DockerComposeDev
    )

    $composePath = Get-DockerComposePath -ComposeFile $ComposeFile
    $cloudLayerDir = Get-CloudLayerDir

    $postgresContainer = docker compose -f $composePath ps -q postgres
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
        $null = $sql | docker exec -i $postgresContainer psql -U $Script:PostgresUser -d $DbName -v ON_ERROR_STOP=1 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[postgres] FAILED applying $($folder.Name) to $DbName" -ForegroundColor Red
            return $false
        }
    }

    return $true
}

<#
.SYNOPSIS
    Waits for RabbitMQ to be ready
.DESCRIPTION
    Polls RabbitMQ container until it responds to status command
.PARAMETER RabbitMQContainer
    Name of RabbitMQ container
.PARAMETER MaxRetries
    Maximum number of retry attempts
.PARAMETER RetryInterval
    Seconds to wait between retries
.OUTPUTS
    Boolean indicating if RabbitMQ is ready
#>
function Wait-RabbitMQReady {
    param(
        [string]$RabbitMQContainer = $Script:RabbitMQContainer,
        [int]$MaxRetries = 30,
        [int]$RetryInterval = 2
    )

    $retryCount = 0
    $ready = $false

    while ($retryCount -lt $MaxRetries -and -not $ready) {
        try {
            $result = docker exec $RabbitMQContainer rabbitmqctl status 2>&1
            if ($LASTEXITCODE -eq 0) {
                $ready = $true
                Write-Host "[OK] RabbitMQ is ready" -ForegroundColor Green
            }
        } catch {
            # Continue waiting
        }

        if (-not $ready) {
            $retryCount++
            Write-Host "  Waiting... ($retryCount/$MaxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds $RetryInterval
        }
    }

    return $ready
}

<#
.SYNOPSIS
    Waits for Vault to be ready
.DESCRIPTION
    Polls Vault health endpoint until it responds
.PARAMETER VaultAddr
    Vault address
.PARAMETER MaxRetries
    Maximum number of retry attempts
.PARAMETER RetryInterval
    Seconds to wait between retries
.OUTPUTS
    Boolean indicating if Vault is ready
#>
function Wait-VaultReady {
    param(
        [string]$VaultAddr = $Script:VaultAddr,
        [int]$MaxRetries = 5,
        [int]$RetryInterval = 2
    )

    $retries = 0
    while ($retries -lt $MaxRetries) {
        try {
            $response = Invoke-RestMethod -Uri "$VaultAddr/v1/sys/health" -Method Get
            return $true
        } catch {
            $retries++
            Start-Sleep -Seconds $RetryInterval
        }
    }
    return $false
}

<#
.SYNOPSIS
    Checks if a PostgreSQL database exists
.DESCRIPTION
    Queries PostgreSQL to check if a database exists
.PARAMETER DbName
    Name of the database to check
.PARAMETER ComposeFile
    Path to Docker Compose file
.OUTPUTS
    Boolean indicating if database exists
#>
function Test-PostgresDatabase {
    param(
        [string]$DbName,
        [string]$ComposeFile = $Script:DockerComposeDev
    )

    $composePath = Get-DockerComposePath -ComposeFile $ComposeFile
    $env:PGPASSWORD = $Script:PostgresPassword

    $checkQuery = "SELECT 1 FROM pg_database WHERE datname = '$DbName';"
    $checkResult = docker compose -f $composePath exec -T postgres psql -U $Script:PostgresUser -d postgres -tc $checkQuery 2>&1
    
    # Convert to string if it's an ErrorRecord
    $resultText = ""
    if ($checkResult -is [System.Management.Automation.ErrorRecord]) {
        $resultText = $checkResult.ToString()
    } elseif ($checkResult -is [array]) {
        $resultText = ($checkResult | ForEach-Object { $_.ToString() }) -join "`n"
    } elseif ($null -eq $checkResult) {
        $resultText = ""
    } else {
        $resultText = $checkResult.ToString()
    }

    return $resultText.Trim() -eq "1"
}

<#
.SYNOPSIS
    Creates a PostgreSQL database
.DESCRIPTION
    Executes CREATE DATABASE command in PostgreSQL
.PARAMETER DbName
    Name of the database to create
.PARAMETER ComposeFile
    Path to Docker Compose file
.OUTPUTS
    Boolean indicating success
#>
function New-PostgresDatabase {
    param(
        [string]$DbName,
        [string]$ComposeFile = $Script:DockerComposeDev
    )

    $composePath = Get-DockerComposePath -ComposeFile $ComposeFile
    $env:PGPASSWORD = $Script:PostgresPassword

    $createQuery = "CREATE DATABASE $DbName;"
    $createResult = docker compose -f $composePath exec -T postgres psql -U $Script:PostgresUser -d postgres -c $createQuery 2>&1

    return $LASTEXITCODE -eq 0
}

<#
.SYNOPSIS
    Writes resolved Docker Compose config to evidence directory
.DESCRIPTION
    Saves docker compose config output to a file
.PARAMETER ConfigOutput
    The config output string
.PARAMETER ComposeFile
    Original compose file name
.OUTPUTS
    Path to the output file
#>
function Write-ComposeEvidence {
    param(
        [string]$ConfigOutput,
        [string]$ComposeFile = $Script:DockerComposeDev
    )

    $cloudLayerDir = Get-CloudLayerDir
    $evidenceDir = Join-Path $cloudLayerDir "evidence"
    if (-not (Test-Path $evidenceDir)) {
        New-Item -ItemType Directory -Path $evidenceDir | Out-Null
    }

    $outputFile = Join-Path $evidenceDir "compose.$($ComposeFile -replace '\.yml$', '').resolved.yml"
    $ConfigOutput | Out-File -FilePath $outputFile -Encoding utf8

    return $outputFile
}

<#
.SYNOPSIS
    Gets ISO 8601 UTC timestamp
.DESCRIPTION
    Returns a DateTime in ISO 8601 UTC format
.PARAMETER DateTime
    DateTime object to convert (defaults to current time)
.OUTPUTS
    ISO 8601 UTC formatted string
#>
function Get-IsoUtcTimestamp {
    param([DateTime]$DateTime = (Get-Date))
    return $DateTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.000Z")
}

<#
.SYNOPSIS
    Checks an HTTP endpoint
.DESCRIPTION
    Makes an HTTP request and returns status information
.PARAMETER Name
    Display name for the endpoint
.PARAMETER Url
    URL to check
.PARAMETER Timeout
    Timeout in seconds
.OUTPUTS
    Hashtable with StatusCode and Success properties
#>
function Test-HttpEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Timeout = 20
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec $Timeout
        $statusMsg = "{0,-28} {1}" -f $Name, $resp.StatusCode
        Write-Host $statusMsg -ForegroundColor Green
        return @{ StatusCode = $resp.StatusCode; Success = $true }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if (-not $status) { $status = "ERR" }
        $statusMsg = "{0,-28} {1}" -f $Name, $status
        Write-Host $statusMsg -ForegroundColor Yellow
        return @{ StatusCode = $status; Success = $false }
    }
}
