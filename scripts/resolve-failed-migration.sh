#!/bin/bash
# 解决失败的迁移状态

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

JOB_NAME="db-migrate-resolve"

echo "创建 Cloud Run Job 解决失败的迁移..."

if gcloud run jobs describe ${JOB_NAME} --region=${REGION} &> /dev/null; then
    gcloud run jobs update ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="npx" \
      --args="prisma,migrate,resolve,--applied,20251210000000_add_guest_messages,--schema=./prisma/schema.prisma" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
else
    gcloud run jobs create ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="npx" \
      --args="prisma,migrate,resolve,--applied,20251210000000_add_guest_messages,--schema=./prisma/schema.prisma" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
fi

echo "执行解决迁移状态的 Job..."
EXECUTION_NAME=$(gcloud run jobs execute ${JOB_NAME} --region=${REGION} --format='value(metadata.name)' --quiet)
echo "✅ 已启动: ${EXECUTION_NAME}"
