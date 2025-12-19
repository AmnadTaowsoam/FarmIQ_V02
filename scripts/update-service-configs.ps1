# Update service configurations after scaffolding
$services = @(
    @{Name="edge-ingress-gateway"; Layer="edge-layer"; Type="node"},
    @{Name="edge-telemetry-timeseries"; Layer="edge-layer"; Type="node"},
    @{Name="edge-weighvision-session"; Layer="edge-layer"; Type="node"},
    @{Name="edge-media-store"; Layer="edge-layer"; Type="node"},
    @{Name="edge-sync-forwarder"; Layer="edge-layer"; Type="node"},
    @{Name="cloud-identity-access"; Layer="cloud-layer"; Type="node"},
    @{Name="cloud-tenant-registry"; Layer="cloud-layer"; Type="node"},
    @{Name="cloud-ingestion"; Layer="cloud-layer"; Type="node"},
    @{Name="cloud-telemetry-service"; Layer="cloud-layer"; Type="node"},
    @{Name="cloud-api-gateway-bff"; Layer="cloud-layer"; Type="node"}
)

foreach ($svc in $services) {
    $packageJson = "$($svc.Layer)/$($svc.Name)/package.json"
    if (Test-Path $packageJson) {
        $content = Get-Content $packageJson -Raw | ConvertFrom-Json
        $content.name = $svc.Name
        $content | ConvertTo-Json -Depth 10 | Set-Content $packageJson
        Write-Host "Updated $packageJson"
    }
}

# Update Python services to add /api/health
$pythonServices = @(
    @{Name="edge-vision-inference"; Layer="edge-layer"},
    @{Name="cloud-analytics-service"; Layer="cloud-layer"}
)

foreach ($svc in $pythonServices) {
    $mainPy = "$($svc.Layer)/$($svc.Name)/app/main.py"
    if (Test-Path $mainPy) {
        $content = Get-Content $mainPy -Raw
        # Add /api/health alias if not present
        if ($content -notmatch '@app.get\("/api/health"') {
            $content = $content -replace '(@app.get\("/health"', '@app.get("/api/health", tags=["Health Check"])\n@app.get("/health"'
            $content | Set-Content $mainPy
            Write-Host "Updated $mainPy to add /api/health"
        }
    }
    
    # Update Dockerfile port
    $dockerfile = "$($svc.Layer)/$($svc.Name)/Dockerfile"
    if (Test-Path $dockerfile) {
        $content = Get-Content $dockerfile -Raw
        $content = $content -replace 'EXPOSE 6403', 'EXPOSE 8000'
        $content = $content -replace '--port 6403', '--port 8000'
        $content = $content -replace 'localhost:6403', 'localhost:8000'
        $content | Set-Content $dockerfile
        Write-Host "Updated $dockerfile port to 8000"
    }
}

Write-Host "Service configurations updated!"

