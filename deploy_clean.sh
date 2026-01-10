#!/bin/bash
set -e

# Configuration
PROJECT_ID="print-482914"
REGION="us-central1"
ARTIFACT_REGISTRY="print-main"
GIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%s)
TAG="${GIT_SHA}-${TIMESTAMP}"

echo "🚀 Starting clean deployment for Project: $PROJECT_ID, Tag: $TAG"

# ==========================================
# 1. Backend Deployment
# ==========================================
APP_NAME="backend"
SERVICE_NAME="print-main-backend"
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/${APP_NAME}:${TAG}"

docker build --platform linux/amd64 \
  -f backend/Dockerfile \
  -t $IMAGE_URL \
  .

echo "⬆️ Pushing Backend Image..."
docker push $IMAGE_URL

echo "🚀 Deploying Backend Service (No Traffic)..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars AUTO_MIGRATE=true,GCP_IMAGE_BUCKET=print-482914-images,GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-482914-images \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --project $PROJECT_ID

# ==========================================
# 2. Frontend Deployment
# ==========================================
APP_NAME="frontend"
SERVICE_NAME="print-main-frontend"
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/${APP_NAME}:${TAG}"

# Get Stripe Key for Build Arg (Failure safe)
set +e
STRIPE_KEY=$(gcloud secrets versions access latest --secret=stripe-publishable-key --project=${PROJECT_ID} 2>/dev/null)
set -e
if [ -z "$STRIPE_KEY" ]; then
    echo "⚠️  Warning: Could not fetch Stripe Key. Proceeding without it (build might fail if needed)."
else 
    echo "🔑 Stripe Key fetched."
fi

# Get Backend URL for Frontend
echo "📡 Fetching Backend URL..."
BACKEND_URL=$(gcloud run services describe print-main-backend --project=$PROJECT_ID --region=$REGION --format='value(status.url)' 2>/dev/null)
if [ -z "$BACKEND_URL" ]; then
    echo "⚠️ Warning: Backend URL not found. Using fallback."
    BACKEND_URL="https://print-main-backend-651538279084.us-central1.run.app"
fi
echo "🔗 Backend URL: $BACKEND_URL"

echo "📦 Building Frontend..."
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="${BACKEND_URL}/api" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$STRIPE_KEY" \
  --build-arg NEXT_PUBLIC_BUILD_SHA="$TAG" \
  -f apps/web/Dockerfile \
  -t $IMAGE_URL \
  .

echo "⬆️ Pushing Frontend Image..."
docker push $IMAGE_URL

# Clearing env vars first to avoid conflicts if needed, but since we are deploying a new revision with set-env-vars, 
# if the type conflict persists, we might need a separate update command. 
# However, `gcloud run deploy` with --clear-env-vars AND --set-env-vars for THE SAME KEY is tricky.
# Let's try to just remove the clear-env-vars flag and handle the type change by manually ensuring
# the user deletes the old variable if they changed types, OR, actually, let's use the --clear-env-vars in a PRE-STEP.

echo "🧹 Ensuring environment is clean..."
gcloud run services update $SERVICE_NAME --platform managed --region $REGION --clear-env-vars NEXT_PUBLIC_API_URL --project $PROJECT_ID || true

echo "🚀 Deploying Frontend Service (No Traffic)..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_API_URL=${BACKEND_URL}/api" \
  --set-secrets NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --project $PROJECT_ID


# ==========================================
# 3. CDN Invalidation (Optional)
# ==========================================
# Uncomment and set URLMAP if you are using Cloud Load Balancing
# URLMAP="your-url-map-name"
# echo "🧹 Invalidating CDN Cache..."
# gcloud compute url-maps invalidate-cdn-cache $URLMAP --path "/*" --project $PROJECT_ID

# ==========================================
# 4. Post-Deployment Configuration
# ==========================================
echo "🌱 Seeding remote database configuration..."
# Ensure the script is executable
chmod +x backend/scripts/seed-remote-size-pricing.sh
# Run the remote seeding script
./backend/scripts/seed-remote-size-pricing.sh

echo "✅ Clean Deployment Complete!"
