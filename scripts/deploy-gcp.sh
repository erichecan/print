#!/bin/bash
# GCP Deployment Script - FREE TIER OPTIMIZED
# [2025-01-27] Automated deployment script for GCP Cloud Run
# ⚠️ 默认使用免费配置 (minScale: 0) 以避免持续运行费用
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
DB_INSTANCE=${DB_INSTANCE_NAME:-print-main-db}

echo -e "${GREEN}🚀 Starting GCP deployment (FREE TIER OPTIMIZED)...${NC}"
echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "${YELLOW}⚠️  Using FREE tier configuration (minScale: 0 = scales to zero when idle)${NC}"
echo -e "${YELLOW}⚠️  Expected cost: $0/month if < 2M requests${NC}"
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
docker build --platform linux/amd64 -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  -f backend/Dockerfile .

echo -e "${GREEN}📤 Pushing backend image...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest

# Deploy backend first (to get the URL for frontend build)
echo -e "${GREEN}🚀 Deploying backend to Cloud Run...${NC}"
gcloud run deploy ${BACKEND_SERVICE} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE} \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars NODE_ENV=production,AUTO_MIGRATE=true \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300

# Get backend URL
BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}✅ Backend deployed: ${BACKEND_URL}${NC}"

# Update API URL secret
API_URL="${BACKEND_URL}/api"
echo -e "${GREEN}🔐 Updating API URL secret...${NC}"
echo -n "${API_URL}" | gcloud secrets versions add api-url --data-file=- || \
  echo -n "${API_URL}" | gcloud secrets create api-url --data-file=-

# Build and push frontend (with backend URL for build-time API URL)
echo -e "${GREEN}🏗️  Building frontend Docker image...${NC}"
# [2025-01-30 17:50:00] 修复：在构建时从 Secret Manager 读取 Stripe key 并传入，确保 NEXT_PUBLIC_* 变量在构建时内联
echo -e "${GREEN}📌 使用后端 URL 构建前端: ${API_URL}${NC}"
# [2025-01-30 17:50:00] 从 Secret Manager 读取 Stripe publishable key（构建时必须）
STRIPE_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=stripe-publishable-key --project=${PROJECT_ID} 2>/dev/null || echo "")
if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ 错误: 无法从 Secret Manager 读取 stripe-publishable-key${NC}"
    echo -e "${YELLOW}请先创建 Secret:${NC}"
    echo -e "  echo 'YOUR_STRIPE_KEY' | gcloud secrets create stripe-publishable-key --data-file=- --project=${PROJECT_ID}"
    exit 1
fi
echo -e "${GREEN}✅ 已从 Secret Manager 读取 Stripe publishable key (长度: ${#STRIPE_PUBLISHABLE_KEY} 字符)${NC}"
# [2025-01-27 20:50:00] 修复：使用项目根目录作为构建上下文，以便访问 prisma 目录
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  -f apps/web/Dockerfile .

echo -e "${GREEN}📤 Pushing frontend image...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest

# Deploy frontend - FREE TIER CONFIGURATION
echo -e "${GREEN}🚀 Deploying frontend to Cloud Run (FREE TIER)...${NC}"
echo -e "${YELLOW}⚠️  minScale: 0 (scales to zero when idle = FREE)${NC}"
gcloud run deploy ${FRONTEND_SERVICE} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --set-env-vars NODE_ENV=production \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 300

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}✅ Frontend deployed: ${FRONTEND_URL}${NC}"

echo ""
echo -e "${GREEN}🎉 FREE TIER deployment completed successfully!${NC}"
echo -e "Backend URL: ${YELLOW}${BACKEND_URL}${NC}"
echo -e "Frontend URL: ${YELLOW}${FRONTEND_URL}${NC}"
echo ""
echo -e "${YELLOW}💰 Cost Information:${NC}"
echo -e "  - Cloud Run: ${GREEN}FREE${NC} (minScale: 0, scales to zero when idle)"
echo -e "  - Expected monthly cost: ${GREEN}$0${NC} (if < 2M requests/month)"
echo -e "  - First request will have cold start: ${YELLOW}2-5 seconds${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important reminders:${NC}"
echo -e "  1. ✅ Set up billing alerts: https://console.cloud.google.com/billing"
echo -e "  2. ✅ Use external free database (Supabase/Neon) instead of Cloud SQL"
echo -e "  3. ✅ Monitor costs in GCP Console regularly"
echo ""

