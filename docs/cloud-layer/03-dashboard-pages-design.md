# FarmIQ Page Design & Inventory

**Purpose**: Comprehensive page inventory, routing, and testing strategy.  
**Scope**: `dashboard-web` and `admin-console` page definitions.  
**Owner**: FarmIQ Frontend Team  
**Last updated**: 2025-12-20  

---

## 1. Application Structure

### 1.1 `dashboard-web` (Port 5130)
*   **Target Users**: Farm Manager, Operator, Viewer.
*   **Backend**: `cloud-api-gateway-bff` (Primary).
*   **Auth**: JWT (Tenant Scoped).

### 1.2 `admin-console` (Port 5131)
*   **Target Users**: Platform Admin, Tenant Admin.
*   **Backend**: `cloud-tenant-registry` (Direct).
*   **Auth**: JWT (Admin Role Required).

---

## 2. Dashboard-Web Inventory

### 2.1 Auth & Access
*   **/login**: Email/Password. Direct call to Identity Service.
*   **/select-tenant** & **/select-farm**: Context switching. Stores context in AppState.

### 2.2 Operations
*   **/overview**: High-level KPIs.
    *   *Realtime*: Poll 60s.
    *   *Auth*: `tenant_scoped`.
*   **/farms/:farmId**: Farm summary.
*   **/barns/:barnId**: Barn detail (Realtime Charts).
    *   *Realtime*: Poll 30s.
    *   *Data*: Telemetry, Device Grid, Sessions.
*   **/devices**: Searchable list. Server-side pagination.
*   **/devices/:deviceId**: Detailed telemetry history.

### 2.3 Features
*   **/telemetry**: Explorer view. Advanced filters.
*   **/sessions (WeighVision)**: Image/Weight verification.
*   **/alerts**: Ack/Resolve alerts.
    *   *Permission*: `farm_manager` or higher to Acknowledge.

---

## 3. Admin-Console Inventory

### 3.1 Platform Management
*   **/tenants**: Create/Edit Tenants.
    *   *Role*: `platform_admin`.
*   **/farms**: Provision Farms.
    *   *Role*: `tenant_admin` or `platform_admin`.

### 3.2 Device Provisioning
*   **/devices**: Inventory management.
    *   *Action*: "Provision New Device" (Link Serial -> Farm).

---

## 4. API Dependency Matrix (BFF Rules)

| Page | Service | Endpoint Example |
| :--- | :--- | :--- |
| **Login** | Identity | `POST /auth/login` |
| **Overview** | BFF | `GET /dashboard/overview` |
| **Barn Detail** | BFF | `GET /dashboard/barns/:id` |
| **Devices** | BFF | `GET /dashboard/devices` |
| **Telemetry** | BFF | `GET /telemetry/readings` |
| **Admin Tenants**| Registry | `GET /tenants` |

---

## 5. Cross-cutting Requirements

### 5.1 Realtime Strategy (Per Page)
*   **Overview**: 60s Poll.
*   **Barn Detail**: 30s Poll (Telemetry).
*   **Device Status**: 30s Poll.
*   *Note*: Pause on hidden tab.

### 5.2 Error Handling
*   **401**: Redirect Login.
*   **403**: Show "Not Authorized".
*   **404**: Show "Resource Not Found".

---

## 6. Implementation Checklist & Phasing

### Phase 1: MVP Core
- [ ] Auth Flow (Login, Token Mgmt).
- [ ] Context Selection (Tenant/Farm).
- [ ] Dashboard Overview (Read-only).
- [ ] Barn Detail (Telemetry Charts).
- [ ] Device List.

### Phase 2: Operations
- [ ] WeighVision Sessions.
- [ ] Alerts Management (Ack/Resolve).
- [ ] Admin: Tenant/Farm Provisioning.

### Phase 3: Advanced
- [ ] Analytics & Anomalies.
- [ ] User Settings.

---

## 7. Testing Strategy

All Frontend PRs must pass the following layers of testing before merge.

### 7.1 Unit Tests (Vitest)
*   **Scope**: Utils, Hooks, shared UI components.
*   **Target**: > 80% Coverage for `src/utils` and `src/hooks`.
*   **Mocking**: Mock all API calls and browser APIs (localStorage).

### 7.2 Integration Tests (React Testing Library + MSW)
*   **Scope**: Full Page render, User flows (Form submit, Filter change).
*   **Mocking**: Use **MSW (Mock Service Worker)** to simulate BFF responses.
*   **Scenarios**:
    *   Render Loading State.
    *   Render Data State (verify fields).
    *   Render Error State (verify retry button).
    *   Verify Empty State.

### 7.3 End-to-End (E2E) Tests (Playwright)
*   **Scope**: Critical User Journeys (Happy Paths).
*   **Environment**: Staging (or Local with Docker).
*   **Required Scenarios**:
    1.  **Login Flow**: Login -> Select Tenant -> Land on Overview.
    2.  **Navigation**: Overview -> Barn Detail -> Device Detail.
    3.  **Data Viz**: Charts render (canvas exists).
    4.  **Resilience**: Token expiry handled (refresh flow).
    5.  **Access Control**: Operator cannot see Admin pages.

### 7.4 Definition of Done (DoD)
- [ ] Component implemented using Design System tokens.
- [ ] Responsive check (Mobile/Desktop).
- [ ] Unit/Integration tests passed.
- [ ] Lint/Prettier clean.
- [ ] PR Title follows Conventional Commits.
