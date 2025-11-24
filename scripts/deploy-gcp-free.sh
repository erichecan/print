#!/bin/bash
# GCP FREE TIER Deployment Script
# [2025-01-27] Optimized for zero cost deployment
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
FRONTEND_SERVICE=${FRONTEND_SERVICE_NAME:-print-main-frontend}

echo -e "${GREEN}🚀 Starting GCP FREE TIER deployment...${NC}"
echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "${YELLOW}⚠️  This configuration uses minScale: 0 for FREE tier (scales to zero when idle)${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Set project
echo -e "${GREEN}📌 Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Authenticate Docker
echo -e "${GREEN}🔐 Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build and push backend
echo -e "${GREEN}🏗️  Building backend Docker image...${NC}"
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  -f backend/Dockerfile .

echo -e "${GREEN}📤 Pushing backend image...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest

# Build and push frontend
echo -e "${GREEN}🏗️  Building frontend Docker image...${NC}"
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  -f apps/web/Dockerfile apps/web

echo -e "${GREEN}📤 Pushing frontend image...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest

# Deploy backend - FREE TIER CONFIGURATION
echo -e "${GREEN}🚀 Deploying backend to Cloud Run (FREE TIER)...${NC}"
echo -e "${YELLOW}⚠️  Using minScale: 0 (scales to zero when idle = FREE)${NC}"
echo -e "${YELLOW}⚠️  ⚠️  ⚠️  REMOVING Cloud SQL connection - use external free database!${NC}"

# Check if DATABASE_URL secret exists
if ! gcloud secrets describe database-url &> /dev/null; then
    echo -e "${YELLOW}⚠️  database-url secret not found. Please create it with your external database URL.${NC}"
    echo -e "${YELLOW}   Example: postgresql://user:pass@host:5432/dbname${NC}"
    read -p "Enter database URL (or press Enter to skip): " DB_URL
    if [ ! -z "$DB_URL" ]; then
        echo -n "${DB_URL}" | gcloud secrets create database-url --data-file=-
        echo -e "${GREEN}✅ Created database-url secret${NC}"
    fi
fi

gcloud run deploy ${BACKEND_SERVICE} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars NODE_ENV=production,PORT=8080

# Get backend URL
BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}✅ Backend deployed: ${BACKEND_URL}${NC}"

# Update API URL secret
API_URL="${BACKEND_URL}/api"
echo -e "${GREEN}🔐 Updating API URL secret...${NC}"
echo -n "${API_URL}" | gcloud secrets versions add api-url --data-file=- 2>/dev/null || \
  echo -n "${API_URL}" | gcloud secrets create api-url --data-file=-

# Deploy frontend - FREE TIER CONFIGURATION
echo -e "${GREEN}🚀 Deploying frontend to Cloud Run (FREE TIER)...${NC}"
echo -e "${YELLOW}⚠️  Using minScale: 0 (scales to zero when idle = FREE)${NC}"

gcloud run deploy ${FRONTEND_SERVICE} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --set-env-vars NODE_ENV=production

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}✅ Frontend deployed: ${FRONTEND_URL}${NC}"

echo ""
echo -e "${GREEN}🎉 FREE TIER deployment completed!${NC}"
echo -e "Backend URL: ${YELLOW}${BACKEND_URL}${NC}"
echo -e "Frontend URL: ${YELLOW}${FRONTEND_URL}${NC}"
echo ""
echo -e "${YELLOW}💰 Cost Information:${NC}"
echo -e "  - Cloud Run: ${GREEN}FREE${NC} (minScale: 0, scales to zero when idle)"
echo -e "  - Artifact Registry: ${GREEN}FREE${NC} (< 0.5GB)"
echo -e "  - Secret Manager: ${GREEN}FREE${NC} (< 10,000 versions)"
echo -e "  - Expected monthly cost: ${GREEN}$0${NC} (if < 2M requests/month)"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo -e "  1. Set up billing alerts at: https://console.cloud.google.com/billing"
echo -e "  2. First request will have cold start (2-5 seconds)"
echo -e "  3. Make sure DATABASE_URL points to external free database (Supabase/Neon)"

