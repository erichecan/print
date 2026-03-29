#!/bin/bash
# run-backfill-job.sh
# 
# 作用：在 Cloud Run Job 中运行数据回填脚本，带上正确的 Cloud SQL 连接。
# 解决 2026-03-10 遇到的 PrismaClientInitializationError 问题。

set -e

# 配置
PROJECT_ID="print-482914"
REGION="us-central1"
REPOSITORY="print-main"
# ⚠️ 关键：根据报错信息，正确的实例名称是 print1600
DB_INSTANCE="print1600"
JOB_NAME="backfill-offline-orders-job"
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

echo "🚀 Deploying and executing Cloud Run Job: ${JOB_NAME}..."
echo "Instance: ${PROJECT_ID}:${REGION}:${DB_INSTANCE}"

# 1. 部署/更新 Job
# 注意：我们覆盖 CMD 运行我们的回填脚本
gcloud run jobs deploy ${JOB_NAME} \
  --image ${BACKEND_IMAGE} \
  --region ${REGION} \
  --command "node" \
  --args "scripts/run-all-backfills.js" \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production \
  --set-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE} \
  --max-retries 0 \
  --task-timeout 10m

echo "✅ Job ${JOB_NAME} updated."

# 2. 执行 Job
echo "▶️  Executing job..."
gcloud run jobs execute ${JOB_NAME} --region ${REGION}
