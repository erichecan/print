#!/bin/bash
set -e

# Configuration
PROJECT_ID="moonlit-gamma-479502-r6"
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

echo "📦 Building Backend (No Cache)..."
docker build --no-cache --platform linux/amd64 \
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

echo "📦 Building Frontend (No Cache)..."
docker build --no-cache --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$STRIPE_KEY" \
  --build-arg NEXT_PUBLIC_BUILD_SHA="$TAG" \
  -f apps/web/Dockerfile \
  -t $IMAGE_URL \
  .

echo "⬆️ Pushing Frontend Image..."
docker push $IMAGE_URL

echo "🚀 Deploying Frontend Service (No Traffic)..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --project $PROJECT_ID


# ==========================================
# 3. CDN Invalidation (Optional)
# ==========================================
# Uncomment and set URLMAP if you are using Cloud Load Balancing
# URLMAP="your-url-map-name"
# echo "🧹 Invalidating CDN Cache..."
# gcloud compute url-maps invalidate-cdn-cache $URLMAP --path "/*" --project $PROJECT_ID

echo "✅ Clean Deployment Complete!"
