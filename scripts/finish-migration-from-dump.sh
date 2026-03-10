#!/bin/bash
# 从已有 dump 完成导入 + Prisma 迁移（导出已完成时使用）
# 用法：./scripts/finish-migration-from-dump.sh '你的Cloud_SQL的postgres密码'
# 前提：Auth Proxy 已启动在 127.0.0.1:5433，或改用 CLOUD_SQL_DATABASE_URL 直连
# 2026-03-05
set -e

if [ -z "$1" ]; then
  echo "用法: $0 '你的Cloud_SQL的postgres密码'"
  exit 1
fi

DUMP_FILE="${MIGRATION_DUMP_FILE:-/tmp/neon_to_cloudsql_20260305_232508.dump}"
if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump 文件不存在: $DUMP_FILE"
  echo "请先运行完整迁移或设置 MIGRATION_DUMP_FILE=路径"
  exit 1
fi

CLOUD_SQL_PORT=${CLOUD_SQL_PORT:-5433}
if [ "$CLOUD_SQL_PORT" = "5432" ]; then
  CLOUD_SQL_DATABASE_URL="postgresql://postgres:$1@35.225.159.99:5432/suvernireplus?sslmode=require"
else
  CLOUD_SQL_DATABASE_URL="postgresql://postgres:$1@127.0.0.1:${CLOUD_SQL_PORT}/suvernireplus"
fi

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "导入 $DUMP_FILE 到 Cloud SQL..."
pg_restore --dbname="$CLOUD_SQL_DATABASE_URL" --clean --if-exists --no-owner --no-acl --verbose "$DUMP_FILE" || true

echo "执行 Prisma migrate deploy..."
cd "$ROOT_DIR/backend"
DATABASE_URL="$CLOUD_SQL_DATABASE_URL" npx prisma migrate deploy --schema=../prisma/schema.prisma
cd "$ROOT_DIR"

echo "迁移完成。请更新 Secret Manager 的 database-url 并重新部署后端。"
