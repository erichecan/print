# Antigravity: GCP Deployment & Debugging Handbook

This document summarizes the lessons learned from recurring 500 errors when deploying to Google Cloud Platform (GCP). It explains why code that works locally often fails in production and provides a checklist to prevent these issues.

## 🛑 Why 500 Errors Happen on GCP (but not Locally)

The "It works on my machine" syndrome typically stems from these key differences:

### 1. Database Schema Drift (The #1 Killer)
*   **Symptom**: "Column not found", "Relation does not exist", or generic 500 on save/submit.
*   **Cause**: You modified `schema.prisma` locally and ran `prisma migrate dev`. On GCP, the `AUTO_MIGRATE` logic runs `prisma migrate deploy`.
*   **Critical Risk**: In `server.js`, the migration logic is wrapped in a `try...catch` block that **logs a warning but allows the server to start even if migrations fail**.
    *   *Result*: The app is "healthy" (green check), but crashes instantly when you try to write to a missing column.
*   **Fix**: Check Cloud Run logs immediately after deployment for "Database migrations failed".

### 2. Missing Environment Variables
*   **Symptom**: Crash on specific actions (e.g., Stripe payment, Image upload).
*   **Cause**: Local `.env` has keys that were not added to **GCP Secrets Manager** or **Cloud Run Environment Variables**.
*   **Gotcha**: `NEXT_PUBLIC_API_URL` is hardcoded in `cloudbuild.yaml` (line 83) and `deploy_clean.sh`. If you change the backend service name, the frontend breaks.

### 3. File System is Read-Only
*   **Symptom**: "EROFS: read-only file system".
*   **Cause**: Cloud Run containers are immutable. You cannot write to `./uploads/` or modify files at runtime.
*   **Fix**: All dynamic assets (images) MUST go to Google Cloud Storage (GCS).

### 4. Hardcoded Frontend Build Args
*   **Symptom**: Frontend calls the wrong API URL or uses an old Stripe key.
*   **Cause**: Frontend environment variables (starting with `NEXT_PUBLIC_`) are **baked in at build time**. Changing a secret in GCP *does not update the running frontend* until you **rebuild** the container.

---

## ✅ Deployment Checklist (Do This Before Every Deploy)

### 1. Database Changes?
- [ ] Did you change `schema.prisma`?
- [ ] If yes, run `npx prisma migrate deploy` locally against the **production database** (using proxy or temporary connection) OR ensure `AUTO_MIGRATE=true` is set and monitor logs.
- [ ] **monitor-tip**: Watch the "Logs" tab in Cloud Run during the first 30 seconds of startup.

### 2. New Environment Variables?
- [ ] Did you add a `process.env.NEW_KEY`?
- [ ] **Action**: Add it to `cloudbuild.yaml` (if needed at build time) OR update the Cloud Run service revision with the new variable/secret.

### 3. Frontend Rebuild Required?
- [ ] If you changed `NEXT_PUBLIC_API_URL` or any public config, you **must trigger a fresh Cloud Build**. Simply restarting the service is not enough.

---

## 🛠 How to Debug 500 Errors "Like a Pro"

When you see a "500 Internal Server Error" on the frontend:

1.  **Don't trust the Frontend**: The browser console will just say `500`. It suppresses the real error for security.
2.  **Go to Cloud Run Console**:
    *   Navigate to your backend service (`print-main-backend`).
    *   Click on **Logs**.
    *   Filter by **Severity: Error**.
3.  **Look for "P2xxx" Prisma Errors**:
    *   `P2002`: Unique constraint violation (e.g., duplicate Slug).
    *   `P2025`: Record not found (trying to update a deleted item).
    *   `Column 'x' does not exist`: Migration failed (See Point #1).
4.  **Check for "Timeout"**: if the error happens after exactly 10s or 30s, it's likely a network timeout connecting to the DB or Redis.

---

## 🔄 Common Error Scenarios & Fixes

| Symptom | Likely Cause | Fix |
| :--- | :--- | :--- |
| **Product Create Fails (500)** | Missing `printableArea` or new columns in DB. | Check `AUTO_MIGRATE` logs; Verify schema matches DB. |
| **"Failed to save design"** | `design-lab-default-tee` missing or ID mismatch. | Run the `seedDesignLabProduct` script manually or via API. |
| **Images not loading** | `NEXT_PUBLIC_API_URL` mismatch or CORS. | Verify `cloudbuild.yaml` API URL matches actual backend URL. |
| **Login fails loop** | Cookie domain or `JWT_SECRET` mismatch. | Ensure `JWT_SECRET` is consistent and secure. |

## 🚀 Emergency Command

If you suspect the DB is out of sync and `AUTO_MIGRATE` is failing:

1.  SSH/Proxy into the DB (if possible).
2.  Or, commit a "fix-migration" script that runs raw SQL to patch the missing column.
3.  **Last Resort**: If this is a dev environment, use `npx prisma db push` (careful: can lose data), but `deploy` is safer.
