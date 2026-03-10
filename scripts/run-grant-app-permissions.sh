#!/bin/bash
# 以 postgres 连接 Cloud SQL 并执行 GRANT，解决 app 用户 500 权限错误
# 用法：CLOUD_SQL_POSTGRES_PASSWORD='postgres的密码' ./scripts/run-grant-app-permissions.sh
# 或先启动 Auth Proxy（port 5433），再设置密码后执行
# 2026-03-06
set -e

if [ -z "$CLOUD_SQL_POSTGRES_PASSWORD" ]; then
  echo "请设置 postgres 密码: CLOUD_SQL_POSTGRES_PASSWORD='你的密码' $0"
  echo "或到 GCP 控制台 → Cloud SQL → print1600 → Cloud SQL Studio → 用 postgres 登录后执行 scripts/grant-app-permissions.sql"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=${CLOUD_SQL_PORT:-5433}
export PGPASSWORD="$CLOUD_SQL_POSTGRES_PASSWORD"
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
psql -h 127.0.0.1 -p "$PORT" -U postgres -d suvernireplus -f "$ROOT_DIR/scripts/grant-app-permissions.sql"
echo "✅ app 用户权限已授予"
