#!/bin/bash
# 2026-03-06: 一键用「URL 编码后的 app 密码」更新 database-url 并仅部署后端（不构建前端）
# 用法：APP_DB_PASSWORD='你的app密码' ./scripts/update-database-url-secret-and-deploy-backend.sh
# 或：  export APP_DB_PASSWORD='你的app密码'; ./scripts/update-database-url-secret-and-deploy-backend.sh
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID=${GCP_PROJECT_ID:-print-482914}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
DB_INSTANCE=${DB_INSTANCE_NAME:-print1600}

if [ -z "$APP_DB_PASSWORD" ]; then
  echo -e "${RED}❌ 请设置环境变量 APP_DB_PASSWORD（app 用户的数据库密码）${NC}"
  echo "  例: APP_DB_PASSWORD='Yj+b|frS#8\$qK@g8' $0"
  exit 1
fi

# 1. 生成编码后的连接串并写入 Secret Manager
ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent(process.env.APP_DB_PASSWORD))" APP_DB_PASSWORD="$APP_DB_PASSWORD")
# 2026-03-06: Cloud SQL 通过 Unix socket 连接时显式禁用 SSL，避免 \"The server does not support SSL connections\"
DATABASE_URL="postgresql://app:${ENCODED_PASSWORD}@localhost/suvernireplus?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}&sslmode=disable"

echo -e "${GREEN}🔐 更新 Secret Manager database-url（密码已 URL 编码）...${NC}"
echo -n "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=- --project="$PROJECT_ID"
echo -e "${GREEN}✅ database-url 已更新${NC}"

# 2. 仅部署后端（使用已有镜像，完整 --set-secrets 无占位符）
echo -e "${GREEN}🚀 部署后端到 Cloud Run...${NC}"
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

echo -e "${GREEN}✅ 后端已部署，新实例会使用更新后的 database-url${NC}"
