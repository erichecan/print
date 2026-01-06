#!/bin/bash
# 解决失败的迁移 20250131_add_color_size_overrides
# 修复时间: 2026-01-06T23:15:00.000Z

set -e

PROJECT_ID="print-482914"
REGION="us-central1"
REPOSITORY="print-main"
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"
MIGRATION_NAME="20250131_add_color_size_overrides"

JOB_NAME="db-migrate-resolve-20250131"

echo "🔧 解决失败的迁移: ${MIGRATION_NAME}"
echo "=========================================="

# 检查迁移是否已经应用（表是否已存在）
echo "步骤 1: 检查迁移状态..."
echo "如果表已存在，将标记迁移为已应用"
echo "如果表不存在，将标记迁移为回滚，然后重新应用"

# 创建或更新 Cloud Run Job
if gcloud run jobs describe ${JOB_NAME} --region=${REGION} --project=${PROJECT_ID} &> /dev/null; then
    echo "更新现有的 Cloud Run Job..."
    gcloud run jobs update ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --project ${PROJECT_ID} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="npx" \
      --args="prisma,migrate,resolve,--applied,${MIGRATION_NAME},--schema=./prisma/schema.prisma" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
else
    echo "创建新的 Cloud Run Job..."
    gcloud run jobs create ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --project ${PROJECT_ID} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="npx" \
      --args="prisma,migrate,resolve,--applied,${MIGRATION_NAME},--schema=./prisma/schema.prisma" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
fi

echo ""
echo "步骤 2: 执行解决迁移状态的 Job..."
EXECUTION_NAME=$(gcloud run jobs execute ${JOB_NAME} --region=${REGION} --project=${PROJECT_ID} --format='value(metadata.name)' --quiet)
echo "✅ 已启动执行: ${EXECUTION_NAME}"

echo ""
echo "步骤 3: 等待执行完成..."
sleep 10

echo ""
echo "步骤 4: 检查执行状态..."
gcloud run jobs executions describe ${EXECUTION_NAME} --region=${REGION} --project=${PROJECT_ID} --format='value(status.conditions[0].type,status.conditions[0].status)'

echo ""
echo "=========================================="
echo "✅ 迁移状态解决完成"
echo ""
echo "下一步: 重新部署服务以应用后续迁移"
echo "运行: ./deploy_clean.sh"

