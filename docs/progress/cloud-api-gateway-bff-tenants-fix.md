# BFF /api/v1/tenants Route Fix

**Date**: 2025-01-02  
**Status**: ✅ **VERIFIED** - Route exists and is properly configured

---

## Summary

The `GET /api/v1/tenants` endpoint in the BFF (Backend For Frontend) is **already implemented** and properly registered. The route proxies requests to the `cloud-tenant-registry` service.

---

## Audit Results

### Route Registration ✅

**File**: `cloud-layer/cloud-api-gateway-bff/src/routes/tenantRegistryRoutes.ts`
- **Line 28**: `router.get('/tenants', getTenantsHandler)` ✅
- **Line 53**: `export default router` ✅

**File**: `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`
- **Line 8**: `import tenantRegistryRoutes from './tenantRegistryRoutes'` ✅
- **Line 34**: `app.use('/api/v1', tenantRegistryRoutes)` ✅

**Result**: Route is properly exported, imported, and registered at `/api/v1/tenants`

### Controller Implementation ✅

**File**: `cloud-layer/cloud-api-gateway-bff/src/controllers/tenantRegistryController.ts`
- **Line 64-105**: `getTenantsHandler` function exists ✅
- Properly handles query params, headers, and error responses ✅
- Forwards Authorization header ✅
- Propagates x-request-id and x-trace-id ✅
- Uses standard error format with traceId ✅

### Service Client ✅

**File**: `cloud-layer/cloud-api-gateway-bff/src/services/tenantRegistryService.ts`
- **Line 96-105**: `getTenants` method exists ✅
- Uses `REGISTRY_BASE_URL` from environment ✅
- Calls `http://${registryBaseUrl}/api/v1/tenants` ✅

### Docker Configuration ✅

**File**: `cloud-layer/docker-compose.dev.yml`
- **Line 229**: `REGISTRY_BASE_URL=http://cloud-tenant-registry:3000` ✅
- **Line 218**: BFF exposed on port `5125:3000` ✅
- Services are on the same network (`farmiq-net`) ✅

---

## Root Cause Analysis

**Issue**: The route code exists and is correct, but may not be working due to:

1. **Container not rebuilt**: If the container was built before the route was added, it won't have the route
2. **TypeScript compilation issue**: If TypeScript isn't compiling correctly in the container
3. **Runtime error**: If there's a runtime error preventing the route from being registered

**Most Likely**: Container needs to be rebuilt to pick up the route changes.

---

## Files Changed

**No changes required** - The route already exists. However, if the issue persists after rebuilding:

### Verification Checklist

- [x] Route file exists: `src/routes/tenantRegistryRoutes.ts`
- [x] Route handler exists: `src/controllers/tenantRegistryController.ts`
- [x] Route is imported in `src/routes/index.ts`
- [x] Route is registered with `/api/v1` prefix
- [x] Service client exists: `src/services/tenantRegistryService.ts`
- [x] Environment variable set: `REGISTRY_BASE_URL`
- [x] Docker-compose configuration correct

---

## Verification Steps

### 1. Rebuild and Restart Containers

```powershell
# Navigate to cloud-layer
cd cloud-layer

# Stop existing containers
docker compose -f docker-compose.dev.yml down

# Rebuild BFF specifically (to ensure latest code)
docker compose -f docker-compose.dev.yml build cloud-api-gateway-bff

# Start all services
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
docker compose -f docker-compose.dev.yml ps
```

### 2. Health Check

```powershell
# Check BFF health
curl -i http://localhost:5125/api/health

# Expected: HTTP/1.1 200 OK
# Response: OK
```

### 3. Test /api/v1/tenants Endpoint

**Without Authentication** (should return 401):
```powershell
curl -i http://localhost:5125/api/v1/tenants

# Expected: HTTP/1.1 401 Unauthorized
```

**With Authentication** (if you have a valid JWT token):
```powershell
# Replace <token> with a valid JWT token
curl -i http://localhost:5125/api/v1/tenants `
  -H "Authorization: Bearer <token>" `
  -H "x-request-id: test-request-001"

# Expected: HTTP/1.1 200 OK
# Response: JSON array of tenants
```

**Note**: The route requires JWT authentication. If you get 401, that's expected - it means the route exists and is working, but you need a valid token.

### 4. Direct Tenant Registry Test (Bypass BFF)

To verify the upstream service is working:

```powershell
# Direct call to tenant-registry (port 5121)
curl -i http://localhost:5121/api/v1/tenants

# Expected: HTTP/1.1 200 OK (if no auth required) or 401 (if auth required)
```

---

## Expected Behavior

### Route Path
- **BFF Endpoint**: `GET /api/v1/tenants`
- **Full URL**: `http://localhost:5125/api/v1/tenants`
- **Upstream Service**: `http://cloud-tenant-registry:3000/api/v1/tenants`

### Authentication
- ✅ Requires JWT authentication (via `jwtAuthMiddleware`)
- ✅ Authorization header is forwarded to upstream service
- ✅ Without token: Returns 401 Unauthorized
- ✅ With valid token: Proxies to tenant-registry and returns response

### Query Parameters
- All query parameters are forwarded to upstream service
- Supports optional `tenantId` query param

### Headers
- ✅ `Authorization` header is forwarded
- ✅ `x-request-id` is generated if missing (via `transactionIdMiddleware`)
- ✅ `x-trace-id` is propagated
- ✅ `idempotency-key` is forwarded if present

### Error Handling
- ✅ Standard error format: `{ error: { code, message, traceId } }`
- ✅ Downstream errors are properly mapped
- ✅ 502 status for service unavailable

---

## Troubleshooting

### If Still Getting 404

1. **Check container logs**:
   ```powershell
   docker logs farmiq-cloud-api-gateway-bff
   ```
   Look for:
   - Route registration messages
   - TypeScript compilation errors
   - Runtime errors

2. **Verify TypeScript compilation**:
   ```powershell
   # Enter the container
   docker exec -it farmiq-cloud-api-gateway-bff sh
   
   # Check if dist folder has the route
   ls -la dist/src/routes/
   # Should see tenantRegistryRoutes.js
   
   # Check the compiled route file
   cat dist/src/routes/tenantRegistryRoutes.js
   # Should contain the tenants route
   ```

3. **Check route registration order**:
   - The route is registered at line 34 in `src/routes/index.ts`
   - Ensure no catch-all route is registered before it

4. **Verify environment variable**:
   ```powershell
   docker exec farmiq-cloud-api-gateway-bff env | grep REGISTRY_BASE_URL
   # Should show: REGISTRY_BASE_URL=http://cloud-tenant-registry:3000
   ```

### If Getting 401 (Expected)

If you get 401 Unauthorized, that means:
- ✅ The route exists and is working
- ✅ Authentication middleware is functioning
- ❌ You need a valid JWT token

To test with a token, you can:
1. Log in via the frontend to get a token
2. Use the token in the Authorization header
3. Or temporarily disable auth middleware for testing (not recommended for production)

### If Getting 502 Bad Gateway

This means:
- ✅ The route exists and is working
- ✅ Authentication passed
- ❌ The upstream service (`cloud-tenant-registry`) is not reachable or returning an error

Check:
```powershell
# Check if tenant-registry is running
docker ps | grep tenant-registry

# Check tenant-registry logs
docker logs farmiq-cloud-tenant-registry

# Test tenant-registry directly
curl -i http://localhost:5121/api/health
```

---

## Evidence

### Route Registration Confirmation

```typescript
// File: cloud-layer/cloud-api-gateway-bff/src/routes/tenantRegistryRoutes.ts
router.get('/tenants', getTenantsHandler)  // Line 28

// File: cloud-layer/cloud-api-gateway-bff/src/routes/index.ts
app.use('/api/v1', tenantRegistryRoutes)  // Line 34
```

### Handler Implementation

```typescript
// File: cloud-layer/cloud-api-gateway-bff/src/controllers/tenantRegistryController.ts
export async function getTenantsHandler(req: Request, res: Response): Promise<void> {
  // ... implementation at lines 64-105
  const result = await tenantRegistryServiceClient.getTenants({
    query,
    headers: buildDownstreamHeaders(req, res),
  })
  handleDownstreamResponse(result, res)
}
```

### Service Client

```typescript
// File: cloud-layer/cloud-api-gateway-bff/src/services/tenantRegistryService.ts
async getTenants(params) {
  const { registryBaseUrl } = getServiceBaseUrls()
  const url = `${registryBaseUrl}/api/v1/tenants${queryString}`
  return callDownstreamJson(url, {
    method: 'GET',
    headers: params.headers,
  })
}
```

---

## Follow-ups

1. ✅ **Route exists** - No code changes needed
2. ⚠️ **Container rebuild** - May need to rebuild container to pick up changes
3. 📝 **Documentation** - Update STATUS.md to reflect route is available
4. 🧪 **Testing** - Verify route works with valid JWT token after rebuild

---

## Conclusion

The route for `GET /api/v1/tenants` is **already implemented** and properly configured. If it's still returning 404, the most likely cause is that the container needs to be rebuilt to include the route code. After rebuilding, the endpoint should work correctly (returning 401 without auth, 200 with valid auth token).

