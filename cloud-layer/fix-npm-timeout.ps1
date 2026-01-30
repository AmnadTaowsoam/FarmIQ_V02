# Script to fix invalid npm timeout configuration in all Dockerfiles
# Removes the invalid 'npm config set timeout' line while keeping 'fetch-timeout'

$dockerfiles = @(
    "cloud-layer/cloud-weighvision-readmodel/Dockerfile",
    "cloud-layer/cloud-tenant-registry/Dockerfile",
    "cloud-layer/cloud-telemetry-service/Dockerfile",
    "cloud-layer/cloud-standards-service/Dockerfile",
    "cloud-layer/cloud-reporting-export-service/Dockerfile",
    "cloud-layer/cloud-notification-service/Dockerfile",
    "cloud-layer/cloud-ingestion/Dockerfile",
    "cloud-layer/cloud-identity-access/Dockerfile",
    "cloud-layer/cloud-fleet-management/Dockerfile",
    "cloud-layer/cloud-feed-service/Dockerfile",
    "cloud-layer/cloud-billing-service/Dockerfile",
    "cloud-layer/cloud-config-rules-service/Dockerfile",
    "cloud-layer/cloud-barn-records-service/Dockerfile",
    "cloud-layer/cloud-api-gateway-bff/Dockerfile",
    "cloud-layer/cloud-audit-log-service/Dockerfile"
)

foreach ($dockerfile in $dockerfiles) {
    if (Test-Path $dockerfile) {
        # Read the file as a single string
        $content = Get-Content $dockerfile -Raw
        $originalContent = $content

        # Remove the invalid 'npm config set timeout 180000 && \' line
        # Also remove the blank line that follows it (before fetch-timeout)
        $content = $content -replace '    npm config set timeout 180000 \\\r?\n\r?\n    npm config set fetch-timeout 180000', '    npm config set fetch-timeout 180000'

        if ($content -ne $originalContent) {
            Set-Content -Path $dockerfile -Value $content -NoNewline
            Write-Host "Fixed: $dockerfile" -ForegroundColor Green
        } else {
            Write-Host "No changes needed: $dockerfile" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $dockerfile" -ForegroundColor Red
    }
}

Write-Host "`nFix complete! The invalid 'npm config set timeout' line has been removed from all Dockerfiles." -ForegroundColor Cyan
