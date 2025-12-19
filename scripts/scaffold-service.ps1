# Scaffold a service from boilerplate
param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceName,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("edge-layer", "cloud-layer", "iot-layer")]
    [string]$Layer,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("node", "python")]
    [string]$Type
)

$BoilerplatePath = "boilerplates/Backend-$Type"
$ServicePath = "$Layer/$ServiceName"

if (-not (Test-Path $BoilerplatePath)) {
    Write-Error "Boilerplate not found: $BoilerplatePath"
    exit 1
}

Write-Host "Scaffolding $ServiceName from $BoilerplatePath..."

# Create service directory
New-Item -ItemType Directory -Force -Path $ServicePath | Out-Null

# Copy boilerplate files (excluding node_modules, dist, etc.)
$ExcludeDirs = @("node_modules", "dist", ".git", "coverage", ".nyc_output")
Get-ChildItem -Path $BoilerplatePath -Recurse | Where-Object {
    $relativePath = $_.FullName.Replace($BoilerplatePath, "")
    $shouldExclude = $false
    foreach ($exclude in $ExcludeDirs) {
        if ($relativePath -like "*\$exclude\*" -or $relativePath -like "*\$exclude") {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
} | Copy-Item -Destination {
    $_.FullName.Replace($BoilerplatePath, $ServicePath)
} -Force

Write-Host "Service scaffolded to $ServicePath"
Write-Host "Next steps:"
Write-Host "1. Update package.json (Node) or requirements.txt (Python)"
Write-Host "2. Update service name and port in source files"
Write-Host "3. Add /api/health endpoint (Python services)"

