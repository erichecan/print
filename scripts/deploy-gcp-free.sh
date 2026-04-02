#!/usr/bin/env bash
#
# GCP Cloud Run 部署脚本（前后端，免费层 minScale=0）
# 使用：在项目根目录执行 ./scripts/deploy-gcp-free.sh
# 可选环境变量：GCP_PROJECT_ID, GCP_REGION, ARTIFACT_REGISTRY
# 2026-03-10 重写：统一构建参数、明确项目确认、步骤清晰
#
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置（可被环境变量覆盖）
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
REPOSITORY="${ARTIFACT_REGISTRY:-print-main}"
BACKEND_SERVICE="print-main-backend"
FRONTEND_SERVICE="print-main-frontend"
DB_INSTANCE="${DB_INSTANCE_NAME:-print1600}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${GREEN}=============================================="
echo "  GCP Cloud Run 部署（FREE TIER）"
echo -e "==============================================${NC}"
echo -e "  项目: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "  区域: ${YELLOW}${REGION}${NC}"
echo -e "  后端服务: ${BACKEND_SERVICE}"
echo -e "  前端服务: ${FRONTEND_SERVICE}"
echo ""

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ 未设置 GCP 项目。请执行: gcloud config set project <项目ID>${NC}"
  exit 1
fi

echo -e "${YELLOW}⚠️  请确认上述项目 ID 正确，再继续（当前 gcloud 默认项目）${NC}"
read -p "按 Enter 继续，或 Ctrl+C 取消..."

# 依赖检查
if ! command -v gcloud &>/dev/null; then
  echo -e "${RED}❌ 未安装 gcloud。请先安装 Google Cloud SDK。${NC}"
  exit 1
fi
if ! command -v docker &>/dev/null; then
  echo -e "${RED}❌ 未安装 Docker。请先安装并启动 Docker。${NC}"
  exit 1
fi

# 统一版本信息（后端、前端共用）
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 设置项目并配置 Docker 认证
echo -e "${GREEN}📌 设置 GCP 项目与 Docker 认证...${NC}"
gcloud config set project "$PROJECT_ID"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ---------- 1. 构建并推送后端镜像 ----------
echo ""
echo -e "${GREEN}🏗️  1/4 构建后端镜像 (linux/amd64)...${NC}"
docker build --platform linux/amd64 \
  --build-arg APP_BUILD_SHA="${GIT_SHA}" \
  --build-arg APP_BUILD_TIME="${BUILD_TIME}" \
  -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest" \
  -f backend/Dockerfile \
  .

echo -e "${GREEN}📤 推送后端镜像...${NC}"
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

# ---------- 2. 获取前端构建所需变量 ----------
echo ""
echo -e "${GREEN}📌 2/4 获取前端构建参数...${NC}"

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --format 'value(status.url)' 2>/dev/null || true)
if [ -z "$BACKEND_URL" ]; then
  BACKEND_URL="https://${BACKEND_SERVICE}-${PROJECT_ID}.${REGION}.run.app"
  echo -e "${YELLOW}   (后端服务尚未存在，将使用占位 URL: ${BACKEND_URL})${NC}"
fi
API_URL="${BACKEND_URL}/api"

STRIPE_PK=$(gcloud secrets versions access latest --secret=stripe-publishable-key --project="$PROJECT_ID" 2>/dev/null || true)
if [ -z "$STRIPE_PK" ]; then
  echo -e "${RED}❌ 无法读取 Secret: stripe-publishable-key。请在 Secret Manager 中创建。${NC}"
  exit 1
fi

# ---------- 3. 构建并推送前端镜像 ----------
echo ""
echo -e "${GREEN}🏗️  3/4 构建前端镜像 (linux/amd64)...${NC}"
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${STRIPE_PK}" \
  --build-arg NEXT_PUBLIC_BUILD_SHA="${GIT_SHA}" \
  --build-arg NEXT_PUBLIC_BUILD_TIME="${BUILD_TIME}" \
  -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest" \
  -f apps/web/Dockerfile \
  .

echo -e "${GREEN}📤 推送前端镜像...${NC}"
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest"

# ---------- 4. 部署后端 ----------
echo ""
echo -e "${GREEN}🚀 4/4 部署后端到 Cloud Run...${NC}"

if ! gcloud secrets describe database-url --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${YELLOW}⚠️  Secret database-url 不存在。请先创建数据库连接串。${NC}"
  read -p "输入 DATABASE_URL（或 Enter 跳过）: " DB_URL
  if [ -n "$DB_URL" ]; then
    echo -n "$DB_URL" | gcloud secrets create database-url --data-file=- --project="$PROJECT_ID"
    echo -e "${GREEN}✅ 已创建 database-url${NC}"
  fi
fi

gcloud run deploy "$BACKEND_SERVICE" \
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 600 \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars "NODE_ENV=production,AUTO_MIGRATE=true,GCP_IMAGE_BUCKET=print-482914-images,GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-482914-images,FRONTEND_URL=https://printngoplus.com,PGSSLMODE=disable" \
  --cpu-boost \
  --project "$PROJECT_ID"

BACKEND_URL_NEW=$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --format 'value(status.url)' --project="$PROJECT_ID")
API_URL_NEW="${BACKEND_URL_NEW}/api"

# 更新 api-url secret（前端运行时从 Secret 读 NEXT_PUBLIC_API_URL 时用）
echo -n "$API_URL_NEW" | gcloud secrets versions add api-url --data-file=- --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$API_URL_NEW" | gcloud secrets create api-url --data-file=- --project="$PROJECT_ID"

# ---------- 5. 部署前端 ----------
echo ""
echo -e "${GREEN}🚀 部署前端到 Cloud Run...${NC}"
gcloud run deploy "$FRONTEND_SERVICE" \
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 600 \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --set-env-vars NODE_ENV=production \
  --project "$PROJECT_ID"

FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" --region "$REGION" --format 'value(status.url)' --project="$PROJECT_ID")

# 后端环境变量补上 FRONTEND_URL（若需要）
gcloud run services update "$BACKEND_SERVICE" \
  --region "$REGION" \
  --update-env-vars "FRONTEND_URL=${FRONTEND_URL}" \
  --project "$PROJECT_ID" \
  --quiet

# ---------- 完成 ----------
echo ""
echo -e "${GREEN}=============================================="
echo "  部署完成"
echo -e "==============================================${NC}"
echo -e "  后端: ${YELLOW}${BACKEND_URL_NEW}${NC}"
echo -e "  前端: ${YELLOW}${FRONTEND_URL}${NC}"
echo ""
echo -e "${YELLOW}建议: 部署后执行一次清理以控制成本:${NC}"
echo "  ./scripts/cleanup-gcp-old-versions.sh"
echo ""
echo -e "${YELLOW}若管理后台产品/供应商接口 500，可临时设 AUTO_MIGRATE=true 再部署一次以同步 DB schema。${NC}"
