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

$EdgeSessionUrl = $env:EDGE_SESSION_URL; if (-not $EdgeSessionUrl) { $EdgeSessionUrl = "http://localhost:5105" }
$EdgeMediaUrl = $env:EDGE_MEDIA_URL; if (-not $EdgeMediaUrl) { $EdgeMediaUrl = "http://localhost:5106" }
$EdgeInferUrl = $env:EDGE_INFER_URL; if (-not $EdgeInferUrl) { $EdgeInferUrl = "http://localhost:5107" }
$EdgeSyncUrl = $env:EDGE_SYNC_URL; if (-not $EdgeSyncUrl) { $EdgeSyncUrl = "http://localhost:5108" }

$TenantId = $env:TENANT_ID; if (-not $TenantId) { $TenantId = "t-001" }
$FarmId = $env:FARM_ID; if (-not $FarmId) { $FarmId = "f-001" }
$BarnId = $env:BARN_ID; if (-not $BarnId) { $BarnId = "b-001" }
$DeviceId = $env:DEVICE_ID; if (-not $DeviceId) { $DeviceId = "wv-001" }
$StationId = $env:STATION_ID; if (-not $StationId) { $StationId = "st-01" }

$SessionId = $env:SESSION_ID; if (-not $SessionId) { $SessionId = "s-smoke-$([int](Get-Date -UFormat %s))" }
$TraceId = "trace-smoke-$([int](Get-Date -UFormat %s))"

$FramePath = $env:FRAME_PATH
if (-not $FramePath) { $FramePath = Join-Path $RootDir "tmp\\smoke-frame.jpg" }
New-Item -ItemType Directory -Force -Path (Split-Path $FramePath) | Out-Null

if ($Up) {
  docker compose -f $ComposeBase -f $ComposeDev up -d --build postgres minio cloud-ingestion-mock `
    edge-media-store edge-vision-inference edge-weighvision-session edge-sync-forwarder | Out-Null
}

if (-not (Test-Path $FramePath)) {
  python - <<PY
import base64, pathlib
data = base64.b64decode(
    b'/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkA//Z'
)
path = pathlib.Path(r"$FramePath")
path.write_bytes(data)
print(f"Wrote {path} ({len(data)} bytes)")
PY
}

Write-Host "1) Create session ($SessionId)"
$SessionEventId = python - <<'PY'
import uuid
print(str(uuid.uuid4()))
PY

$SessionBody = @{
  sessionId = $SessionId
  eventId = $SessionEventId
  tenantId = $TenantId
  farmId = $FarmId
  barnId = $BarnId
  deviceId = $DeviceId
  stationId = $StationId
  startAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Compress

curl -fsS -X POST "$EdgeSessionUrl/api/v1/weighvision/sessions" `
  -H "content-type: application/json" `
  -H "x-tenant-id: $TenantId" `
  -H "x-request-id: $SessionEventId" `
  -H "x-trace-id: $TraceId" `
  -d $SessionBody | Out-Null

Write-Host "2) Presign upload"
$PresignBody = @{
  tenant_id = $TenantId
  farm_id = $FarmId
  barn_id = $BarnId
  device_id = $DeviceId
  content_type = "image/jpeg"
  filename = "frame.jpg"
} | ConvertTo-Json -Compress

$PresignJson = curl -fsS -X POST "$EdgeMediaUrl/api/v1/media/images/presign" `
  -H "content-type: application/json" `
  -H "x-tenant-id: $TenantId" `
  -H "x-request-id: req-presign-$SessionEventId" `
  -H "x-trace-id: $TraceId" `
  -d $PresignBody

$PresignObj = $PresignJson | ConvertFrom-Json
$UploadUrl = $PresignObj.upload_url
$ObjectKey = $PresignObj.object_key

Write-Host "3) PUT upload ($FramePath -> $ObjectKey)"
curl -fsS -X PUT "$UploadUrl" -H "Content-Type: image/jpeg" --data-binary "@$FramePath" | Out-Null

Write-Host "4) Complete upload"
$CompleteBody = @{
  tenant_id = $TenantId
  farm_id = $FarmId
  barn_id = $BarnId
  device_id = $DeviceId
  object_key = $ObjectKey
  mime_type = "image/jpeg"
  session_id = $SessionId
} | ConvertTo-Json -Compress

$CompleteJson = curl -fsS -X POST "$EdgeMediaUrl/api/v1/media/images/complete" `
  -H "content-type: application/json" `
  -H "x-tenant-id: $TenantId" `
  -H "x-request-id: req-complete-$SessionEventId" `
  -H "x-trace-id: $TraceId" `
  -d $CompleteBody

$CompleteObj = $CompleteJson | ConvertFrom-Json
$MediaId = $CompleteObj.media_id

Write-Host "5) Inference job (media_id=$MediaId)"
$InferBody = @{
  tenant_id = $TenantId
  farm_id = $FarmId
  barn_id = $BarnId
  device_id = $DeviceId
  session_id = $SessionId
  media_id = $MediaId
} | ConvertTo-Json -Compress

$InferJson = curl -fsS -X POST "$EdgeInferUrl/api/v1/inference/jobs" `
  -H "content-type: application/json" `
  -H "x-tenant-id: $TenantId" `
  -H "x-request-id: req-infer-$SessionEventId" `
  -H "x-trace-id: $TraceId" `
  -d $InferBody

$InferObj = $InferJson | ConvertFrom-Json
$InferenceResultId = $InferObj.inference_result_id
if (-not $InferenceResultId) { $InferenceResultId = $InferObj.job_id }

Write-Host "6) Attach"
$AttachBody = @{
  media_id = $MediaId
  inference_result_id = $InferenceResultId
} | ConvertTo-Json -Compress
curl -fsS -X POST "$EdgeSessionUrl/api/v1/weighvision/sessions/$SessionId/attach" `
  -H "content-type: application/json" `
  -H "x-tenant-id: $TenantId" `
  -H "x-request-id: req-attach-$SessionEventId" `
  -H "x-trace-id: $TraceId" `
  -d $AttachBody | Out-Null

Write-Host "7) Sync state + trigger"
curl -fsS "$EdgeSyncUrl/api/v1/sync/state" | ConvertFrom-Json | ConvertTo-Json
curl -fsS -X POST "$EdgeSyncUrl/api/v1/sync/trigger" | ConvertFrom-Json | ConvertTo-Json

Write-Host "OK: http smoke flow completed (session_id=$SessionId media_id=$MediaId)"
