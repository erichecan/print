#!/bin/bash
# [2025-01-31 20:10:00] 直接使用 prisma db push 同步 schema

set -e

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

echo "创建 Cloud Run Job 同步 schema..."

JOB_NAME="db-push-schema"
if gcloud run jobs describe ${JOB_NAME} --region=${REGION} &> /dev/null; then
    gcloud run jobs update ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="npx" \
      --args="prisma,db,push,--schema=./prisma/schema.prisma,--accept-data-loss" \
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
      --args="prisma,db,push,--schema=./prisma/schema.prisma,--accept-data-loss" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
fi

echo "执行 schema 同步..."
EXECUTION_NAME=$(gcloud run jobs execute ${JOB_NAME} --region=${REGION} --format='value(metadata.name)' --quiet)
echo "✅ Schema 同步已启动: ${EXECUTION_NAME}"
sleep 15
gcloud run jobs executions describe ${EXECUTION_NAME} --region=${REGION} --format='table(metadata.name,status.conditions[0].type,status.completionTime)'
