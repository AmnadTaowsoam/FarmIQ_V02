$ErrorActionPreference = 'Stop'

$TenantId = if ($env:TENANT_ID) { $env:TENANT_ID } else { 't-001' }
$FarmId = if ($env:FARM_ID) { $env:FARM_ID } else { 'f-001' }
$BarnId = if ($env:BARN_ID) { $env:BARN_ID } else { 'b-001' }
$DeviceId = if ($env:DEVICE_ID) { $env:DEVICE_ID } else { 'wv-001' }
$InjectSampleReadmodel = if ($env:INJECT_SAMPLE_READMODEL) { $env:INJECT_SAMPLE_READMODEL } else { 'true' }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir '..\..')
$CloudComposeFile = Join-Path $RootDir 'cloud-layer\docker-compose.dev.yml'
$EdgeComposeFile = Join-Path $RootDir 'edge-layer\docker-compose.dev.yml'

function Write-Log([string]$Message) {
    Write-Host "[bootstrap] $Message"
}

function Get-ContainerName([string]$ComposeFile, [string]$Service) {
    $id = docker compose -f $ComposeFile ps -q $Service
    if (-not $id) { return $null }
    return (docker inspect --format '{{.Name}}' $id).TrimStart('/')
}

function Invoke-CloudSql([string]$Database, [string]$Sql) {
    docker exec -i $script:CloudPostgresContainer psql -U farmiq -d $Database -v ON_ERROR_STOP=1 -c $Sql | Out-Null
}

function Invoke-EdgeSql([string]$Sql) {
    docker exec -i $script:EdgePostgresContainer psql -U farmiq -d farmiq -v ON_ERROR_STOP=1 -c $Sql | Out-Null
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'docker command not found'
}

if (-not (Test-Path $CloudComposeFile) -or -not (Test-Path $EdgeComposeFile)) {
    throw "Compose files not found under $RootDir"
}

Write-Log 'Starting required cloud services'
docker compose -f $CloudComposeFile up -d postgres cloud-ingestion cloud-tenant-registry cloud-weighvision-readmodel cloud-api-gateway-bff | Out-Null

Write-Log 'Starting required edge services'
docker compose -f $EdgeComposeFile up -d postgres edge-sync-forwarder | Out-Null

$null = docker network inspect farmiq-net 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Log 'Creating external network farmiq-net'
    docker network create farmiq-net | Out-Null
}

$script:CloudPostgresContainer = Get-ContainerName -ComposeFile $CloudComposeFile -Service 'postgres'
$CloudIngestionContainer = Get-ContainerName -ComposeFile $CloudComposeFile -Service 'cloud-ingestion'
$script:EdgePostgresContainer = Get-ContainerName -ComposeFile $EdgeComposeFile -Service 'postgres'
$EdgeForwarderContainer = Get-ContainerName -ComposeFile $EdgeComposeFile -Service 'edge-sync-forwarder'

if (-not $script:CloudPostgresContainer -or -not $CloudIngestionContainer -or -not $script:EdgePostgresContainer -or -not $EdgeForwarderContainer) {
    throw 'Could not resolve required containers.'
}

Write-Log 'Connecting cloud-ingestion to farmiq-net with DNS aliases'
docker network disconnect farmiq-net $CloudIngestionContainer *> $null
$null = docker network connect --alias cloud-ingestion --alias farmiq-cloud-ingestion farmiq-net $CloudIngestionContainer 2>$null

Write-Log 'Connecting edge-sync-forwarder to farmiq-net'
$null = docker network connect farmiq-net $EdgeForwarderContainer 2>$null

Write-Log 'Upserting tenant/farm/barn/device into cloud_tenant_registry'
Invoke-CloudSql -Database 'cloud_tenant_registry' -Sql @"
INSERT INTO public.tenants ("id","name","status","type","region","createdAt","updatedAt")
VALUES ('$TenantId','Tenant $TenantId','active','standard','TH',NOW(),NOW())
ON CONFLICT ("id") DO UPDATE SET "updatedAt" = NOW();
"@

Invoke-CloudSql -Database 'cloud_tenant_registry' -Sql @"
INSERT INTO public.farms ("id","tenantId","name","location","status","createdAt","updatedAt")
VALUES ('$FarmId','$TenantId','Farm $FarmId','TH','active',NOW(),NOW())
ON CONFLICT ("id") DO UPDATE SET "tenantId" = EXCLUDED."tenantId", "updatedAt" = NOW();
"@

Invoke-CloudSql -Database 'cloud_tenant_registry' -Sql @"
INSERT INTO public.barns ("id","tenantId","farmId","name","animalType","status","createdAt","updatedAt")
VALUES ('$BarnId','$TenantId','$FarmId','Barn $BarnId','broiler','active',NOW(),NOW())
ON CONFLICT ("id") DO UPDATE SET "tenantId" = EXCLUDED."tenantId", "farmId" = EXCLUDED."farmId", "updatedAt" = NOW();
"@

Invoke-CloudSql -Database 'cloud_tenant_registry' -Sql @"
INSERT INTO public.devices ("id","tenantId","farmId","barnId","batchId","deviceType","serialNo","status","lifecycleState","firmwareVersion","lastHello","healthScore","metadata","createdAt","updatedAt")
VALUES ('$DeviceId','$TenantId','$FarmId','$BarnId',NULL,'weighvision','$DeviceId','active','active','dev',NOW(),100,'{"source":"bootstrap-edge-cloud-sync"}'::jsonb,NOW(),NOW())
ON CONFLICT ("id") DO UPDATE SET "tenantId" = EXCLUDED."tenantId", "farmId" = EXCLUDED."farmId", "barnId" = EXCLUDED."barnId", "updatedAt" = NOW();
"@

if ($InjectSampleReadmodel -eq 'true') {
    $SessionDbId = "$TenantId-$FarmId-$BarnId-demo-db"
    $SessionId = "$TenantId-$FarmId-$BarnId-demo"

    Write-Log 'Injecting sample rows into cloud_weighvision_readmodel'
    Invoke-CloudSql -Database 'cloud_weighvision_readmodel' -Sql @"
INSERT INTO public.weighvision_session ("id","tenantId","farmId","barnId","batchId","stationId","sessionId","startedAt","endedAt","status","createdAt","updatedAt")
VALUES ('$SessionDbId','$TenantId','$FarmId','$BarnId',NULL,NULL,'$SessionId',NOW() - INTERVAL '10 minutes',NOW() - INTERVAL '2 minutes','completed',NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;
"@

    Invoke-CloudSql -Database 'cloud_weighvision_readmodel' -Sql @"
INSERT INTO public.weighvision_measurement ("id","tenantId","sessionId","sessionDbId","ts","weightKg","source","metaJson","createdAt") VALUES
('$SessionDbId-m1','$TenantId','$SessionId','$SessionDbId',NOW() - INTERVAL '9 minutes',1.20,'edge-sync','{}',NOW()),
('$SessionDbId-m2','$TenantId','$SessionId','$SessionDbId',NOW() - INTERVAL '8 minutes',1.26,'edge-sync','{}',NOW()),
('$SessionDbId-m3','$TenantId','$SessionId','$SessionDbId',NOW() - INTERVAL '7 minutes',1.31,'edge-sync','{}',NOW()),
('$SessionDbId-m4','$TenantId','$SessionId','$SessionDbId',NOW() - INTERVAL '6 minutes',1.38,'edge-sync','{}',NOW()),
('$SessionDbId-m5','$TenantId','$SessionId','$SessionDbId',NOW() - INTERVAL '5 minutes',1.42,'edge-sync','{}',NOW())
ON CONFLICT ("id") DO NOTHING;
"@

    Invoke-CloudSql -Database 'cloud_weighvision_readmodel' -Sql @"
INSERT INTO public.weighvision_inference ("id","tenantId","sessionId","sessionDbId","modelVersion","resultJson","ts","createdAt")
VALUES ('$SessionDbId-inf','$TenantId','$SessionId','$SessionDbId','demo-v1','{"confidence":0.99}',NOW() - INTERVAL '4 minutes',NOW())
ON CONFLICT ("id") DO NOTHING;
"@
}

Write-Log 'Restarting edge-sync-forwarder to trigger sync'
docker compose -f $EdgeComposeFile restart edge-sync-forwarder | Out-Null

Write-Log 'Summary'
docker exec -i $script:CloudPostgresContainer psql -U farmiq -d cloud_tenant_registry -v ON_ERROR_STOP=1 -c "SELECT 'tenants' AS entity, count(*) FROM public.tenants WHERE \"id\"='$TenantId' UNION ALL SELECT 'farms', count(*) FROM public.farms WHERE \"tenantId\"='$TenantId' UNION ALL SELECT 'barns', count(*) FROM public.barns WHERE \"tenantId\"='$TenantId' UNION ALL SELECT 'devices', count(*) FROM public.devices WHERE \"tenantId\"='$TenantId';"
docker exec -i $script:CloudPostgresContainer psql -U farmiq -d cloud_weighvision_readmodel -v ON_ERROR_STOP=1 -c "SELECT count(*) AS readmodel_sessions FROM public.weighvision_session WHERE \"tenantId\"='$TenantId' AND \"farmId\"='$FarmId' AND \"barnId\"='$BarnId';"
docker exec -i $script:EdgePostgresContainer psql -U farmiq -d farmiq -v ON_ERROR_STOP=1 -c "SELECT status, count(*) FROM public.sync_outbox WHERE tenant_id='$TenantId' GROUP BY status ORDER BY status;"

Write-Log "Done. Open dashboard and test WeighVision with tenant=$TenantId farm=$FarmId"
