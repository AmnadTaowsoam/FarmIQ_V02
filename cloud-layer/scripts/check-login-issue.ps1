# Script to diagnose and fix login issues
# Usage: .\scripts\check-login-issue.ps1

Write-Host "=== FarmIQ Login Issue Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "1. Checking Docker services..." -ForegroundColor Yellow
$services = @("farmiq-cloud-identity-access", "farmiq-cloud-api-gateway-bff", "farmiq-cloud-postgres")
$runningServices = docker ps --format "{{.Names}}" | Select-String -Pattern "farmiq-cloud"

foreach ($service in $services) {
    if ($runningServices -match $service) {
        Write-Host "  ✓ $service is running" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $service is NOT running" -ForegroundColor Red
    }
}

Write-Host ""

# Check service health
Write-Host "2. Checking service health endpoints..." -ForegroundColor Yellow

# Check Identity Service
try {
    $identityHealth = Invoke-WebRequest -Uri "http://localhost:5120/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($identityHealth.StatusCode -eq 200) {
        Write-Host "  ✓ Identity Service (5120) is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Identity Service (5120) is NOT responding: $($_.Exception.Message)" -ForegroundColor Red
}

# Check BFF Gateway
try {
    $bffHealth = Invoke-WebRequest -Uri "http://localhost:5125/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($bffHealth.StatusCode -eq 200) {
        Write-Host "  ✓ BFF Gateway (5125) is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ BFF Gateway (5125) is NOT responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check database connection
Write-Host "3. Checking database connection..." -ForegroundColor Yellow
try {
    $dbReady = docker exec farmiq-cloud-postgres pg_isready -U farmiq 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ PostgreSQL is ready" -ForegroundColor Green
    } else {
        Write-Host "  ✗ PostgreSQL is NOT ready" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Cannot check PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check if admin user exists
Write-Host "4. Checking if admin user exists in database..." -ForegroundColor Yellow
try {
    $userCheck = docker exec farmiq-cloud-postgres psql -U farmiq -d cloud_identity_access -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@farmiq.com';" 2>&1
    $userCount = $userCheck.Trim()
    if ($userCount -gt 0) {
        Write-Host "  ✓ Admin user exists (count: $userCount)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Admin user does NOT exist - need to run seed" -ForegroundColor Red
        Write-Host "    Run: docker exec farmiq-cloud-identity-access npm run seed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Cannot check users table: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Test login endpoint
Write-Host "5. Testing login endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@farmiq.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5125/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    if ($loginResponse.StatusCode -eq 200) {
        Write-Host "  ✓ Login endpoint is working!" -ForegroundColor Green
        $responseData = $loginResponse.Content | ConvertFrom-Json
        Write-Host "    Access token received: $($responseData.access_token.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  ✗ Login endpoint failed: HTTP $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "    Response: $responseBody" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If services are not running, start them with:" -ForegroundColor Yellow
Write-Host "  docker compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "If admin user doesn't exist, seed the database with:" -ForegroundColor Yellow
Write-Host "  docker exec farmiq-cloud-identity-access npm run seed" -ForegroundColor White
Write-Host ""
