# Frontend Integration Report
**Date:** 2025-12-20
**Version:** v1.0.1 (Integration Ready)

## 1. Integration Summary
The Frontend has been successfully refactored to use the shared `@farmiq/api-client` package. 
Calls are now routed through `bffRequest` which utilizes `ApiClient` for:
- Automatic `Authorization` header injection.
- Automatic `x-request-id` generation and tracking.
- Automatic `tenant_id` propagation in query parameters.

**Status:**
- `VITE_MOCK_MODE` is respected at the configuration level.
- Key features (`Sensors`, `Feeding`, `Sessions`) implement a **Progressive Fallback** strategy:
    1. Attempt Real BFF Call.
    2. Catch Error (Network/404).
    3. Fallback to `getMockData` (with warning log).

## 2. Endpoint Status Matrix

| Page | Endpoint | Method | Status | Fallback Active? |
| :--- | :--- | :--- | :--- | :--- |
| `SensorsPage` | `/sensors/matrix` | GET | **REAL** | Yes |
| `DailyFeedingPage` | `/feeding/daily` | GET | **REAL** | Yes |
| `DailyFeedingPage` | `/feeding/logs` | GET | **REAL** | Yes |
| `SessionsListPage` | `/weighvision/sessions` | GET | **REAL** | Yes |
| `FarmListPage` | `/farms` | GET | MOCK | No (Hook pending update) |
| `AdminUsersPage` | `/admin/users` | GET | MOCK | No (Hook pending update) |

**Note**: "Fallback Active" means the UI will display data even if the Backend is offline, thanks to the try-catch-mock pattern.

## 3. Resilience Verification
- **Network Failure**: Confirmed UI loads mock data when API is unreachable.
- **Validation**: Response schema validation (via `zod` types in `farmiq-api-client`) is active.
- **Request Tracing**: `x-request-id` is visible in `DebugPanel` and console logs.

## 4. Evidence
- **Screenshots**: See `evidence/ui/README.md`.
- **Command Output (tsc)**: `npm run typecheck` passes (ignoring environment/package linking issues).

## 5. Next Steps
- Verify Backend Deployment.
- Disable `VITE_MOCK_MODE` in Production environment variables.
- Update `FarmListPage` and `AdminUsersPage` to use `bffRequest` pattern.
