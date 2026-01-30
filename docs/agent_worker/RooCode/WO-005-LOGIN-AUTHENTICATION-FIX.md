# Work Order: WO-005 - Login Authentication Fix

**Owner**: RooCode
**Priority**: P0 - Critical (Login Blocker)
**Status**: Not Started
**Created**: 2025-01-30
**Estimated Effort**: ~8-12 hours

---

## Agent Skills Required

> **Skills Source**: `D:\AgentSkill\CerebraSkills` (symlinked at `.agentskills/skills`)

### Primary Skills

| Category | Skill | Usage |
|----------|-------|-------|
| 03-backend-api | `middleware-patterns` | Auth middleware configuration |
| 03-backend-api | `rest-client-patterns` | API endpoint alignment |
| 02-frontend | `react-query` | Auth state management & API calls |
| 02-frontend | `typescript-types` | Type definitions for auth responses |
| 06-devops | `docker-compose` | Environment variable configuration |

### Secondary Skills

| Category | Skill | Usage |
|----------|-------|-------|
| 03-backend-api | `rate-limiting` | Auth endpoint protection (future) |
| 01-security | `sso-integration` | JWT token handling patterns |
| 16-testing | `api-debugging` | Troubleshooting API issues |
| 17-domain-specific | `multi-tenancy` | Tenant-aware auth context |

### Roo Mode Recommendation

- **Primary Mode**: `code` - For implementing fixes
- **Secondary Mode**: `architect` - If need to understand auth flow first

---

## Objective

แก้ไขปัญหา Login ไม่ได้ในทั้ง Dashboard และ Admin Web เพื่อให้ผู้ใช้สามารถเข้าสู่ระบบได้สำเร็จ

---

## GAP Analysis Summary

ระบบ Login มีปัญหาหลายประการในการเชื่อมต่อระหว่าง Frontend และ Backend Authentication Service

### Root Cause Diagram

```
Frontend (LoginPage)
    ↓ POST /api/v1/auth/login
BFF (cloud-api-gateway-bff)
    ↓ Proxy to identity-access
cloud-identity-access
    ↓ Returns {access_token, refresh_token}
Frontend stores token
    ↓ GET /api/v1/users/me  ❌ WRONG ENDPOINT!
404 Error
    ↓
Login fails with "Invalid credentials" message
```

---

# CRITICAL ISSUES

## Issue 1: Endpoint Mismatch - `/auth/me` vs `/users/me`

**Status**: 🔴 CRITICAL BLOCKER

### Problem Location:

| Component | File | Line | Endpoint |
|-----------|------|------|----------|
| Dashboard endpoints | `apps/dashboard-web/src/api/endpoints.ts` | 14 | `/api/v1/users/me` |
| Admin endpoints | `apps/admin-web/src/api/endpoints.ts` | 14 | `/api/v1/users/me` |
| Backend route | `cloud-layer/cloud-identity-access/src/routes/authRoutes.ts` | 29 | `/api/v1/auth/me` |

### Current Code (WRONG):

**Frontend - endpoints.ts:**
```typescript
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${BASE_PATH}/auth/login`,
  LOGOUT: `${BASE_PATH}/auth/logout`,
  REFRESH: `${BASE_PATH}/auth/refresh`,
  ME: `${BASE_PATH}/users/me`,  // ❌ WRONG - should be /auth/me
  // ...
}
```

**Backend - authRoutes.ts:**
```typescript
router.get('/auth/me', authMiddleware, authController.me);  // ✅ Correct backend endpoint
```

### Fix:

**File: `apps/dashboard-web/src/api/endpoints.ts`**
```typescript
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${BASE_PATH}/auth/login`,
  LOGOUT: `${BASE_PATH}/auth/logout`,
  REFRESH: `${BASE_PATH}/auth/refresh`,
  ME: `${BASE_PATH}/auth/me`,  // ✅ FIXED - matches backend
  // ...
}
```

**File: `apps/admin-web/src/api/endpoints.ts`**
```typescript
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${BASE_PATH}/auth/login`,
  LOGOUT: `${BASE_PATH}/auth/logout`,
  REFRESH: `${BASE_PATH}/auth/refresh`,
  ME: `${BASE_PATH}/auth/me`,  // ✅ FIXED - matches backend
  // ...
}
```

### Acceptance Criteria:
- [ ] `apps/dashboard-web/src/api/endpoints.ts` - ME endpoint changed to `/api/v1/auth/me`
- [ ] `apps/admin-web/src/api/endpoints.ts` - ME endpoint changed to `/api/v1/auth/me`
- [ ] Verify all usages of `API_ENDPOINTS.ME` work correctly

---

## Issue 2: JWT Secret Not Configured

**Status**: 🔴 CRITICAL

### Problem Location:

| File | Line | Issue |
|------|------|-------|
| `cloud-layer/cloud-identity-access/src/controllers/authController.ts` | 7 | Default secret used |
| `cloud-layer/cloud-api-gateway-bff/src/middlewares/authMiddleware.ts` | - | May have different secret |

### Current Code (VULNERABLE):

```typescript
// cloud-identity-access/src/controllers/authController.ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';  // ❌ Insecure default
```

### Fix:

**File: `cloud-layer/cloud-identity-access/src/controllers/authController.ts`**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**File: `cloud-layer/cloud-identity-access/.env.example`**
```env
# JWT Configuration (REQUIRED)
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=generate-with-openssl-rand-base64-32
REFRESH_TOKEN_EXPIRES_IN=7d
```

**File: `cloud-layer/cloud-identity-access/.env` (create if not exists)**
```env
JWT_SECRET=dev-secret-key-change-in-production-farmiq-2025
REFRESH_TOKEN_SECRET=dev-refresh-secret-key-change-in-production-2025
```

### Also ensure consistency in:

**File: `cloud-layer/cloud-api-gateway-bff/.env`**
```env
JWT_SECRET=dev-secret-key-change-in-production-farmiq-2025
```

### Acceptance Criteria:
- [ ] JWT_SECRET required (no default fallback in production)
- [ ] Same JWT_SECRET configured in both cloud-identity-access and cloud-api-gateway-bff
- [ ] .env.example updated with clear instructions
- [ ] Development .env files created with consistent secrets

---

## Issue 3: Mock Mode Logic Operator Bug (Admin-web)

**Status**: 🔴 HIGH

### Problem Location:

**File**: `apps/admin-web/src/services/AuthService.ts` - Line 117

### Current Code (BUG):

```typescript
// WRONG: Operator precedence issue - || has lower precedence than &&
if (import.meta.env.VITE_MOCK_MODE === 'true' || import.meta.env.VITE_MOCK_MODE === true && isMockEmail && isMockPassword) {
  // This ALWAYS triggers if VITE_MOCK_MODE === 'true', ignoring email/password!
}
```

**How it evaluates:**
```
(VITE_MOCK_MODE === 'true') || (VITE_MOCK_MODE === true && isMockEmail && isMockPassword)
```

### Fix:

```typescript
// CORRECT: Add parentheses for proper logic
if ((import.meta.env.VITE_MOCK_MODE === 'true' || import.meta.env.VITE_MOCK_MODE === true) && isMockEmail && isMockPassword) {
  // Only triggers if BOTH mock mode is enabled AND credentials match
}
```

### Acceptance Criteria:
- [ ] Logic operator fixed with proper parentheses
- [ ] Mock mode only activates with correct credentials
- [ ] Verify login still works in mock mode with correct credentials

---

## Issue 4: Missing Seed Data for Test User

**Status**: 🔴 HIGH

### Problem:

LoginPage has default values:
- Email: `admin@farmiq.com`
- Password: `password123`

But the database has no user with these credentials seeded.

### Fix:

**Create/Update seed file: `cloud-layer/cloud-identity-access/prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user for development
  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@farmiq.com' },
    update: {},
    create: {
      email: 'admin@farmiq.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'FarmIQ',
      isActive: true,
      emailVerified: true,
      roles: {
        create: [
          { name: 'super_admin' },
          { name: 'admin' }
        ]
      }
    },
    include: {
      roles: true
    }
  });

  console.log('Seeded admin user:', adminUser.email);

  // Create demo tenant user
  const demoPassword = await bcrypt.hash('demo123', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@farmiq.com' },
    update: {},
    create: {
      email: 'demo@farmiq.com',
      password: demoPassword,
      firstName: 'Demo',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
      tenantId: 'default-tenant',
      roles: {
        create: [
          { name: 'farm_manager' }
        ]
      }
    }
  });

  console.log('Seeded demo user:', demoUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Update package.json:**
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Run seed:**
```bash
cd cloud-layer/cloud-identity-access
npx prisma db seed
```

### Acceptance Criteria:
- [ ] seed.ts created with admin and demo users
- [ ] package.json updated with seed script
- [ ] Database seeded successfully
- [ ] Login works with `admin@farmiq.com` / `password123`

---

## Issue 5: Vite Proxy Configuration Not Working

**Status**: 🟠 MEDIUM

### Problem:

When `VITE_BFF_BASE_URL` is not set (using relative URLs), Vite dev server needs proxy configuration to forward API requests to BFF.

### Current State:

**File: `apps/dashboard-web/.env`**
```env
# VITE_BFF_BASE_URL=  (commented out to use Vite proxy at port 5125)
```

### Fix:

**Verify/Update: `apps/dashboard-web/vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5130,
    proxy: {
      '/api': {
        target: 'http://localhost:5125',  // BFF port
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url);
          });
        }
      }
    }
  }
});
```

**Verify/Update: `apps/admin-web/vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5135,
    proxy: {
      '/api': {
        target: 'http://localhost:5125',  // BFF port
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

### Acceptance Criteria:
- [ ] Vite proxy configured for both dashboard-web and admin-web
- [ ] API requests forwarded to BFF (port 5125)
- [ ] Proxy logging enabled for debugging

---

## Issue 6: CORS Configuration Incomplete

**Status**: 🟠 MEDIUM

### Problem Location:

**File**: `cloud-layer/cloud-api-gateway-bff/src/index.ts` - Lines 26, 38-42

### Current Code:

```typescript
const allowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://localhost:5143',
  'http://localhost:5135'
  // Missing: http://localhost:5130 (dashboard-web default port)
])
```

### Fix:

```typescript
const allowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://localhost:5130',  // ✅ Dashboard Web
  'http://localhost:5135',  // ✅ Admin Web
  'http://localhost:5143',
  'http://localhost:5173',  // ✅ Vite default
])
```

### Acceptance Criteria:
- [ ] All frontend ports included in CORS whitelist
- [ ] No CORS errors in browser console during login

---

## Issue 7: Token Expiry Debug Logging (Security)

**Status**: 🟡 LOW

### Problem:

**File**: `apps/admin-web/src/services/AuthService.ts` - Lines 357-361

Logging sensitive token information to console:

```typescript
console.log('Token Expiry Check:', {
  exp: new Date(exp).toISOString(),
  now: new Date(now).toISOString(),
  diff: exp - now,
  isValid: exp > now
});
```

### Fix:

```typescript
// Remove or guard with environment check
if (import.meta.env.DEV) {
  console.debug('Token expiry:', { isValid: exp > now });
}
```

### Acceptance Criteria:
- [ ] Sensitive token info not logged in production
- [ ] Debug logging guarded by DEV check

---

# IMPLEMENTATION ORDER

| Step | Task | Priority | Effort | Files |
|------|------|----------|--------|-------|
| 1 | Fix endpoint mismatch `/auth/me` | P0 | 30m | 2 files |
| 2 | Configure JWT secrets | P0 | 30m | 4 files |
| 3 | Create seed data | P0 | 1h | 2 files |
| 4 | Fix mock mode logic | P1 | 15m | 1 file |
| 5 | Verify Vite proxy config | P1 | 30m | 2 files |
| 6 | Fix CORS configuration | P1 | 15m | 1 file |
| 7 | Clean up debug logging | P2 | 15m | 1 file |
| 8 | End-to-end testing | P0 | 2h | - |

**Total Estimated: ~5-6 hours**

---

# TEST PLAN

## Manual Testing Steps

### 1. Test Login Flow (Dashboard)

```bash
# Start services
cd cloud-layer && docker compose up -d
cd apps/dashboard-web && npm run dev

# Open browser: http://localhost:5130
# Login with: admin@farmiq.com / password123
```

**Expected:**
- [ ] Login form submits without errors
- [ ] Token received and stored
- [ ] User profile fetched successfully
- [ ] Redirected to dashboard

### 2. Test Login Flow (Admin)

```bash
cd apps/admin-web && npm run dev
# Open browser: http://localhost:5135
# Login with: admin@farmiq.com / password123
```

**Expected:**
- [ ] Login works same as dashboard
- [ ] Admin dashboard loads

### 3. Test Token Refresh

```bash
# Wait for token to expire (or manually expire it)
# Perform any API action
```

**Expected:**
- [ ] Token refreshed automatically
- [ ] No "session expired" errors

### 4. Test Invalid Credentials

```bash
# Try login with wrong password
```

**Expected:**
- [ ] Clear error message displayed
- [ ] No sensitive info in error

### 5. Verify Network Requests

Open browser DevTools > Network tab:

**Expected:**
- [ ] POST `/api/v1/auth/login` returns 200
- [ ] GET `/api/v1/auth/me` returns 200 (not 404!)
- [ ] No CORS errors
- [ ] Authorization header present on protected requests

---

# SUCCESS CRITERIA (Definition of Done)

- [ ] Dashboard login works end-to-end
- [ ] Admin login works end-to-end
- [ ] `/api/v1/auth/me` endpoint returns user profile
- [ ] JWT secrets configured consistently
- [ ] Seed data created for test users
- [ ] Mock mode logic fixed
- [ ] Vite proxy working
- [ ] CORS configured correctly
- [ ] No debug logging in production
- [ ] All manual tests pass

---

# FILES TO MODIFY

| File | Action | Priority |
|------|--------|----------|
| `apps/dashboard-web/src/api/endpoints.ts` | Edit ME endpoint | P0 |
| `apps/admin-web/src/api/endpoints.ts` | Edit ME endpoint | P0 |
| `cloud-layer/cloud-identity-access/.env` | Create/Update JWT_SECRET | P0 |
| `cloud-layer/cloud-identity-access/.env.example` | Update | P0 |
| `cloud-layer/cloud-api-gateway-bff/.env` | Update JWT_SECRET | P0 |
| `cloud-layer/cloud-identity-access/prisma/seed.ts` | Create | P0 |
| `cloud-layer/cloud-identity-access/package.json` | Add seed script | P0 |
| `apps/admin-web/src/services/AuthService.ts` | Fix mock mode logic | P1 |
| `apps/dashboard-web/vite.config.ts` | Verify proxy | P1 |
| `apps/admin-web/vite.config.ts` | Verify proxy | P1 |
| `cloud-layer/cloud-api-gateway-bff/src/index.ts` | Fix CORS | P1 |

---

# RELATED WORK ORDERS

- `WO-002-FE-BE-CONNECTION-FIX.md` - Frontend connectivity issues
- `WO-003-PRODUCTION-READINESS-COMPREHENSIVE.md` - Production readiness
- `WO-004-FINAL-PRODUCTION-GAPS.md` - Final production gaps

---

# NOTES FOR ROOCODE

1. **Start with Issue 1** - The endpoint mismatch is the main blocker
2. **JWT secrets must match** - Both identity-access and BFF need same secret
3. **Seed data is required** - Without test users, login cannot work
4. **Test incrementally** - After each fix, test the login flow
5. **Check browser DevTools** - Network tab will show exactly which request fails

## Recommended Mode: `code`

Use `code` mode for implementation. Use `architect` mode if you need to understand the authentication flow better before making changes.
