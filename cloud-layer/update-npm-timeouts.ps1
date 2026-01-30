# Script to update npm timeout settings in all Node.js Dockerfiles

$nodeServices = @(
    "cloud-api-gateway-bff",
    "cloud-barn-records-service",
    "cloud-billing-service",
    "cloud-config-rules-service",
    "cloud-feed-service",
    "cloud-ingestion",
    "cloud-notification-service",
    "cloud-reporting-export-service",
    "cloud-standards-service",
    "cloud-telemetry-service",
    "cloud-tenant-registry",
    "cloud-weighvision-readmodel"
)

$oldPattern = 'maxsockets 3'
$newPattern = 'maxsockets 3 && \
    npm config set fetch-timeout 180000'

foreach ($service in $nodeServices) {
    $dockerfilePath = "cloud-layer\$service\Dockerfile"
    if (Test-Path $dockerfilePath) {
        $content = Get-Content $dockerfilePath -Raw
        # Check if npm config has timeout settings (not HEALTHCHECK timeout)
        if ($content -match 'maxsockets 3' -and $content -notmatch 'npm config set fetch-timeout') {
            $content = $content -replace 'RUN npm config set maxsockets 3', $newPattern
            Set-Content -Path $dockerfilePath -Value $content -NoNewline
            Write-Host "Updated: $dockerfilePath (added fetch-timeout settings)" -ForegroundColor Green
        } else {
            Write-Host "Skipped: $dockerfilePath (already has fetch-timeout settings)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Not found: $dockerfilePath" -ForegroundColor Red
    }
}

Write-Host "`nDone updating npm fetch-timeout settings!" -ForegroundColor Cyan
