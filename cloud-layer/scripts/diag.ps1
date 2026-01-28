Write-Host "Diagnostic Start"
$root = $PSScriptRoot
Write-Host "PSScriptRoot: $root"
$shared = Join-Path $root "Shared"
Write-Host "Shared Dir: $shared"
if (Test-Path $shared) {
    Write-Host "✓ Shared directory exists"
} else {
    Write-Host "✗ Shared directory NOT found"
}
Write-Host "Diagnostic End"
