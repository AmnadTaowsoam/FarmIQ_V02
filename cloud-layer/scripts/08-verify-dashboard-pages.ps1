param(
  [string]$BffBaseUrl = $null,
  [string]$TenantId = $null,
  [string]$FarmId = $null,
  [string]$BarnId = $null,
  [string]$BatchId = $null
)

$ErrorActionPreference = "Stop"

# Import shared modules
$SharedDir = Join-Path $PSScriptRoot "Shared"
. "$SharedDir\Config.ps1"
. "$SharedDir\Utilities.ps1"

# Use defaults from config if not provided
if (-not $BffBaseUrl) { $BffBaseUrl = $Script:BFFBaseUrl }
if (-not $TenantId) { $TenantId = $Script:DefaultTenantId }
if (-not $FarmId) { $FarmId = $Script:DefaultFarmId }
if (-not $BarnId) { $BarnId = $Script:DefaultBarnId }
if (-not $BatchId) { $BatchId = $Script:DefaultBatchId }

$to = Get-IsoUtcTimestamp (Get-Date)
$from = Get-IsoUtcTimestamp ((Get-Date).AddDays(-7))
$startDate = (Get-Date).AddDays(-7).ToUniversalTime().ToString("yyyy-MM-dd")
$endDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")

Write-Host "=== Verify dashboard-web backend (via BFF) ==="
Write-Host ("BFF: {0}" -f $BffBaseUrl)
Write-Host ("tenantId={0}" -f $TenantId)
Write-Host ("farmId={0}" -f $FarmId)
Write-Host ("barnId={0}" -f $BarnId)
Write-Host ("from={0}" -f $from)
Write-Host ("to={0}" -f $to)
Write-Host ""

Test-HttpEndpoint "tenants" "$BffBaseUrl/api/v1/tenants"
Test-HttpEndpoint "farms" "$BffBaseUrl/api/v1/farms?tenantId=$TenantId&page=1&pageSize=10"
Test-HttpEndpoint "barns" "$BffBaseUrl/api/v1/barns?tenantId=$TenantId&farmId=$FarmId&page=1&pageSize=10"
Test-HttpEndpoint "batches" "$BffBaseUrl/api/v1/batches?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&page=1&pageSize=10"
Test-HttpEndpoint "devices" "$BffBaseUrl/api/v1/devices?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&page=1&pageSize=10"

Test-HttpEndpoint "dashboard/overview" "$BffBaseUrl/api/v1/dashboard/overview?tenantId=$TenantId&timeRange=7d"
Test-HttpEndpoint "dashboard/alerts" "$BffBaseUrl/api/v1/dashboard/alerts?tenantId=$TenantId&limit=10"

Test-HttpEndpoint "telemetry/metrics" "$BffBaseUrl/api/v1/telemetry/metrics?tenantId=$TenantId"
Test-HttpEndpoint "telemetry/readings" "$BffBaseUrl/api/v1/telemetry/readings?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&from=$from&to=$to&limit=5"
Test-HttpEndpoint "telemetry/aggregates" "$BffBaseUrl/api/v1/telemetry/aggregates?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&from=$from&to=$to&bucket=1h"

Test-HttpEndpoint "weighvision/sessions" "$BffBaseUrl/api/v1/weighvision/sessions?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&from=$from&to=$to&limit=5"
Test-HttpEndpoint "weighvision/analytics" "$BffBaseUrl/api/v1/weighvision/analytics?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&start_date=$startDate&end_date=$endDate"
Test-HttpEndpoint "weighvision/aggregates" "$BffBaseUrl/api/v1/weighvision/weight-aggregates?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&start=$from&end=$to"

Test-HttpEndpoint "feeding/kpi" "$BffBaseUrl/api/v1/kpi/feeding?tenantId=$TenantId&barnId=$BarnId&startDate=$startDate&endDate=$endDate"
Test-HttpEndpoint "feed/lots" "$BffBaseUrl/api/v1/feed/lots?tenantId=$TenantId&farmId=$FarmId&page=1&pageSize=5"
Test-HttpEndpoint "barn-records/daily" "$BffBaseUrl/api/v1/barn-records/daily-counts?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&limit=5"

Test-HttpEndpoint "reports/jobs" "$BffBaseUrl/api/v1/reports/jobs?tenantId=$TenantId&limit=5"
Test-HttpEndpoint "standards/sets" "$BffBaseUrl/api/v1/standards/sets?page=1&pageSize=5"
Test-HttpEndpoint "notifications/history" "$BffBaseUrl/api/v1/notifications/history?tenantId=$TenantId&limit=5"

Test-HttpEndpoint "ops/sync-status" "$BffBaseUrl/api/v1/ops/sync-status?tenantId=$TenantId"
Test-HttpEndpoint "ops/data-quality" "$BffBaseUrl/api/v1/ops/data-quality?tenant_id=$TenantId&start_time=$from&end_time=$to"

Write-Host ""
Write-Host "Done."
