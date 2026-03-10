#!/bin/bash
# 创建每日 DB 备份：Cloud Function (db-export) + Cloud Scheduler
# 使用前：已创建 GCS 桶、Cloud SQL 实例；执行前请确认 GCP_PROJECT_ID
# 2026-03-05 计划：每日快照与冷备份
set -e

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
BACKUP_BUCKET=${BACKUP_BUCKET:-${PROJECT_ID}-db-backups}
FUNCTION_NAME=${FUNCTION_NAME:-db-export}
SCHEDULER_NAME=${SCHEDULER_NAME:-daily-db-backup}
# Scheduler 使用的服务账号（需具备 run.invoker）；默认用 compute SA
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SCHEDULER_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Project: $PROJECT_ID Region: $REGION Bucket: $BACKUP_BUCKET"

# 部署 Cloud Function (2nd gen，等价于 Cloud Run 服务)
echo "Deploying Cloud Function $FUNCTION_NAME..."
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR/functions/db-export"
npm install --production
gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=. \
  --entry-point=exportDb \
  --trigger-http \
  --no-allow-unauthenticated \
  --set-env-vars "BACKUP_BUCKET=$BACKUP_BUCKET,DB_NAME=suvernireplus,CLOUD_SQL_INSTANCE=print-main-db,GCP_REGION=$REGION" \
  --project=$PROJECT_ID

# Gen2 部署为 Cloud Run 服务，服务名与 Function 名一致
echo "Granting Scheduler SA permission to invoke function..."
gcloud run services add-iam-policy-binding $FUNCTION_NAME \
  --region=$REGION \
  --member="serviceAccount:${SCHEDULER_SA}" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID

# 获取 Function 的 HTTP URL
FUNC_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --gen2 --format='value(serviceConfig.uri)' --project=$PROJECT_ID 2>/dev/null || true)
if [ -z "$FUNC_URL" ]; then
  echo "Could not get function URL. Create Scheduler manually; see docs/backup-restore.md"
  exit 1
fi

echo "Creating Cloud Scheduler job $SCHEDULER_NAME (daily 02:00 UTC)..."
if gcloud scheduler jobs describe $SCHEDULER_NAME --location=$REGION --project=$PROJECT_ID &>/dev/null; then
  gcloud scheduler jobs update http $SCHEDULER_NAME \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --uri="$FUNC_URL" \
    --http-method=POST \
    --oidc-service-account-email="$SCHEDULER_SA" \
    --oidc-token-audience="$FUNC_URL" \
    --project=$PROJECT_ID
else
  gcloud scheduler jobs create http $SCHEDULER_NAME \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --uri="$FUNC_URL" \
    --http-method=POST \
    --oidc-service-account-email="$SCHEDULER_SA" \
    --oidc-token-audience="$FUNC_URL" \
    --project=$PROJECT_ID
fi

echo "Done. Function SA needs Cloud SQL export + GCS write: ensure default compute SA has roles/cloudsql.admin (or export only) and roles/storage.objectAdmin on gs://$BACKUP_BUCKET"
