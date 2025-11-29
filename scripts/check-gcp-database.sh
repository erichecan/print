#!/bin/bash
# [2025-11-28 17:20:00] 检查 GCP 生产环境数据库状态

PROJECT_ID="moonlit-gamma-479502-r6"
SERVICE_NAME="print-main-backend"
REGION="us-central1"

echo "=== 检查 GCP 生产环境数据库状态 ==="
echo ""

# 获取 Cloud Run 服务的环境变量（包含 DATABASE_URL）
echo "1. 获取 Cloud Run 服务环境变量..."
gcloud run services describe ${SERVICE_NAME} \
  --project=${PROJECT_ID} \
  --region=${REGION} \
  --format="value(spec.template.spec.containers[0].env)" | grep DATABASE_URL || echo "未找到 DATABASE_URL"

echo ""
echo "2. 检查最近的后端日志（数据库相关错误）..."
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload=~'database' OR textPayload=~'migration' OR textPayload=~'Prisma')" \
  --limit=10 \
  --project=${PROJECT_ID} \
  --format="value(textPayload)" 2>&1 | head -20

echo ""
echo "3. 建议：直接通过 API 检查数据库状态"
echo "   curl -X POST https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/admin-setup/create-user"
echo "   这会创建/更新 admin 用户，从而验证数据库连接"

