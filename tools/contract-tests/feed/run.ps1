param()

$BaseUrl = $env:FEED_BASE_URL
if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = "http://localhost:3000" }

$AuthToken = $env:AUTH_TOKEN
$TenantId = $env:TENANT_ID
$FarmId = $env:FARM_ID
$BarnId = $env:BARN_ID
$BatchId = $env:BATCH_ID
$FeedLotId = $env:FEED_LOT_ID

$ReportPath = Join-Path -Path $PSScriptRoot -ChildPath "report.json"

$Results = @()
$Pass = 0
$Fail = 0
$Skip = 0

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail,
    [Nullable[int]]$HttpStatus
  )

  $global:Results += [pscustomobject]@{
    name = $Name
    status = $Status
    detail = $Detail
    httpStatus = $HttpStatus
  }

  switch ($Status) {
    'PASS' { $global:Pass++ }
    'FAIL' { $global:Fail++ }
    'SKIP' { $global:Skip++ }
  }

  Write-Host "$Status - $Name" + ($(if ($Detail) { " :: $Detail" } else { "" }))
}

function Require-Auth {
  param([string]$TestName)
  if ([string]::IsNullOrWhiteSpace($AuthToken)) {
    Add-Result -Name $TestName -Status 'SKIP' -Detail 'missing AUTH_TOKEN' -HttpStatus $null
    return $false
  }
  return $true
}

function Require-Context {
  param([string]$TestName)
  if ([string]::IsNullOrWhiteSpace($TenantId) -or [string]::IsNullOrWhiteSpace($FarmId) -or [string]::IsNullOrWhiteSpace($BarnId)) {
    Add-Result -Name $TestName -Status 'SKIP' -Detail 'missing TENANT_ID/FARM_ID/BARN_ID' -HttpStatus $null
    return $false
  }
  return $true
}

function Invoke-ContractRequest {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Body,
    [hashtable]$Headers
  )

  $requestHeaders = @{ 'Content-Type' = 'application/json' }
  if (-not [string]::IsNullOrWhiteSpace($AuthToken)) { $requestHeaders['Authorization'] = "Bearer $AuthToken" }
  if ($Headers) { $Headers.Keys | ForEach-Object { $requestHeaders[$_] = $Headers[$_] } }

  try {
    if ([string]::IsNullOrWhiteSpace($Body)) {
      $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $requestHeaders -SkipHttpErrorCheck
    } else {
      $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $requestHeaders -Body $Body -SkipHttpErrorCheck
    }
    return $response
  } catch {
    return $_.Exception.Response
  }
}

function Try-ParseJson {
  param([string]$Payload)
  try {
    return $Payload | ConvertFrom-Json -ErrorAction Stop
  } catch {
    return $null
  }
}

function Validate-ErrorEnvelope {
  param($Json)
  if ($null -eq $Json) { return $false }
  return ($Json.error -ne $null -and $Json.error.code -and $Json.error.message -and $Json.error.traceId)
}

function Validate-Pagination {
  param($Json)
  if ($null -eq $Json) { return $false }
  if ($Json.items -ne $null -and ($Json.PSObject.Properties.Name -contains 'nextCursor' -or $Json.PSObject.Properties.Name -contains 'next_cursor')) { return $true }
  return $false
}

function Load-Template {
  param([string]$Path)
  $content = Get-Content -Raw -Path $Path
  $content = $content -replace '__TENANT_ID__', $TenantId
  $content = $content -replace '__FARM_ID__', $FarmId
  $content = $content -replace '__BARN_ID__', $BarnId
  $content = $content -replace '__BATCH_ID__', $BatchId
  $content = $content -replace '__FEED_LOT_ID__', $FeedLotId
  $content = $content -replace '__OCCURRED_AT__', $OccurredAt
  $content = $content -replace '__DELIVERED_AT__', $DeliveredAt
  $content = $content -replace '__SAMPLED_AT__', $SampledAt
  $content = $content -replace '__RECEIVED_DATE__', $ReceivedDate
  return $content
}

$OccurredAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$DeliveredAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$SampledAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$ReceivedDate = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')

Write-Host "Contract Tests: cloud-feed-service"
Write-Host "Base URL: $BaseUrl"

# Health
$response = Invoke-ContractRequest -Method 'GET' -Url "$BaseUrl/api/health" -Body '' -Headers @{}
if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
  Add-Result -Name 'GET /api/health' -Status 'PASS' -Detail 'ok' -HttpStatus $response.StatusCode
} else {
  Add-Result -Name 'GET /api/health' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
}

# Ready
$response = Invoke-ContractRequest -Method 'GET' -Url "$BaseUrl/api/ready" -Body '' -Headers @{}
if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
  Add-Result -Name 'GET /api/ready' -Status 'PASS' -Detail 'ok' -HttpStatus $response.StatusCode
} else {
  Add-Result -Name 'GET /api/ready' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
}

# Intake create idempotency
if (Require-Auth 'POST /api/v1/feed/intake-records' -and Require-Context 'POST /api/v1/feed/intake-records') {
  $idempotencyKey = "ct-intake-$([guid]::NewGuid())"
  $body = Load-Template -Path (Join-Path $PSScriptRoot 'requests/intake-create.json')
  $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/intake-records" -Body $body -Headers @{ 'Idempotency-Key' = $idempotencyKey }
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
    $id1 = $json.id
    if (-not $id1) {
      Add-Result -Name 'POST /api/v1/feed/intake-records' -Status 'FAIL' -Detail 'missing id' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'POST /api/v1/feed/intake-records' -Status 'PASS' -Detail "created id $id1" -HttpStatus $response.StatusCode
      $response2 = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/intake-records" -Body $body -Headers @{ 'Idempotency-Key' = $idempotencyKey }
      $json2 = Try-ParseJson -Payload $response2.Content
      if ($response2.StatusCode -ge 200 -and $response2.StatusCode -lt 300 -and $null -ne $json2) {
        $id2 = $json2.id
        if ($id1 -eq $id2) {
          Add-Result -Name 'Idempotency-Key intake retry' -Status 'PASS' -Detail 'same id' -HttpStatus $response2.StatusCode
        } else {
          Add-Result -Name 'Idempotency-Key intake retry' -Status 'FAIL' -Detail 'different id' -HttpStatus $response2.StatusCode
        }
      } else {
        Add-Result -Name 'Idempotency-Key intake retry' -Status 'FAIL' -Detail "status $($response2.StatusCode)" -HttpStatus $response2.StatusCode
      }
    }
  } else {
    Add-Result -Name 'POST /api/v1/feed/intake-records' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
  }
}

# Intake list
if (Require-Auth 'GET /api/v1/feed/intake-records' -and Require-Context 'GET /api/v1/feed/intake-records') {
  $response = Invoke-ContractRequest -Method 'GET' -Url "$BaseUrl/api/v1/feed/intake-records?tenantId=$TenantId&limit=2" -Body '' -Headers @{}
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
    if (Validate-Pagination -Json $json) {
      Add-Result -Name 'GET /api/v1/feed/intake-records' -Status 'PASS' -Detail 'pagination ok' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'GET /api/v1/feed/intake-records' -Status 'FAIL' -Detail 'missing pagination fields' -HttpStatus $response.StatusCode
    }
  } else {
    Add-Result -Name 'GET /api/v1/feed/intake-records' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
  }
}

# Intake error case
if (Require-Auth 'POST /api/v1/feed/intake-records invalid' -and Require-Context 'POST /api/v1/feed/intake-records invalid') {
  $invalidBody = (Load-Template -Path (Join-Path $PSScriptRoot 'requests/intake-create.json')) -replace '"quantityKg":\s*\d+(\.\d+)?', '"quantityKg": -1'
  $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/intake-records" -Body $invalidBody -Headers @{ 'Idempotency-Key' = 'ct-intake-invalid' }
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -ge 400 -and $response.StatusCode -lt 500 -and (Validate-ErrorEnvelope -Json $json)) {
    Add-Result -Name 'POST /api/v1/feed/intake-records invalid' -Status 'PASS' -Detail 'error envelope' -HttpStatus $response.StatusCode
  } else {
    Add-Result -Name 'POST /api/v1/feed/intake-records invalid' -Status 'FAIL' -Detail 'expected 4xx with error envelope' -HttpStatus $response.StatusCode
  }
}

# Feed lot create
$LotId = ''
if (Require-Auth 'POST /api/v1/feed/lots' -and Require-Context 'POST /api/v1/feed/lots') {
  $body = Load-Template -Path (Join-Path $PSScriptRoot 'requests/lot-create.json')
  $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/lots" -Body $body -Headers @{ 'Idempotency-Key' = 'ct-lot-1' }
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'POST /api/v1/feed/lots' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
    $LotId = $json.id
    if ($LotId) {
      Add-Result -Name 'POST /api/v1/feed/lots' -Status 'PASS' -Detail "created id $LotId" -HttpStatus $response.StatusCode
      $FeedLotId = $LotId
    } else {
      Add-Result -Name 'POST /api/v1/feed/lots' -Status 'FAIL' -Detail 'missing id' -HttpStatus $response.StatusCode
    }
  } else {
    Add-Result -Name 'POST /api/v1/feed/lots' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
  }
}

# Feed lot list
if (Require-Auth 'GET /api/v1/feed/lots' -and Require-Context 'GET /api/v1/feed/lots') {
  $response = Invoke-ContractRequest -Method 'GET' -Url "$BaseUrl/api/v1/feed/lots?tenantId=$TenantId&limit=2" -Body '' -Headers @{}
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'GET /api/v1/feed/lots' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
    if (Validate-Pagination -Json $json) {
      Add-Result -Name 'GET /api/v1/feed/lots' -Status 'PASS' -Detail 'pagination ok' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'GET /api/v1/feed/lots' -Status 'FAIL' -Detail 'missing pagination fields' -HttpStatus $response.StatusCode
    }
  } else {
    Add-Result -Name 'GET /api/v1/feed/lots' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
  }
}

# Feed lot error case
if (Require-Auth 'POST /api/v1/feed/lots invalid' -and Require-Context 'POST /api/v1/feed/lots invalid') {
  $invalidBody = (Load-Template -Path (Join-Path $PSScriptRoot 'requests/lot-create.json')) -replace '"lotCode":\s*"[^"]+"', '"lotCode": ""'
  $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/lots" -Body $invalidBody -Headers @{ 'Idempotency-Key' = 'ct-lot-invalid' }
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'POST /api/v1/feed/lots invalid' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 400 -and $response.StatusCode -lt 500 -and (Validate-ErrorEnvelope -Json $json)) {
    Add-Result -Name 'POST /api/v1/feed/lots invalid' -Status 'PASS' -Detail 'error envelope' -HttpStatus $response.StatusCode
  } else {
    Add-Result -Name 'POST /api/v1/feed/lots invalid' -Status 'FAIL' -Detail 'expected 4xx with error envelope' -HttpStatus $response.StatusCode
  }
}

# Feed delivery create
if (Require-Auth 'POST /api/v1/feed/deliveries' -and Require-Context 'POST /api/v1/feed/deliveries') {
  if ([string]::IsNullOrWhiteSpace($FeedLotId)) {
    Add-Result -Name 'POST /api/v1/feed/deliveries' -Status 'SKIP' -Detail 'missing FEED_LOT_ID' -HttpStatus $null
  } else {
    $body = Load-Template -Path (Join-Path $PSScriptRoot 'requests/delivery-create.json')
    $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/deliveries" -Body $body -Headers @{ 'Idempotency-Key' = 'ct-delivery-1' }
    $json = Try-ParseJson -Payload $response.Content
    if ($response.StatusCode -eq 404) {
      Add-Result -Name 'POST /api/v1/feed/deliveries' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
    } elseif ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
      Add-Result -Name 'POST /api/v1/feed/deliveries' -Status 'PASS' -Detail 'created' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'POST /api/v1/feed/deliveries' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
    }
  }
}

# Feed delivery list
if (Require-Auth 'GET /api/v1/feed/deliveries' -and Require-Context 'GET /api/v1/feed/deliveries') {
  $response = Invoke-ContractRequest -Method 'GET' -Url "$BaseUrl/api/v1/feed/deliveries?tenantId=$TenantId&limit=2" -Body '' -Headers @{}
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'GET /api/v1/feed/deliveries' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
    if (Validate-Pagination -Json $json) {
      Add-Result -Name 'GET /api/v1/feed/deliveries' -Status 'PASS' -Detail 'pagination ok' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'GET /api/v1/feed/deliveries' -Status 'FAIL' -Detail 'missing pagination fields' -HttpStatus $response.StatusCode
    }
  } else {
    Add-Result -Name 'GET /api/v1/feed/deliveries' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
  }
}

# Feed delivery error case
if (Require-Auth 'POST /api/v1/feed/deliveries invalid' -and Require-Context 'POST /api/v1/feed/deliveries invalid') {
  $invalidBody = (Load-Template -Path (Join-Path $PSScriptRoot 'requests/delivery-create.json')) -replace '"feedLotId":\s*"[^"]+"', '"feedLotId": ""'
  $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/deliveries" -Body $invalidBody -Headers @{ 'Idempotency-Key' = 'ct-delivery-invalid' }
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'POST /api/v1/feed/deliveries invalid' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 400 -and $response.StatusCode -lt 500 -and (Validate-ErrorEnvelope -Json $json)) {
    Add-Result -Name 'POST /api/v1/feed/deliveries invalid' -Status 'PASS' -Detail 'error envelope' -HttpStatus $response.StatusCode
  } else {
    Add-Result -Name 'POST /api/v1/feed/deliveries invalid' -Status 'FAIL' -Detail 'expected 4xx with error envelope' -HttpStatus $response.StatusCode
  }
}

# Feed quality create
if (Require-Auth 'POST /api/v1/feed/quality-results' -and Require-Context 'POST /api/v1/feed/quality-results') {
  if ([string]::IsNullOrWhiteSpace($FeedLotId)) {
    Add-Result -Name 'POST /api/v1/feed/quality-results' -Status 'SKIP' -Detail 'missing FEED_LOT_ID' -HttpStatus $null
  } else {
    $body = Load-Template -Path (Join-Path $PSScriptRoot 'requests/quality-create.json')
    $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/quality-results" -Body $body -Headers @{ 'Idempotency-Key' = 'ct-quality-1' }
    $json = Try-ParseJson -Payload $response.Content
    if ($response.StatusCode -eq 404) {
      Add-Result -Name 'POST /api/v1/feed/quality-results' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
    } elseif ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
      Add-Result -Name 'POST /api/v1/feed/quality-results' -Status 'PASS' -Detail 'created' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'POST /api/v1/feed/quality-results' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
    }
  }
}

# Feed quality list
if (Require-Auth 'GET /api/v1/feed/quality-results' -and Require-Context 'GET /api/v1/feed/quality-results') {
  $response = Invoke-ContractRequest -Method 'GET' -Url "$BaseUrl/api/v1/feed/quality-results?tenantId=$TenantId&limit=2" -Body '' -Headers @{}
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'GET /api/v1/feed/quality-results' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $null -ne $json) {
    if (Validate-Pagination -Json $json) {
      Add-Result -Name 'GET /api/v1/feed/quality-results' -Status 'PASS' -Detail 'pagination ok' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'GET /api/v1/feed/quality-results' -Status 'FAIL' -Detail 'missing pagination fields' -HttpStatus $response.StatusCode
    }
  } else {
    Add-Result -Name 'GET /api/v1/feed/quality-results' -Status 'FAIL' -Detail "status $($response.StatusCode)" -HttpStatus $response.StatusCode
  }
}

# Feed quality error case
if (Require-Auth 'POST /api/v1/feed/quality-results invalid' -and Require-Context 'POST /api/v1/feed/quality-results invalid') {
  $invalidBody = (Load-Template -Path (Join-Path $PSScriptRoot 'requests/quality-create.json')) -replace '"feedLotId":\s*"[^"]+"', '"feedLotId": ""'
  $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/quality-results" -Body $invalidBody -Headers @{ 'Idempotency-Key' = 'ct-quality-invalid' }
  $json = Try-ParseJson -Payload $response.Content
  if ($response.StatusCode -eq 404) {
    Add-Result -Name 'POST /api/v1/feed/quality-results invalid' -Status 'SKIP' -Detail 'endpoint not found' -HttpStatus $null
  } elseif ($response.StatusCode -ge 400 -and $response.StatusCode -lt 500 -and (Validate-ErrorEnvelope -Json $json)) {
    Add-Result -Name 'POST /api/v1/feed/quality-results invalid' -Status 'PASS' -Detail 'error envelope' -HttpStatus $response.StatusCode
  } else {
    Add-Result -Name 'POST /api/v1/feed/quality-results invalid' -Status 'FAIL' -Detail 'expected 4xx with error envelope' -HttpStatus $response.StatusCode
  }
}

# Forbidden case
if (Require-Context 'POST /api/v1/feed/intake-records forbidden') {
  if ([string]::IsNullOrWhiteSpace($AuthToken)) {
    Add-Result -Name 'POST /api/v1/feed/intake-records forbidden' -Status 'SKIP' -Detail 'missing AUTH_TOKEN' -HttpStatus $null
  } else {
    $body = Load-Template -Path (Join-Path $PSScriptRoot 'requests/intake-create.json')
    $response = Invoke-ContractRequest -Method 'POST' -Url "$BaseUrl/api/v1/feed/intake-records" -Body $body -Headers @{ 'Idempotency-Key' = 'ct-intake-forbidden' }
    $json = Try-ParseJson -Payload $response.Content
    if ($response.StatusCode -eq 403 -and (Validate-ErrorEnvelope -Json $json)) {
      Add-Result -Name 'POST /api/v1/feed/intake-records forbidden' -Status 'PASS' -Detail 'forbidden' -HttpStatus $response.StatusCode
    } else {
      Add-Result -Name 'POST /api/v1/feed/intake-records forbidden' -Status 'FAIL' -Detail 'expected 403' -HttpStatus $response.StatusCode
    }
  }
}

$summary = [pscustomobject]@{ pass = $Pass; fail = $Fail; skip = $Skip }
$report = [pscustomobject]@{ summary = $summary; tests = $Results }
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $ReportPath

Write-Host "----"
Write-Host "Summary: PASS=$Pass FAIL=$Fail SKIP=$Skip"
Write-Host "Report: $ReportPath"
