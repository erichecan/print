# GCP Deployment Guide

This guide explains how to deploy the application to Google Cloud Platform (GCP) and configure automated builds.

## 1. Automated Deployment (Cloud Build)

Setting up a Cloud Build Trigger allows you to deploy automatically whenever you push code to GitHub.

### Prerequisites
- A Google Cloud Platform Project (e.g., `print-ecom-monorepo`)
- Cloud Build API enabled
- GitHub repository connected to Cloud Build

### Steps to Configure Trigger
1.  Go to the **[Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)** page in the Google Cloud Console.
2.  Click **Create Trigger**.
3.  **Name**: `deploy-main` (or similar)
4.  **Region**: Select your region (e.g., `us-central1` or `global`).
5.  **Event**: Select **Push to a branch**.
6.  **Source**:
    *   **Repository**: Select your GitHub repository.
    *   **Branch**: `^main$` (matches the `main` branch).
7.  **Configuration**:
    *   **Type**: **Cloud Build configuration file (yaml or json)**
    *   **Location**: `cloudbuild.yaml` (ensure this file is in the root of your repo).
8.  **Substitution Variables** (Optional):
    *   If your `cloudbuild.yaml` expects variables like `_REGION` or `project-id` (though `PROJECT_ID` is automatic), check if you need to override them.
9.  Click **Create**.

### Testing the Trigger
1.  Make a small change to a file (e.g., README) or push your new seed script.
2.  Commit and push to `main`: `git push origin main`.
3.  Watch the build start automatically in the **Cloud Build Dashboard**.

---

## 2. Manual Deployment (Command Line)

If you prefer to deploy manually or need to debug:

```bash
# Ensure you are logged in
gcloud auth login

# Set your project
gcloud config set project [YOUR_PROJECT_ID]

# Submit the build manually using cloudbuild.yaml
gcloud builds submit --config cloudbuild.yaml .
```

---

## 3. Database Seeding (Post-Deployment)

The database does **not** automatically seed new data (like 2XL-5XL pricing) on every deploy to avoid overwriting production data. You must run the seed script manually once.

### Option A: Run Locally (Recommended)
If you have access to the production database from your machine (via proxy or public IP):

```bash
# Run the specific Size Pricing seed script
# Ensure DATABASE_URL in .env points to your remote DB
npm run db:seed:pricing
```

### Option B: Run via One-off Cloud Run Job
If you cannot connect locally, you can create a temporary job or use `prisma studio` if available. Or, you can add a temporary step to `cloudbuild.yaml` (not recommended for permanent setup).
