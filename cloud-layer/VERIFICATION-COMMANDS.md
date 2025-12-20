# Verification Commands for New Cloud Services

## Prerequisites

```bash
cd cloud-layer
```

## 1. Build All Services

```bash
docker compose build
```

## 2. Run Prisma Migrations

For each service (config-rules, audit-log), run migrations:

```bash
# Config Rules Service
cd cloud-config-rules-service
npx prisma migrate dev --name init
cd ..

# Audit Log Service
cd cloud-audit-log-service
npx prisma migrate dev --name init
cd ..
```

## 3. Start All Services

```bash
docker compose up -d
```

## 4. Check Health Endpoints

```bash
# Config Rules Service
curl http://localhost:5126/api/health
# Expected: "OK"

# Audit Log Service
curl http://localhost:5127/api/health
# Expected: "OK"

# BFF
curl http://localhost:5125/api/health
# Expected: "OK"
```

## 5. Check Ready Endpoints

```bash
# Config Rules Service
curl http://localhost:5127/api/ready
# Expected: {"status":"ready"}

# Audit Log Service
curl http://localhost:5127/api/ready
# Expected: {"status":"ready"}
```

## 6. Test BFF Proxy Endpoints

### Config Endpoints

```bash
# Get config context
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5125/api/v1/config/context?tenant_id=xxx"

# Get thresholds
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5125/api/v1/config/thresholds?tenant_id=xxx"

# Upsert threshold
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "xxx",
    "metric": "temperature",
    "op": "gt",
    "value": 30.0,
    "severity": "warning"
  }' \
  "http://localhost:5125/api/v1/config/thresholds"

# Get targets
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5125/api/v1/config/targets?tenant_id=xxx"
```

### Audit Endpoints

```bash
# Query audit events
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5125/api/v1/audit/events?tenant_id=xxx&page=1&limit=25"

# Create audit event (via direct service call or BFF internal)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "xxx",
    "actor_id": "user-123",
    "actor_role": "farm_manager",
    "action": "update",
    "resource_type": "threshold",
    "resource_id": "threshold-456",
    "summary": "Updated temperature threshold"
  }' \
  "http://localhost:5127/api/v1/audit/events"
```

## 7. TypeScript Compilation Check

For each service:

```bash
cd cloud-config-rules-service
npm run build
# Expected: tsc completes without errors

cd ../cloud-audit-log-service
npm run build
# Expected: tsc completes without errors
```

## 8. Check Logs

```bash
# Config Rules Service
docker logs farmiq-cloud-config-rules-service

# Audit Log Service
docker logs farmiq-cloud-audit-log-service

# BFF
docker logs farmiq-cloud-api-gateway-bff
```

## Expected Results

- All health endpoints return "OK"
- All ready endpoints return `{"status":"ready"}` (after DB connection established)
- BFF proxy endpoints return proper responses (200 OK with data or appropriate error codes)
- TypeScript compiles without errors
- No runtime crashes in logs

## Troubleshooting

1. **Database connection errors**: Ensure postgres service is running and healthy
2. **Port conflicts**: Check if ports 5126, 5127 are available
3. **Prisma errors**: Run `npx prisma generate` in each service directory
4. **Build errors**: Check Node.js version (requires Node 24+)

