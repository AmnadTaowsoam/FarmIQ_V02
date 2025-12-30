# Evidence Collection Guide for Edge Ops

This guide outlines the standard procedure for collecting evidence when troubleshooting Edge Ops issues. Please attach the following artifacts to your support ticket.

## 1. Quick Collect (Preferred)

Navigate to the **Evidence** tab in the Edge Ops Dashboard.
1.  Click **"Export Diagnostics Bundle"**. This will download a JSON file containing the full system state.
2.  Click **"Copy Support Summary"**. Paste this text into the ticket description.

## 2. Screenshot Checklist

If you cannot export the bundle, please capture screenshots of the following:

- [ ] **Overview Tab**: Full page showing System KPIs and Service Registry.
- [ ] **Ingress Tab**: "Traffic Stats" and "Recent Errors" panels.
- [ ] **Sync Tab**: "Sync Health" panel and "Dead Letter Queue" (if items exist).
- [ ] **Settings**: "Connection Profile" and "Connectivity Status".

## 3. Manual Log Collection (If Dashboard is Down)

If the dashboard is inaccessible, please SSH into the device and run:

```bash
# 1. Check container status
docker ps -a > containers.txt

# 2. Get logs from the observability agent
docker logs edge-observability-agent > agent.log 2>&1

# 3. Get logs from sync forwarder
docker logs edge-sync-forwarder > sync.log 2>&1
```

Attach `containers.txt`, `agent.log`, and `sync.log` to the ticket.
