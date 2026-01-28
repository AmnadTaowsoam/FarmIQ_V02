# Vault Initialization Script for Development
# Assumes Vault is running on localhost:8200 with root token 'root'

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

Write-Host "Waiting for Vault to be ready..." -ForegroundColor Yellow

if (Wait-VaultReady -VaultAddr $Script:VaultAddr) {
    Write-Host "Vault is ready. Enabling KV secrets engine..." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNING: Vault is not reachable at $($Script:VaultAddr)" -ForegroundColor Yellow
    Write-Host "This script is OPTIONAL. If you're not using HashiCorp Vault for secrets management," -ForegroundColor Gray
    Write-Host "you can safely skip this step and continue with the next script." -ForegroundColor Gray
    Write-Host ""
    Write-Host "To use this script:" -ForegroundColor Cyan
    Write-Host "  1. Start Vault: docker compose -f docker-compose.dev.yml up -d vault" -ForegroundColor White
    Write-Host "  2. Wait for Vault to be ready (usually takes a few seconds)" -ForegroundColor White
    Write-Host "  3. Run this script again: .\scripts\02-vault-init.ps1" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Enable KV secrets engine at path secret/
$headers = @{ "X-Vault-Token" = $Script:VaultToken }
$body = @{ "type" = "kv"; "options" = @{ "version" = "2" } }

try {
    Invoke-RestMethod -Uri "$($Script:VaultAddr)/v1/sys/mounts/secret" -Method Post -Headers $headers -Body ($body | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Enabled KV engine at secret/" -ForegroundColor Green
} catch {
    Write-Host "KV engine might already be enabled or error occurred: $_" -ForegroundColor Yellow
}

# Example: Write some initial secrets
Write-Host "Writing initial secrets to secret/data/farmiq/cloud-identity-access..." -ForegroundColor Yellow
$secretData = @{
    "data" = @{
        "JWT_SECRET" = "super-secure-jwt-secret-from-vault"
        "REFRESH_TOKEN_SECRET" = "super-secure-refresh-token-secret-from-vault"
    }
}

try {
    Invoke-RestMethod -Uri "$($Script:VaultAddr)/v1/secret/data/farmiq/cloud-identity-access" -Method Post -Headers $headers -Body ($secretData | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Vault initialization complete." -ForegroundColor Green
} catch {
    Write-Host "Error writing secrets: $_" -ForegroundColor Yellow
}
