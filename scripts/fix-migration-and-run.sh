#!/bin/bash
# [2025-12-10 00:45:00] 修复失败的迁移并重新运行

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

echo "步骤 1: 解决失败的迁移状态..."
JOB_NAME="db-migrate-resolve"
gcloud run jobs update ${JOB_NAME} \
  --image ${BACKEND_IMAGE} \
  --region ${REGION} \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production \
  --command="npx" \
  --args="prisma,migrate,resolve,--rolled-back,20251210000000_add_guest_messages,--schema=./prisma/schema.prisma" \
  --max-retries 1 \
  --memory 512Mi \
  --cpu 1 \
  --task-timeout 300 \
  --quiet

EXECUTION_NAME=$(gcloud run jobs execute ${JOB_NAME} --region=${REGION} --format='value(metadata.name)' --quiet)
echo "✅ 已启动解决迁移状态: ${EXECUTION_NAME}"
sleep 15

echo ""
echo "步骤 2: 重新运行迁移..."
./scripts/run-production-migration.sh
