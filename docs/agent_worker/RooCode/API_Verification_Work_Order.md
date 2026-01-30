# Work Order: FarmIQ API Verification & Audit

**Assignee**: RooCode
**Objective**: Systematically verify all API endpoints across the `cloud-layer` microservices and ensure they correct alignment with the Frontend applications (`admin-web`, `dashboard-web`) and the API Gateway configuration.

## Context
We are experiencing issues where Frontend applications fail to communicate with Backend services due to:
1.  Mismatched API paths (e.g., `/api/auth` vs `/api/v1/auth`).
2.  Incorrect Port mappings.
3.  Gateway Proxy misconfigurations.
4.  Token/Auth claim mismatches (e.g. missing `issuer`/`audience`).

## Tasks

### 1. Backend Service Audit
For each service in `cloud-layer`:
- [ ] **Scan Routes**: Identify all defined API endpoints (Method, Path, Request Body, Response).
- [ ] **Check Auth**: Verify middleware requirements (Is Auth required? specific roles?).
- [ ] **Document**: List the "Source of Truth" for valid endpoints.

**Key Services:**
- `cloud-identity-access` (Port 3000)
- `cloud-tenant-registry` (Port 3000)
- `cloud-analytics-service` (Port 8000)
- `cloud-billing-service` (Port 3000)
- `cloud-barn-records-service` (Port 3000)

### 2. API Gateway Verification
- [ ] **Proxy Config**: Check `authProxyRoutes.ts` and `index.ts` in `cloud-api-gateway-bff` (Port 3000/5125).
- [ ] **Routing Logic**: Ensure the Gateway correctly forwards requests to the downstream services (correct Hostnames/Service Names and Ports).

### 3. Frontend Integration Check
For `admin-web` and `dashboard-web`:
- [ ] **Endpoint Definitions**: Audit `src/api/endpoints.ts` (or similar).
- [ ] **Request Logic**: Verify `AuthService.ts` and API clients match the Backend's expected format.
- [ ] **Nginx/Vite Config**: Ensure `proxy` settings in `vite.config.ts` and `nginx.conf` correctly route `/api` requests to the Gateway.

### 4. Deliverables
- [ ] **Discrepancy Report**: A list of mismatched endpoints (Frontend vs Backend).
- [ ] **Fix Requests**: Generate specific code fixes for any broken routes or configs.
- [ ] **Updated Documentation**: Update `API_Documentation.md` (if exists) or create a new summary.
