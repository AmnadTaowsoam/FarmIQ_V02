# Edge -> Cloud bootstrap (no code change)

Scripts:
- `apps/scripts/bootstrap-edge-cloud-sync.ps1` (Windows / PowerShell)
- `apps/scripts/bootstrap-edge-cloud-sync.sh` (Linux/macOS/WSL)

What it does:
1. Starts required services on both stacks.
2. Ensures external network `farmiq-net` exists.
3. Connects `cloud-ingestion` with aliases `cloud-ingestion` and `farmiq-cloud-ingestion`.
4. Connects `edge-sync-forwarder` to `farmiq-net`.
5. Upserts `t-001 / f-001 / b-001 / wv-001` into `cloud_tenant_registry`.
6. Optionally injects sample rows into `cloud_weighvision_readmodel`.
7. Restarts edge sync forwarder and prints summary counts.

## PowerShell

```powershell
cd D:\FarmIQ_V02\apps
.\scripts\bootstrap-edge-cloud-sync.ps1
```

## Bash / WSL

```bash
cd /mnt/d/FarmIQ_V02/apps
./scripts/bootstrap-edge-cloud-sync.sh
```

## Optional env vars

- `TENANT_ID` (default `t-001`)
- `FARM_ID` (default `f-001`)
- `BARN_ID` (default `b-001`)
- `DEVICE_ID` (default `wv-001`)
- `INJECT_SAMPLE_READMODEL` (default `true`)

Example:

```powershell
$env:TENANT_ID='t-001'
$env:FARM_ID='f-001'
$env:BARN_ID='b-001'
$env:DEVICE_ID='wv-001'
$env:INJECT_SAMPLE_READMODEL='true'
.\scripts\bootstrap-edge-cloud-sync.ps1
```
