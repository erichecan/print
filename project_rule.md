# Project Rules & Best Practices

This document records important rules, conventions, and lessons learned to ensure code quality and prevent recurring issues.

## API Consistency

### HTTP Methods (PUT vs PATCH)
- **Rule**: strict verifcation of HTTP methods between Frontend and Backend is required.
- **Context**: We encountered a bug where the Frontend `updateProfile` call failed because it used `PATCH` while the Backend route was defined as `PUT`.
    - Frontend: `apps/web/src/lib/api.ts`
    - Backend: `backend/src/routes/*.js`
- **Root Cause**: Inconsistency between the client-side API definition and server-side route configuration.
- **Prevention**:
    1. When updating API endpoints, **always** open both the Frontend `api.ts` and the corresponding Backend route file side-by-side to verify the method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and the path.
    2. Be especially careful with `update` operations, as they might be implemented as either `PUT` (replace) or `PATCH` (partial update). Do not assume one or the other; check the code.
    3. If changing a method in the backend, immediately search for all usages in the frontend to update them.

## Route Definitions
- Backend routes are located in: `backend/src/routes/`
- Frontend API clients are centralized in: `apps/web/src/lib/api.ts`
