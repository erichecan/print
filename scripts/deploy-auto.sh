#!/bin/bash
# 全自动 GCP 部署脚本
# 一键完成所有部署步骤
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
FRONTEND_SERVICE=${FRONTEND_SERVICE_NAME:-print-main-frontend}

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    GCP 全自动部署脚本 (免费层优化)       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 步骤 1: 检查依赖
# ============================================
echo -e "${GREEN}📋 步骤 1/6: 检查依赖...${NC}"

# 检查 gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ 错误: gcloud CLI 未安装${NC}"
    echo -e "${YELLOW}请安装: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi
echo -e "${GREEN}✅ gcloud 已安装${NC}"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: Docker 未安装${NC}"
    echo -e "${YELLOW}请安装: https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ 错误: Docker 未运行${NC}"
    echo -e "${YELLOW}请启动 Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已安装并运行${NC}"
echo ""

# ============================================
# 步骤 2: 配置 GCP 项目
# ============================================
echo -e "${GREEN}📋 步骤 2/6: 配置 GCP 项目...${NC}"

# 如果项目 ID 未设置，提示输入
if [ -z "$PROJECT_ID" ]; then
    read -p "请输入 GCP 项目 ID: " PROJECT_ID
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ 错误: 必须提供项目 ID${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}项目 ID: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# 登录检查
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 &> /dev/null; then
    echo -e "${YELLOW}需要登录 GCP...${NC}"
    gcloud auth login
fi
echo -e "${GREEN}✅ GCP 项目配置完成${NC}"
echo ""

# ============================================
# 步骤 3: 启用必要的 API（自动）
# ============================================
echo -e "${GREEN}📋 步骤 3/6: 启用必要的 API（自动）...${NC}"

echo -e "${YELLOW}正在启用 API，这可能需要 1-2 分钟...${NC}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

echo -e "${GREEN}✅ API 已启用${NC}"
echo ""

# ============================================
# 步骤 4: 创建资源（自动）
# ============================================
echo -e "${GREEN}📋 步骤 4/6: 创建 GCP 资源（自动）...${NC}"

# 创建 Artifact Registry 仓库
if ! gcloud artifacts repositories describe ${REPOSITORY} --location=${REGION} &> /dev/null; then
    echo -e "${YELLOW}创建 Docker 镜像仓库...${NC}"
    gcloud artifacts repositories create ${REPOSITORY} \
      --repository-format=docker \
      --location=${REGION} \
      --description="Print Main application Docker images" \
      --quiet
    echo -e "${GREEN}✅ 镜像仓库已创建${NC}"
else
    echo -e "${YELLOW}⚠️  镜像仓库已存在${NC}"
fi

# 配置 Docker 认证
echo -e "${YELLOW}配置 Docker 认证...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo -e "${GREEN}✅ Docker 认证配置完成${NC}"

# 创建必要的 Secret（如果不存在）
echo -e "${YELLOW}检查 Secret Manager 密钥...${NC}"

# JWT Secret（自动生成）
if ! gcloud secrets describe jwt-secret &> /dev/null; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo -n "${JWT_SECRET}" | gcloud secrets create jwt-secret --data-file=-
    echo -e "${GREEN}✅ JWT Secret 已创建（自动生成）${NC}"
else
    echo -e "${YELLOW}⚠️  JWT Secret 已存在${NC}"
fi

# 数据库 URL（用户输入）
if ! gcloud secrets describe database-url &> /dev/null; then
    echo -e "${YELLOW}需要配置数据库 URL${NC}"
    echo -e "${YELLOW}推荐使用免费数据库:${NC}"
    echo "  - Supabase: https://supabase.com (免费 500MB)"
    echo "  - Neon: https://neon.tech (免费 PostgreSQL)"
    echo ""
    read -p "请输入数据库 URL (格式: postgresql://user:pass@host:5432/dbname): " DB_URL
    if [ -z "$DB_URL" ]; then
        echo -e "${RED}❌ 错误: 必须提供数据库 URL${NC}"
        exit 1
    fi
    echo -n "${DB_URL}" | gcloud secrets create database-url --data-file=-
    echo -e "${GREEN}✅ 数据库 URL Secret 已创建${NC}"
else
    echo -e "${YELLOW}⚠️  数据库 URL Secret 已存在${NC}"
fi

# Stripe 密钥（用户输入）
if ! gcloud secrets describe stripe-secret-key &> /dev/null; then
    read -p "请输入 Stripe Secret Key (sk_test_...): " STRIPE_SECRET
    if [ ! -z "$STRIPE_SECRET" ]; then
        echo -n "${STRIPE_SECRET}" | gcloud secrets create stripe-secret-key --data-file=-
        echo -e "${GREEN}✅ Stripe Secret Key 已创建${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Stripe Secret Key 已存在${NC}"
fi

if ! gcloud secrets describe stripe-publishable-key &> /dev/null; then
    read -p "请输入 Stripe Publishable Key (pk_test_...): " STRIPE_PUB
    if [ ! -z "$STRIPE_PUB" ]; then
        echo -n "${STRIPE_PUB}" | gcloud secrets create stripe-publishable-key --data-file=-
        echo -e "${GREEN}✅ Stripe Publishable Key 已创建${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Stripe Publishable Key 已存在${NC}"
fi

# 授权服务账号访问 Secret
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo -e "${YELLOW}授权服务账号访问 Secret...${NC}"
for SECRET in jwt-secret database-url stripe-secret-key stripe-publishable-key; do
    if gcloud secrets describe ${SECRET} &> /dev/null; then
        gcloud secrets add-iam-policy-binding ${SECRET} \
          --member="serviceAccount:${SERVICE_ACCOUNT}" \
          --role="roles/secretmanager.secretAccessor" \
          --quiet 2>/dev/null || true
    fi
done
echo -e "${GREEN}✅ Secret 授权完成${NC}"
echo ""

# ============================================
# 步骤 5: 构建和部署（自动）
# ============================================
echo -e "${GREEN}📋 步骤 5/6: 构建和部署应用（自动）...${NC}"
echo -e "${YELLOW}这可能需要 5-10 分钟...${NC}"
echo ""

# 构建并推送后端
echo -e "${BLUE}[后端] 构建 Docker 镜像 (linux/amd64)...${NC}"
docker build --platform linux/amd64 -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  -f backend/Dockerfile . 2>&1 | grep -E "(Step|Successfully)" || true

echo -e "${BLUE}[后端] 推送镜像...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest

# 部署后端
echo -e "${BLUE}[后端] 部署到 Cloud Run...${NC}"
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
  --set-env-vars NODE_ENV=production,GCP_IMAGE_BUCKET=${PROJECT_ID}-images \
  --quiet

BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}✅ 后端已部署: ${BACKEND_URL}${NC}"

# 更新 API URL Secret
API_URL="${BACKEND_URL}/api"
echo -n "${API_URL}" | gcloud secrets versions add api-url --data-file=- 2>/dev/null || \
  echo -n "${API_URL}" | gcloud secrets create api-url --data-file=-

# 授权 API URL Secret
gcloud secrets add-iam-policy-binding api-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

# 获取构建版本信息
LOCAL_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LOCAL_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# 获取 Stripe Publishable Key (用于构建时注入)
STRIPE_PUB=$(gcloud secrets versions access latest --secret=stripe-publishable-key 2>/dev/null || echo "")

# 构建并推送前端
echo ""
echo -e "${BLUE}[前端] 构建 Docker 镜像 (linux/amd64)...${NC}"
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=${API_URL} \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUB} \
  --build-arg NEXT_PUBLIC_BUILD_SHA=${LOCAL_SHA} \
  --build-arg NEXT_PUBLIC_BUILD_TIME=${LOCAL_TIME} \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  -f apps/web/Dockerfile .

echo -e "${BLUE}[前端] 推送镜像...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest

# 部署前端
echo -e "${BLUE}[前端] 部署到 Cloud Run...${NC}"
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
  --set-env-vars NODE_ENV=production \
  --quiet

FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}✅ 前端已部署: ${FRONTEND_URL}${NC}"
echo ""

# ============================================
# 步骤 6: 设置预算告警（提示）
# ============================================
echo -e "${GREEN}📋 步骤 6/6: 设置费用预算告警（重要！）...${NC}"
echo -e "${YELLOW}⚠️  强烈建议设置预算告警以防止意外费用！${NC}"
read -p "是否现在设置预算告警？(y/n，默认 y): " SET_BUDGET
SET_BUDGET=${SET_BUDGET:-y}

if [ "$SET_BUDGET" = "y" ] || [ "$SET_BUDGET" = "Y" ]; then
    if [ -f "./scripts/setup-billing-alerts.sh" ]; then
        ./scripts/setup-billing-alerts.sh
    else
        echo -e "${YELLOW}预算告警脚本未找到，请手动设置:${NC}"
        echo "  https://console.cloud.google.com/billing/budgets"
    fi
fi
echo ""

# ============================================
# 完成
# ============================================
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🎉 部署完成！                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}访问地址:${NC}"
echo -e "  前端: ${YELLOW}${FRONTEND_URL}${NC}"
echo -e "  后端: ${YELLOW}${BACKEND_URL}${NC}"
echo ""
echo -e "${BLUE}💰 费用信息:${NC}"
echo -e "  - Cloud Run: ${GREEN}免费${NC} (minScale: 0，无请求时自动停止)"
echo -e "  - 预期月费用: ${GREEN}\$0${NC} (如果 < 200万请求/月)"
echo ""
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo -e "  1. 首次访问可能有 2-5 秒延迟（冷启动）"
echo -e "  2. 数据库迁移需要手动执行（如果有）"
echo -e "  3. 建议设置预算告警: https://console.cloud.google.com/billing/budgets"
echo ""

