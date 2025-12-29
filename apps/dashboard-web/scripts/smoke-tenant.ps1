$BaseUrl = if ($env:BFF_BASE_URL) { $env:BFF_BASE_URL } else { "http://localhost:5125" }
$Url = "$BaseUrl/api/v1/tenants"

Write-Host "Tenant smoke: GET $Url"

try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 15
    $status = $response.StatusCode
} catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $status = $_.Exception.Response.StatusCode.Value__
    } else {
        $status = 0
    }
}

switch ($status) {
    200 { Write-Host "OK: tenants endpoint reachable (200)." }
    401 { Write-Host "AUTH REQUIRED: tenants endpoint returned 401 (expected if auth enforced)." }
    404 { Write-Host "MISSING PROXY: tenants endpoint returned 404. BFF route not configured or service down." }
    0 { Write-Host "NETWORK ERROR: could not reach BFF at $BaseUrl." }
    default { Write-Host "UNEXPECTED: tenants endpoint returned status $status." }
}
