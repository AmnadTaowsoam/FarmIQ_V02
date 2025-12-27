param(
  [string]$BffBaseUrl = "http://localhost:5125",
  [string]$TenantId = "00000000-0000-4000-8000-000000000001",
  [string]$FarmId = "00000000-0000-4000-8000-000000000102",
  [string]$BarnId = "00000000-0000-4000-8000-000000001202",
  [string]$BatchId = "00000000-0000-4000-8000-000000010202"
)

$ErrorActionPreference = "Stop"

function Get-IsoUtc([DateTime]$dt) {
  return $dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.000Z")
}

$to = Get-IsoUtc (Get-Date)
$from = Get-IsoUtc ((Get-Date).AddDays(-7))
$startDate = (Get-Date).AddDays(-7).ToUniversalTime().ToString("yyyy-MM-dd")
$endDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")

function Check-Endpoint([string]$name, [string]$url) {
  try {
    $resp = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 20
    Write-Host ("{0,-28} {1}" -f $name, $resp.StatusCode)
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if (-not $status) { $status = "ERR" }
    Write-Host ("{0,-28} {1}" -f $name, $status) -ForegroundColor Yellow
  }
}

Write-Host "=== Verify dashboard-web backend (via BFF) ==="
Write-Host ("BFF: {0}" -f $BffBaseUrl)
Write-Host ("tenantId={0}" -f $TenantId)
Write-Host ("farmId={0}" -f $FarmId)
Write-Host ("barnId={0}" -f $BarnId)
Write-Host ("from={0}" -f $from)
Write-Host ("to={0}" -f $to)
Write-Host ""

Check-Endpoint "tenants" "$BffBaseUrl/api/v1/tenants"
Check-Endpoint "farms" "$BffBaseUrl/api/v1/farms?tenantId=$TenantId&page=1&pageSize=10"
Check-Endpoint "barns" "$BffBaseUrl/api/v1/barns?tenantId=$TenantId&farmId=$FarmId&page=1&pageSize=10"
Check-Endpoint "batches" "$BffBaseUrl/api/v1/batches?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&page=1&pageSize=10"
Check-Endpoint "devices" "$BffBaseUrl/api/v1/devices?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&page=1&pageSize=10"

Check-Endpoint "dashboard/overview" "$BffBaseUrl/api/v1/dashboard/overview?tenantId=$TenantId&timeRange=7d"
Check-Endpoint "dashboard/alerts" "$BffBaseUrl/api/v1/dashboard/alerts?tenantId=$TenantId&limit=10"

Check-Endpoint "telemetry/metrics" "$BffBaseUrl/api/v1/telemetry/metrics?tenantId=$TenantId"
Check-Endpoint "telemetry/readings" "$BffBaseUrl/api/v1/telemetry/readings?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&from=$from&to=$to&limit=5"
Check-Endpoint "telemetry/aggregates" "$BffBaseUrl/api/v1/telemetry/aggregates?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&from=$from&to=$to&bucket=1h"

Check-Endpoint "weighvision/sessions" "$BffBaseUrl/api/v1/weighvision/sessions?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&from=$from&to=$to&limit=5"
Check-Endpoint "weighvision/analytics" "$BffBaseUrl/api/v1/weighvision/analytics?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&start_date=$startDate&end_date=$endDate"
Check-Endpoint "weighvision/aggregates" "$BffBaseUrl/api/v1/weighvision/weight-aggregates?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&start=$from&end=$to"

Check-Endpoint "feeding/kpi" "$BffBaseUrl/api/v1/kpi/feeding?tenantId=$TenantId&barnId=$BarnId&startDate=$startDate&endDate=$endDate"
Check-Endpoint "feed/lots" "$BffBaseUrl/api/v1/feed/lots?tenantId=$TenantId&farmId=$FarmId&page=1&pageSize=5"
Check-Endpoint "barn-records/daily" "$BffBaseUrl/api/v1/barn-records/daily-counts?tenantId=$TenantId&farmId=$FarmId&barnId=$BarnId&limit=5"

Check-Endpoint "reports/jobs" "$BffBaseUrl/api/v1/reports/jobs?tenantId=$TenantId&limit=5"
Check-Endpoint "standards/sets" "$BffBaseUrl/api/v1/standards/sets?page=1&pageSize=5"
Check-Endpoint "notifications/history" "$BffBaseUrl/api/v1/notifications/history?tenantId=$TenantId&limit=5"

Check-Endpoint "ops/sync-status" "$BffBaseUrl/api/v1/ops/sync-status?tenantId=$TenantId"
Check-Endpoint "ops/data-quality" "$BffBaseUrl/api/v1/ops/data-quality?tenant_id=$TenantId&start_time=$from&end_time=$to"

Write-Host ""
Write-Host "Done."
