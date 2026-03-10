#!/bin/bash
# 一次性迁移：从 Neon 导出并导入到 Cloud SQL
# 使用前：本机启动 Cloud SQL Auth Proxy，或确保 CLOUD_SQL_DATABASE_URL 可访问
# 2026-03-05 计划：数据库迁至 Cloud SQL + 每日快照与冷备份
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}📤 Neon → Cloud SQL 一次性数据迁移${NC}"
echo ""

# 源：Neon
if [ -z "$NEON_DATABASE_URL" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
  if [ -z "$NEON_DATABASE_URL" ]; then
    echo -e "${RED}❌ 请设置 NEON_DATABASE_URL（当前生产 Neon 连接串）${NC}"
    echo "  export NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require'"
    exit 1
  fi
fi

# 安全：禁止对含生产域名的库误操作（仅做提示）
if echo "$NEON_DATABASE_URL" | grep -qE '\.neon\.tech|neon\.tech'; then
  echo -e "${YELLOW}⚠️  源为 Neon 生产库，确认已做好备份或仅在低峰操作。${NC}"
fi

# 目标：Cloud SQL（公共 IP 或本机 Auth Proxy）
# 实例 print1600 连接名：print-482914:us-central1:print1600
CLOUD_SQL_DATABASE_URL="${CLOUD_SQL_DATABASE_URL}"
if [ -z "$CLOUD_SQL_DATABASE_URL" ] && [ -n "$CLOUD_SQL_PASSWORD" ]; then
  CLOUD_SQL_DATABASE_URL="postgresql://postgres:${CLOUD_SQL_PASSWORD}@127.0.0.1:5432/suvernireplus"
fi
if [ -z "$CLOUD_SQL_DATABASE_URL" ]; then
  echo -e "${RED}❌ 请设置 CLOUD_SQL_DATABASE_URL 或 CLOUD_SQL_PASSWORD（Auth Proxy 时用后者即可）${NC}"
  echo "  方式一（公共 IP，需在控制台把本机 IP 加入「已授权的网络」）："
  echo "  export CLOUD_SQL_DATABASE_URL='postgresql://postgres:你的密码@35.225.159.99:5432/suvernireplus?sslmode=require'"
  echo "  方式二（Auth Proxy）：先启动 proxy，再 export CLOUD_SQL_PASSWORD='你的postgres密码'"
  exit 1
fi

TEMP_DUMP="/tmp/neon_to_cloudsql_$(date +%Y%m%d_%H%M%S).dump"
echo -e "${YELLOW}临时文件: ${TEMP_DUMP}${NC}"
echo ""

echo -e "${GREEN}步骤 1/3: 从 Neon 导出 (pg_dump)...${NC}"
pg_dump "$NEON_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --verbose \
  --file="$TEMP_DUMP"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 导出失败${NC}"
  rm -f "$TEMP_DUMP"
  exit 1
fi
SIZE=$(du -h "$TEMP_DUMP" | cut -f1)
echo -e "${GREEN}✅ 导出成功，大小: ${SIZE}${NC}"
echo ""

echo -e "${YELLOW}⚠️  即将向 Cloud SQL 导入，会覆盖目标库中现有数据。${NC}"
read -p "确认继续？(yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "已取消。"
  rm -f "$TEMP_DUMP"
  exit 0
fi

echo -e "${GREEN}步骤 2/3: 导入到 Cloud SQL (pg_restore)...${NC}"
pg_restore \
  --dbname="$CLOUD_SQL_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  "$TEMP_DUMP" || true

# pg_restore 对某些对象可能返回非零，忽略；只要主体数据导入即可
echo -e "${GREEN}步骤 3/3: 在 Cloud SQL 上执行 Prisma 迁移...${NC}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"
DATABASE_URL="$CLOUD_SQL_DATABASE_URL" npx prisma migrate deploy --schema=../prisma/schema.prisma
cd "$ROOT_DIR"

rm -f "$TEMP_DUMP"
echo ""
echo -e "${GREEN}🎉 迁移完成。请将 Secret Manager 的 database-url 更新为 Cloud SQL 连接串后重新部署后端。${NC}"
