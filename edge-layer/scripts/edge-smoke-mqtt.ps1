Param(
  [switch]$Up
)

$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ComposeBase = Join-Path $RootDir "docker-compose.yml"
$ComposeDev = Join-Path $RootDir "docker-compose.dev.yml"

function Require-Cmd($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Require-Cmd curl
Require-Cmd docker
Require-Cmd python

$EdgeIngressUrl = $env:EDGE_INGRESS_URL; if (-not $EdgeIngressUrl) { $EdgeIngressUrl = "http://localhost:5103" }
$EdgeSyncUrl = $env:EDGE_SYNC_URL; if (-not $EdgeSyncUrl) { $EdgeSyncUrl = "http://localhost:5108" }

$TenantId = $env:TENANT_ID; if (-not $TenantId) { $TenantId = "t-001" }
$FarmId = $env:FARM_ID; if (-not $FarmId) { $FarmId = "f-001" }
$BarnId = $env:BARN_ID; if (-not $BarnId) { $BarnId = "b-001" }
$DeviceId = $env:DEVICE_ID; if (-not $DeviceId) { $DeviceId = "d-001" }
$StationId = $env:STATION_ID; if (-not $StationId) { $StationId = "st-01" }
$WvDeviceId = $env:WV_DEVICE_ID; if (-not $WvDeviceId) { $WvDeviceId = "wv-001" }
$SessionId = $env:SESSION_ID; if (-not $SessionId) { $SessionId = "s-mqtt-smoke-$([int](Get-Date -UFormat %s))" }

$MqttHost = $env:MQTT_HOST; if (-not $MqttHost) { $MqttHost = "localhost" }
$MqttPort = $env:MQTT_PORT; if (-not $MqttPort) { $MqttPort = "5100" }

$TraceId = "trace-mqtt-$([int](Get-Date -UFormat %s))"

if ($Up) {
  docker compose -f $ComposeBase -f $ComposeDev up -d --build postgres edge-mqtt-broker edge-ingress-gateway `
    edge-weighvision-session edge-telemetry-timeseries edge-sync-forwarder | Out-Null
}

Write-Host "Seeding allowlists (required by ingress)"
$Sql = @"
INSERT INTO device_allowlist (tenant_id, device_id, farm_id, barn_id, enabled, created_at, updated_at)
VALUES ('$TenantId','$DeviceId','$FarmId','$BarnId', TRUE, NOW(), NOW())
ON CONFLICT (tenant_id, device_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();

INSERT INTO station_allowlist (tenant_id, station_id, farm_id, barn_id, enabled, created_at, updated_at)
VALUES ('$TenantId','$StationId','$FarmId','$BarnId', TRUE, NOW(), NOW())
ON CONFLICT (tenant_id, station_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();
"@

docker compose -f $ComposeBase -f $ComposeDev exec -T postgres psql -U ($env:POSTGRES_USER ?? "farmiq") -d ($env:POSTGRES_DB ?? "farmiq") -v ON_ERROR_STOP=1 `
  -c $Sql | Out-Null

Write-Host "Ingress stats (before)"
curl -fsS "$EdgeIngressUrl/api/v1/ingress/stats" | ConvertFrom-Json | ConvertTo-Json

function New-Uuid() {
  python - <<'PY'
import uuid
print(str(uuid.uuid4()))
PY
}

function Publish-Mqtt($Topic, $Message) {
  if (Get-Command mosquitto_pub -ErrorAction SilentlyContinue) {
    mosquitto_pub -h $MqttHost -p $MqttPort -t $Topic -q 1 -m $Message | Out-Null
    return
  }
  # Fallback to container exec (dev compose)
  docker compose -f $ComposeBase -f $ComposeDev exec -T edge-mqtt-broker mosquitto_pub -h "localhost" -t $Topic -q 1 -m $Message | Out-Null
}

$TelemetryTopic = "iot/telemetry/$TenantId/$FarmId/$BarnId/$DeviceId/temperature"
$TelemetryEventId = New-Uuid
$TelemetryMsg = @{
  schema_version = "1.0"
  event_id = $TelemetryEventId
  trace_id = $TraceId
  tenant_id = $TenantId
  device_id = $DeviceId
  event_type = "telemetry.reading"
  ts = (Get-Date).ToString("o")
  payload = @{ value = 26.4; unit = "C" }
} | ConvertTo-Json -Compress

Write-Host "Publishing telemetry: $TelemetryTopic event_id=$TelemetryEventId"
Publish-Mqtt $TelemetryTopic $TelemetryMsg

$WvTopic = "iot/weighvision/$TenantId/$FarmId/$BarnId/$StationId/session/$SessionId/weighvision.session.created"
$WvEventId = New-Uuid
$WvMsg = @{
  schema_version = "1.0"
  event_id = $WvEventId
  trace_id = $TraceId
  tenant_id = $TenantId
  device_id = $WvDeviceId
  event_type = "weighvision.session.created"
  ts = (Get-Date).ToString("o")
  payload = @{ batch_id = "batch-smoke" }
} | ConvertTo-Json -Compress

Write-Host "Publishing weighvision session created: $WvTopic event_id=$WvEventId"
Publish-Mqtt $WvTopic $WvMsg

Start-Sleep -Seconds 2

Write-Host "Ingress stats (after)"
curl -fsS "$EdgeIngressUrl/api/v1/ingress/stats" | ConvertFrom-Json | ConvertTo-Json

Write-Host "Sync state"
curl -fsS "$EdgeSyncUrl/api/v1/sync/state" | ConvertFrom-Json | ConvertTo-Json

Write-Host "OK: mqtt smoke publish completed (session_id=$SessionId)"
