#!/bin/bash
# 一次性设置：为 Neon 每日备份创建 Cloud Run Job + Cloud Scheduler
#
# 执行前提：
#   1. 已完成 Cloud SQL → Neon 迁移，database-url secret 已指向 Neon
#   2. gcloud 已登录且项目正确
#   3. backend Docker 镜像已推送到 Artifact Registry
#
# 使用方法：
#   ./scripts/setup-neon-backup-scheduler.sh
#   SERVICE_ACCOUNT=custom-sa@xxx.iam.gserviceaccount.com ./scripts/setup-neon-backup-scheduler.sh

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
REGION="us-central1"
JOB_NAME="neon-daily-backup"
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/print-main/backend:latest"
SECRET_NAME="database-url"

# 服务账号：优先使用环境变量，否则用默认 Compute 服务账号
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
DEFAULT_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-$DEFAULT_SA}"

echo "────────────────────────────────────────────────────────────"
echo "  Neon 每日备份调度器设置"
echo "  Project : $PROJECT_ID"
echo "  Region  : $REGION"
echo "  Job     : $JOB_NAME"
echo "  Image   : $BACKEND_IMAGE"
echo "  SA      : $SERVICE_ACCOUNT"
echo "────────────────────────────────────────────────────────────"

# ── Step 1：确认服务账号有必要权限 ───────────────────────────────────────────
echo ""
echo "▶ 检查服务账号权限..."
echo "  注意：服务账号需要以下角色："
echo "    - roles/storage.objectAdmin（GCS 写入 + 删除）"
echo "    - roles/secretmanager.secretAccessor（读取 database-url）"
echo ""
echo "  如需手动授权，执行："
echo "    gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "      --member=\"serviceAccount:${SERVICE_ACCOUNT}\" \\"
echo "      --role=roles/storage.objectAdmin"
echo "    gcloud secrets add-iam-policy-binding $SECRET_NAME \\"
echo "      --member=\"serviceAccount:${SERVICE_ACCOUNT}\" \\"
echo "      --role=roles/secretmanager.secretAccessor \\"
echo "      --project=$PROJECT_ID"
echo ""

# ── Step 2：创建或更新 Cloud Run Job ─────────────────────────────────────────
echo "▶ 创建 Cloud Run Job: $JOB_NAME..."

if gcloud run jobs describe "$JOB_NAME" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  echo "  Job 已存在，更新配置..."
  gcloud run jobs update "$JOB_NAME" \
    --image "$BACKEND_IMAGE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --command "/bin/bash" \
    --args "-c,/app/scripts/neon-backup.sh" \
    --set-secrets "NEON_DATABASE_URL=${SECRET_NAME}:latest" \
    --service-account "$SERVICE_ACCOUNT" \
    --memory 512Mi \
    --max-retries 2 \
    --task-timeout 600
else
  gcloud run jobs create "$JOB_NAME" \
    --image "$BACKEND_IMAGE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --command "/bin/bash" \
    --args "-c,/app/scripts/neon-backup.sh" \
    --set-secrets "NEON_DATABASE_URL=${SECRET_NAME}:latest" \
    --service-account "$SERVICE_ACCOUNT" \
    --memory 512Mi \
    --max-retries 2 \
    --task-timeout 600
fi

echo "  ✓ Cloud Run Job 就绪"

# ── Step 3：获取 Job 的执行 URI ───────────────────────────────────────────────
JOB_URI="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run"

# ── Step 4：创建 Cloud Scheduler（中午 12:00 美东）────────────────────────────
SCHEDULER_NOON="neon-backup-noon"
echo ""
echo "▶ 创建 Cloud Scheduler: $SCHEDULER_NOON (12:00 America/New_York)..."

if gcloud scheduler jobs describe "$SCHEDULER_NOON" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  gcloud scheduler jobs update http "$SCHEDULER_NOON" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "0 12 * * *" \
    --time-zone "America/New_York" \
    --uri "$JOB_URI" \
    --http-method POST \
    --oauth-service-account-email "$SERVICE_ACCOUNT" \
    --message-body "{}"
else
  gcloud scheduler jobs create http "$SCHEDULER_NOON" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "0 12 * * *" \
    --time-zone "America/New_York" \
    --uri "$JOB_URI" \
    --http-method POST \
    --oauth-service-account-email "$SERVICE_ACCOUNT" \
    --message-body "{}"
fi

echo "  ✓ 中午备份调度器已创建"

# ── Step 5：创建 Cloud Scheduler（晚上 21:00 美东）───────────────────────────
SCHEDULER_EVENING="neon-backup-evening"
echo ""
echo "▶ 创建 Cloud Scheduler: $SCHEDULER_EVENING (21:00 America/New_York)..."

if gcloud scheduler jobs describe "$SCHEDULER_EVENING" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  gcloud scheduler jobs update http "$SCHEDULER_EVENING" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "0 21 * * *" \
    --time-zone "America/New_York" \
    --uri "$JOB_URI" \
    --http-method POST \
    --oauth-service-account-email "$SERVICE_ACCOUNT" \
    --message-body "{}"
else
  gcloud scheduler jobs create http "$SCHEDULER_EVENING" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "0 21 * * *" \
    --time-zone "America/New_York" \
    --uri "$JOB_URI" \
    --http-method POST \
    --oauth-service-account-email "$SERVICE_ACCOUNT" \
    --message-body "{}"
fi

echo "  ✓ 晚间备份调度器已创建"

# ── 完成 ──────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ 设置完成！"
echo ""
echo "  每日备份计划："
echo "    - 12:00 America/New_York → gs://print-482914-images/neon-backups/"
echo "    - 21:00 America/New_York → gs://print-482914-images/neon-backups/"
echo "    - 保留 30 天，自动清理旧备份"
echo ""
echo "  手动触发一次验证："
echo "    gcloud run jobs execute $JOB_NAME --region=$REGION --project=$PROJECT_ID --wait"
echo ""
echo "  查看 GCS 中的备份："
echo "    gcloud storage ls gs://print-482914-images/neon-backups/"
echo "════════════════════════════════════════════════════════════"
