#!/bin/bash
# GCP FREE TIER Deployment Script
# Optimized for zero cost deployment
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
# 指定 linux/amd64 平台以兼容 Cloud Run
# 注入构建版本信息（Git SHA 和构建时间）
# 增强版本信息日志
echo -e "${GREEN}🏗️  Building backend Docker image (linux/amd64)...${NC}"
BACKEND_GIT_SHA=$(git rev-parse --short HEAD)
BACKEND_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo -e "${YELLOW}📌 后端构建版本: ${BACKEND_GIT_SHA} at ${BACKEND_BUILD_TIME}${NC}"

docker build --platform linux/amd64 \
  --build-arg APP_BUILD_SHA="${GIT_SHA}" \
  --build-arg APP_BUILD_TIME="${BUILD_TIME}" \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  -f backend/Dockerfile .

echo -e "${GREEN}📤 Pushing backend image...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest

# Get backend URL for frontend build (use existing or get from deployed service)
# 获取后端 URL 用于前端构建
BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format 'value(status.url)' 2>/dev/null || echo "")
if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  Backend service not found, will use placeholder URL${NC}"
    BACKEND_URL="https://print-main-backend-234065158862.us-central1.run.app"
fi
API_URL="${BACKEND_URL}/api"
echo -e "${GREEN}📌 Using API URL for frontend build: ${API_URL}${NC}"

# Get Stripe publishable key from Secret Manager
# 从 Secret Manager 读取 Stripe publishable key
STRIPE_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=stripe-publishable-key --project=${PROJECT_ID} 2>/dev/null || echo "")
if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ 错误: 无法从 Secret Manager 读取 stripe-publishable-key${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 已从 Secret Manager 读取 Stripe publishable key${NC}"

# Build and push frontend
# 指定 linux/amd64 平台以兼容 Cloud Run
# 注入构建版本信息（Git SHA 和构建时间）
# 传递必需的环境变量
# 增强版本信息日志，便于验证部署
echo -e "${GREEN}🏗️  Building frontend Docker image (linux/amd64)...${NC}"
GIT_SHA=$(git rev-parse --short HEAD)
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📌 前端构建版本信息:${NC}"
echo -e "${GREEN}   Git SHA: ${GIT_SHA}${NC}"
echo -e "${GREEN}   构建时间: ${BUILD_TIME}${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" \
  --build-arg NEXT_PUBLIC_BUILD_SHA="${GIT_SHA}" \
  --build-arg NEXT_PUBLIC_BUILD_TIME="${BUILD_TIME}" \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  -f apps/web/Dockerfile .

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
  --timeout 600 \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars NODE_ENV=production,AUTO_MIGRATE=false \
  --cpu-boost

# Get backend URL (update if changed)
BACKEND_URL_NEW=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format 'value(status.url)')
BACKEND_REVISION=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format 'value(status.latestReadyRevisionName)')
echo -e "${GREEN}✅ Backend deployed: ${BACKEND_URL_NEW}${NC}"
echo -e "${YELLOW}   后端 Revision: ${BACKEND_REVISION}${NC}"
echo -e "${YELLOW}   后端构建 SHA: ${BACKEND_GIT_SHA}${NC}"

# Update API URL secret
API_URL_NEW="${BACKEND_URL_NEW}/api"
echo -e "${GREEN}🔐 Updating API URL secret...${NC}"
echo -n "${API_URL_NEW}" | gcloud secrets versions add api-url --data-file=- 2>/dev/null || \
  echo -n "${API_URL_NEW}" | gcloud secrets create api-url --data-file=-

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
  --timeout 600 \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --set-env-vars NODE_ENV=production

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.url)')
FRONTEND_REVISION=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.latestReadyRevisionName)')
echo -e "${GREEN}✅ Frontend deployed: ${FRONTEND_URL}${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📋 部署验证信息:${NC}"
echo -e "${GREEN}   前端 URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}   Revision: ${FRONTEND_REVISION}${NC}"
echo -e "${GREEN}   构建 SHA: ${GIT_SHA}${NC}"
echo -e "${GREEN}   构建时间: ${BUILD_TIME}${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🔍 验证步骤:${NC}"
echo -e "  1. 打开浏览器访问: ${GREEN}${FRONTEND_URL}${NC}"
echo -e "  2. 打开开发者工具 (F12)"
echo -e "  3. 查看 Console 标签页"
echo -e "  4. 搜索: ${GREEN}[Frontend Build]${NC}"
echo -e "  5. 应该看到: ${GREEN}[Frontend Build] ${GIT_SHA} ${BUILD_TIME}${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# 更新后端服务，添加 FRONTEND_URL 环境变量，用于图片 URL 生成
echo -e "${GREEN}🔧 更新后端服务，添加 FRONTEND_URL 环境变量...${NC}"
gcloud run services update ${BACKEND_SERVICE} \
  --region ${REGION} \
  --update-env-vars FRONTEND_URL=${FRONTEND_URL} \
  --quiet

echo -e "${GREEN}✅ 后端服务已更新，FRONTEND_URL=${FRONTEND_URL}${NC}"

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

