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

## Internationalization (i18n)

### UI Strings
- **Rule**: Hardcoding Chinese strings in components is strictly forbidden.
- **Context**: The offline orders module originally had many hardcoded Chinese strings, which broke the UI when switching to English.
- **Prevention**:
    1. All UI strings must be placed in a translation dictionary (e.g., `src/translations/*.ts`).
    2. Components must accept a `locale` prop and use a `t()` function or similar helper to retrieve localized text.
    3. Always provide an English (`en`) fallback for any translation key.
    4. When adding new features, use the `t('key')` pattern from the start rather than hardcoding Chinese and fixing it later.
    5. Ensure `locale` is propagated from the top-level page/container down to every child component that renders text.

### Verification
- **Rule**: Test UI in both Chinese and English before submitting changes.
- **Prevention**: Manually switch the application locale in the URL or settings to verify that all strings reflect the correct language and that layouts remain consistent (English text is often longer than Chinese).
