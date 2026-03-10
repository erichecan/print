#!/bin/bash
set -e

PROJECT_ID=${GCP_PROJECT_ID:-print-482914}
REGION=${GCP_REGION:-us-central1}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
DB_INSTANCE=${DB_INSTANCE_NAME:-print1600}

echo "Fetching current database-url secret..."
CURRENT_URL=$(gcloud secrets versions access latest --secret="database-url" --project="$PROJECT_ID")

if [[ "$CURRENT_URL" == *"@/"* ]]; then
  echo "Found empty host. Fixing..."
  # Replace @/ with @localhost/
  FIXED_URL="${CURRENT_URL/@\//@localhost\/}"
  
  echo -n "$FIXED_URL" | gcloud secrets versions add database-url --data-file=- --project="$PROJECT_ID"
  echo "✅ database-url secret successfully updated with 'localhost'."
  
  echo "🚀 Redeploying backend..."
  gcloud run deploy "$BACKEND_SERVICE" \
    --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
    --set-secrets "DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest" \
    --set-env-vars "NODE_ENV=production,AUTO_MIGRATE=true,GCP_IMAGE_BUCKET=print-482914-images,PGSSLMODE=disable" \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --project "$PROJECT_ID" \
    --quiet
    
  echo "✅ Backend redeployed successfully."
else
  echo "The database-url already seems to have a host configured: $CURRENT_URL"
fi
