#!/bin/bash
# GCP Deployment Script - FREE TIER OPTIMIZED
# Automated deployment script for GCP Cloud Run
# ⚠️ 默认使用免费配置 (minScale: 0) 以避免持续运行费用
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-print-482914}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
FRONTEND_SERVICE=${FRONTEND_SERVICE_NAME:-print-main-frontend}
DB_INSTANCE=${DB_INSTANCE_NAME:-print1600}

echo -e "${GREEN}🚀 Starting GCP deployment (FREE TIER OPTIMIZED)...${NC}"
echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "${YELLOW}⚠️  部署前请确认上述 Project ID 正确，避免部署到错误项目（见 docs/backup-restore.md）${NC}"
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
echo -e "${GREEN}🏗️  Building backend Docker image (NO CACHE)...${NC}"
docker build --no-cache --platform linux/amd64 -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
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
  --set-env-vars NODE_ENV=production,AUTO_MIGRATE=true,GCP_IMAGE_BUCKET=print-482914-images,PGSSLMODE=disable \
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
# 修复：在构建时从 Secret Manager 读取 Stripe key 并传入，确保 NEXT_PUBLIC_* 变量在构建时内联
echo -e "${GREEN}📌 使用后端 URL 构建前端: ${API_URL}${NC}"
# 从 Secret Manager 读取 Stripe publishable key（构建时必须）
STRIPE_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=stripe-publishable-key --project=${PROJECT_ID} 2>/dev/null || echo "")
if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ 错误: 无法从 Secret Manager 读取 stripe-publishable-key${NC}"
    echo -e "${YELLOW}请先创建 Secret:${NC}"
    echo -e "  echo 'YOUR_STRIPE_KEY' | gcloud secrets create stripe-publishable-key --data-file=- --project=${PROJECT_ID}"
    exit 1
fi
echo -e "${GREEN}✅ 已从 Secret Manager 读取 Stripe publishable key (长度: ${#STRIPE_PUBLISHABLE_KEY} 字符)${NC}"
# 修复：使用项目根目录作为构建上下文，以便访问 prisma 目录
docker build --no-cache --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  -f apps/web/Dockerfile .

echo -e "${GREEN}📤 Pushing frontend image...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest

# Deploy frontend（min-instances 1 避免冷启动 503，2026-03-06）
echo -e "${GREEN}🚀 Deploying frontend to Cloud Run...${NC}"
echo -e "${YELLOW}⚠️  min-instances: 1（常驻 1 实例，避免 /api/proxy/cart 等 503）${NC}"
gcloud run deploy ${FRONTEND_SERVICE} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --set-env-vars NODE_ENV=production \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
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
echo -e "  - Frontend/Backend: ${YELLOW}min-instances 1${NC}（常驻 1 实例，减少 503）"
echo -e "  - 预期月费: 按 Cloud Run 计费（1 实例常驻会产生少量费用）"
echo ""
echo -e "${YELLOW}⚠️  Important reminders:${NC}"
echo -e "  1. ✅ Set up billing alerts: https://console.cloud.google.com/billing"
echo -e "  2. ✅ Use external free database (Supabase/Neon) instead of Cloud SQL"
echo -e "  3. ✅ Monitor costs in GCP Console regularly"
echo ""

# ------------------------------------------------------------------------------
# AUTOMATED CLEANUP (Keep 2 versions)
# ------------------------------------------------------------------------------
echo -e "${GREEN}🧹 Running automated cleanup (keeping 2 most recent versions)...${NC}"
if [ -f "./scripts/cleanup-gcp-old-versions.sh" ]; then
    chmod +x ./scripts/cleanup-gcp-old-versions.sh
    ./scripts/cleanup-gcp-old-versions.sh || echo -e "${YELLOW}⚠️  Cleanup script failed but deployment was successful.${NC}"
else
    echo -e "${YELLOW}⚠️  Cleanup script not found. Skipping cleanup.${NC}"
fi

echo ""
