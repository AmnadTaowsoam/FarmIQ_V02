# Verification script for BFF /api/v1/tenants route
# Usage: .\verify-bff-tenants-route.ps1

$BFF_URL = "http://localhost:5125"
$TENANT_REGISTRY_URL = "http://localhost:5121"

Write-Host "=== BFF /api/v1/tenants Route Verification ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check BFF health
Write-Host "1. Checking BFF health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$BFF_URL/api/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ BFF is healthy (Status: $($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ BFF health check failed: $_" -ForegroundColor Red
    Write-Host "   Make sure BFF container is running on port 5125" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Check tenant-registry health (upstream service)
Write-Host "2. Checking tenant-registry health (upstream)..." -ForegroundColor Yellow
try {
    $upstreamHealthResponse = Invoke-WebRequest -Uri "$TENANT_REGISTRY_URL/api/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Tenant-registry is healthy (Status: $($upstreamHealthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Tenant-registry health check failed: $_" -ForegroundColor Yellow
    Write-Host "   This may cause 502 errors when calling /api/v1/tenants" -ForegroundColor Yellow
}
Write-Host ""

# 3. Test /api/v1/tenants without auth (should return 401)
Write-Host "3. Testing GET /api/v1/tenants without authentication..." -ForegroundColor Yellow
try {
    $tenantsResponse = Invoke-WebRequest -Uri "$BFF_URL/api/v1/tenants" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ⚠️  Unexpected: Got status $($tenantsResponse.StatusCode) without auth" -ForegroundColor Yellow
    Write-Host "   Expected: 401 Unauthorized" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Route exists! Got 401 Unauthorized (as expected without auth)" -ForegroundColor Green
        Write-Host "   This confirms the route is registered and working." -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ❌ Route NOT found (404)" -ForegroundColor Red
        Write-Host "   Action: Rebuild BFF container:" -ForegroundColor Yellow
        Write-Host "     docker compose -f docker-compose.dev.yml build cloud-api-gateway-bff" -ForegroundColor White
        Write-Host "     docker compose -f docker-compose.dev.yml up -d" -ForegroundColor White
    } else {
        Write-Host "   ⚠️  Got unexpected status: $statusCode" -ForegroundColor Yellow
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}
Write-Host ""

# 4. Test direct tenant-registry endpoint (bypass BFF)
Write-Host "4. Testing direct tenant-registry endpoint (bypass BFF)..." -ForegroundColor Yellow
try {
    $directResponse = Invoke-WebRequest -Uri "$TENANT_REGISTRY_URL/api/v1/tenants" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Direct call to tenant-registry succeeded (Status: $($directResponse.StatusCode))" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    Write-Host "   (This is expected if auth is required)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you got 401 from step 3:" -ForegroundColor Green
Write-Host "  ✅ Route exists and is working correctly" -ForegroundColor Green
Write-Host "  ✅ Authentication middleware is functioning" -ForegroundColor Green
Write-Host "  ✅ To test with data, use a valid JWT token:" -ForegroundColor Yellow
Write-Host "     curl -H 'Authorization: Bearer <token>' $BFF_URL/api/v1/tenants" -ForegroundColor White
Write-Host ""
Write-Host "If you got 404 from step 3:" -ForegroundColor Red
Write-Host "  ❌ Container needs to be rebuilt to include the route" -ForegroundColor Red
Write-Host "  Run: docker compose -f docker-compose.dev.yml build cloud-api-gateway-bff" -ForegroundColor Yellow
Write-Host "  Then: docker compose -f docker-compose.dev.yml up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "For detailed information, see: docs/progress/cloud-api-gateway-bff-tenants-fix.md" -ForegroundColor Cyan

