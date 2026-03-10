#!/bin/bash
# Script to run database migrations via Cloud Run Jobs
# Usage: ./scripts/gcp-migrate-job.sh

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
JOB_NAME="migrate-db-job"
DB_INSTANCE=${DB_INSTANCE_NAME:-print1600}
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

echo "🚀 Setting up Cloud Run Job for DB Migration..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Image: $BACKEND_IMAGE"

# Create or Update the Job
# We reuse the backend image but override the command to run migrations
echo "🔨 Creating/Updating Cloud Run Job '$JOB_NAME'..."

gcloud run jobs deploy $JOB_NAME \
  --image $BACKEND_IMAGE \
  --region $REGION \
  --command "npx" \
  --args "prisma,db,push,--schema=prisma/schema.prisma,--accept-data-loss" \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production \
  --max-retries 0 \
  --task-timeout 5m \
  --set-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE}

echo "✅ Job created/updated."

# Execute the Job
echo "▶️  Executing migration job..."
EXECUTION_ID=$(gcloud run jobs execute $JOB_NAME --region $REGION --format="value(name)")

echo "⏳ Waiting for job execution to complete..."
# Wait for the specific execution to finish
gcloud run jobs executions describe $EXECUTION_ID --region $REGION

echo "✅ Migration job execution triggered. Check logs above or in console for detailed status."
