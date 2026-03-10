#!/bin/bash
# 迁移前准备：在 Cloud SQL 实例 print1600 上创建数据库（若不存在）
# 用法：GCP_PROJECT_ID=print-482914 ./scripts/prepare-cloudsql-for-migration.sh
# 2026-03-05 实例：print1600，连接名 print-482914:us-central1:print1600
set -e

PROJECT_ID=${GCP_PROJECT_ID:-print-482914}
INSTANCE=${CLOUD_SQL_INSTANCE:-print1600}
DB_NAME=${DB_NAME:-suvernireplus}

echo "Project: $PROJECT_ID Instance: $INSTANCE Database: $DB_NAME"

if ! gcloud sql databases describe "$DB_NAME" --instance="$INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
  echo "Creating database $DB_NAME on instance $INSTANCE..."
  gcloud sql databases create "$DB_NAME" --instance="$INSTANCE" --project="$PROJECT_ID"
  echo "Done."
else
  echo "Database $DB_NAME already exists."
fi

echo ""
echo "Next: set NEON_DATABASE_URL and CLOUD_SQL_DATABASE_URL, then run ./scripts/migrate-neon-to-cloudsql.sh"
