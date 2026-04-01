#!/bin/bash
PROJECT_ID=print-482914
REGION=us-central1
DB_NAME=suvernireplus
INSTANCE=print1600

echo "Re-deploying Cloud Function with the fixed connection code..."
gcloud functions deploy db-export \
  --gen2 \
  --runtime nodejs20 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --source=functions/db-export \
  --entry-point=exportDb \
  --trigger-http \
  --set-env-vars BACKUP_BUCKET=${PROJECT_ID}-db-backups,CLOUD_SQL_INSTANCE=$INSTANCE,DB_NAME=$DB_NAME,GCP_REGION=$REGION,GCP_PROJECT=$PROJECT_ID

echo "Deployment complete! Triggering the backup job immediately..."
gcloud scheduler jobs run daily-db-backup --location=$REGION --project=$PROJECT_ID

echo "Done! The database is now performing the backup in the background."
echo "Please wait 60秒 然后刷新之前的浏览器存储桶页面查看最新打包文件！"
