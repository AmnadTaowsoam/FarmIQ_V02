Purpose: Quick verification checklist for in-app notifications (service → BFF → dashboard-web).  
Owner: FarmIQ Release Team  
Last updated: 2025-12-27  

---

# Notifications Evidence (MVP)

## Preconditions

- Dev stack running:
  - `docker compose -f cloud-layer/docker-compose.yml -f cloud-layer/docker-compose.dev.yml up -d`
- A valid JWT for a tenant and one of the required roles:
  - Inbox/History: `tenant_admin|farm_manager|house_operator|viewer`
  - Send: `tenant_admin|farm_manager`
- BFF reachable: `http://localhost:5125/api/health`

## 1) Health checks

```bash
curl -sS http://localhost:5128/api/health
curl -sS http://localhost:5125/api/health
```

Expected: `200`.

## 2) Create a test in-app notification (via BFF)

```bash
export RID="$(uuidgen)"

curl -sS -X POST "http://localhost:5125/api/v1/notifications/send?tenantId=$TENANT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID" \
  -H "idempotency-key: TEST:$TENANT:1" \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"'"$TENANT"'",
    "severity":"info",
    "channel":"in_app",
    "title":"Test notification",
    "message":"Hello from BFF",
    "externalRef":"TEST:1",
    "targets":[{"type":"role","value":"tenant_admin"}],
    "payload":{"type":"system","link":"/notifications"}
  }'
```

Expected:
- `201` (or `200` if deduped)
- JSON with `notificationId`, `createdAt`

## 3) Verify inbox list (via BFF)

```bash
curl -sS "http://localhost:5125/api/v1/notifications/inbox?tenantId=$TENANT&limit=25" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID"
```

Expected (BFF normalized list shape):
- `data[]` contains a notification matching the title/message
- `meta.cursor`, `meta.limit`, `meta.hasNext`

## 4) Verify history list (via BFF)

```bash
curl -sS "http://localhost:5125/api/v1/notifications/history?tenantId=$TENANT&channel=in_app&limit=25" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID"
```

Expected:
- Notification appears in `data[]`

## 5) Dashboard-web UI verification

1) Open: `http://localhost:5142`
2) Confirm the notification bell shows a badge count (if unread semantics exist for your dataset).
3) Open the drawer and confirm a recent item appears.
4) Click “View All Notifications” to open `/notifications`.

Notes:
- “read/unread” tracking is not implemented in the notification service contract yet; badge behavior may depend on UI fallback and data.

Back to evidence index: `docs/evidence/README.md`

