$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EdgeDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path

function Compose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  docker compose -f (Join-Path $EdgeDir "docker-compose.yml") -f (Join-Path $EdgeDir "docker-compose.dev.yml") @Args
}

$successes = New-Object System.Collections.Generic.List[string]
$failures = New-Object System.Collections.Generic.List[string]

function Run-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  Write-Host ""
  Write-Host "==> $Name"
  try {
    & $Action
    if ($LASTEXITCODE -ne 0) {
      throw "ExitCode=$LASTEXITCODE"
    }
    Write-Host "OK: $Name"
    $successes.Add($Name) | Out-Null
  } catch {
    Write-Host "FAIL: $Name"
    Write-Host $_
    $failures.Add($Name) | Out-Null
  }
}

Write-Host "Edge seeds runner"
Write-Host "EDGE_DIR=$EdgeDir"

Write-Host ""
Write-Host "==> Starting postgres"
Compose up -d postgres | Out-Null

$pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "farmiq" }
$pgDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "farmiq" }

Write-Host "==> Waiting for postgres readiness"
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  docker exec farmiq-edge-postgres pg_isready -U $pgUser -d $pgDb | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  Write-Host "ERROR: Postgres not ready after 60s"
  exit 2
}

Write-Host "==> Ensuring required extensions"
docker exec -i farmiq-edge-postgres psql -U $pgUser -d $pgDb -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";" | Out-Null

$prismaDbServices = @(
  "edge-ingress-gateway",
  "edge-telemetry-timeseries",
  "edge-weighvision-session",
  "edge-media-store",
  "edge-feed-intake"
)

foreach ($svc in $prismaDbServices) {
  Run-Step "$svc:db:migrate" { Compose run --rm --no-deps $svc npm run db:migrate }
  Run-Step "$svc:seed" { Compose run --rm --no-deps $svc npm run seed }
}

Run-Step "edge-policy-sync:db:migrate+seed" { Compose run --rm --no-deps edge-policy-sync sh -lc "npm install --no-audit --no-fund >/dev/null && npm run db:migrate && npm run seed" }

Run-Step "edge-sync-forwarder:db:migrate+seed" { Compose run --rm --no-deps edge-sync-forwarder sh -lc "npm install --no-audit --no-fund >/dev/null && npm run db:migrate && npm run seed" }

Run-Step "edge-vision-inference:seed" { Compose run --rm --no-deps edge-vision-inference python app/seed.py }

Write-Host ""
Write-Host "===================="
Write-Host "Seed summary"
Write-Host "===================="
Write-Host ("SUCCESS: {0}" -f $successes.Count)
foreach ($s in $successes) { Write-Host ("  - {0}" -f $s) }
Write-Host ("FAIL: {0}" -f $failures.Count)
foreach ($f in $failures) { Write-Host ("  - {0}" -f $f) }

if ($failures.Count -ne 0) {
  exit 1
}
