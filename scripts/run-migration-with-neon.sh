#!/bin/bash
# 仅需传入 Cloud SQL 的 postgres 密码即可执行迁移（Neon 源从环境变量读取）
# 用法：NEON_DATABASE_URL='...' $0 '你的Cloud_SQL的postgres密码'
# 或：  export NEON_DATABASE_URL='...' 后执行 $0 'postgres密码'
# 前提：本机 IP 已加入 Cloud SQL print1600「已授权的网络」，或已启动 Auth Proxy
# 2026-03-05
set -e

if [ -z "$1" ]; then
  echo "用法: NEON_DATABASE_URL='postgresql://...' $0 '你的Cloud_SQL的postgres密码'"
  echo "前提: 公共 IP 时在控制台为 print1600 添加本机 IP；Auth Proxy 时设 CLOUD_SQL_PORT=5433 并先启动 proxy"
  exit 1
fi

if [ -z "$NEON_DATABASE_URL" ]; then
  echo "请设置 NEON_DATABASE_URL（当前 Neon 连接串）"
  exit 1
fi

CLOUD_SQL_PORT=${CLOUD_SQL_PORT:-5432}
if [ "$CLOUD_SQL_PORT" = "5432" ]; then
  export CLOUD_SQL_DATABASE_URL="postgresql://postgres:$1@35.225.159.99:5432/suvernireplus?sslmode=require"
else
  export CLOUD_SQL_DATABASE_URL="postgresql://postgres:$1@127.0.0.1:${CLOUD_SQL_PORT}/suvernireplus"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
exec ./scripts/migrate-neon-to-cloudsql.sh
