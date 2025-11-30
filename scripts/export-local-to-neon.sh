#!/bin/bash
# [2025-01-29 02:30:00] 从本地数据库导出数据到 Neon 数据库
# 使用方法: ./scripts/export-local-to-neon.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}📤 从本地数据库导出数据到 Neon 数据库...${NC}\n"

# 检查本地数据库连接
LOCAL_DB_URL="${LOCAL_DATABASE_URL:-postgresql://eric@localhost:5432/suvernireplus?sslmode=disable}"
echo -e "${YELLOW}本地数据库: ${LOCAL_DB_URL}${NC}"

# 检查 Neon 数据库连接
if [ -z "$NEON_DATABASE_URL" ]; then
  echo -e "${RED}❌ 错误: 请设置 NEON_DATABASE_URL 环境变量${NC}"
  echo -e "${YELLOW}示例:${NC}"
  echo -e "export NEON_DATABASE_URL=\"postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require\""
  exit 1
fi

echo -e "${YELLOW}Neon 数据库: ${NEON_DATABASE_URL}${NC}\n"

# 创建临时备份文件
TEMP_BACKUP="/tmp/neon_import_$(date +%Y%m%d_%H%M%S).dump"
echo -e "${GREEN}📦 步骤 1: 从本地数据库导出数据...${NC}"
pg_dump "$LOCAL_DB_URL" \
  --format=custom \
  --file="$TEMP_BACKUP" \
  --verbose \
  --no-owner \
  --no-acl

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 导出失败！${NC}"
  exit 1
fi

BACKUP_SIZE=$(du -h "$TEMP_BACKUP" | cut -f1)
echo -e "${GREEN}✅ 导出成功！文件大小: ${BACKUP_SIZE}${NC}\n"

# 确认导入
echo -e "${YELLOW}⚠️  警告: 这将覆盖 Neon 数据库中的所有数据！${NC}"
read -p "确认要继续吗？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}操作已取消${NC}"
  rm -f "$TEMP_BACKUP"
  exit 0
fi

# 导入到 Neon
echo -e "\n${GREEN}📥 步骤 2: 导入数据到 Neon 数据库...${NC}"
pg_restore \
  --dbname="$NEON_DATABASE_URL" \
  --clean \
  --if-exists \
  --verbose \
  --no-owner \
  --no-acl \
  "$TEMP_BACKUP"

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✅ 数据导入成功！${NC}"
  
  # 清理临时文件
  rm -f "$TEMP_BACKUP"
  
  # 运行 Prisma migrations 确保 schema 是最新的
  echo -e "\n${GREEN}🔧 步骤 3: 运行 Prisma migrations...${NC}"
  cd backend
  DATABASE_URL="$NEON_DATABASE_URL" npx prisma migrate deploy --schema=../prisma/schema.prisma || true
  cd ..
  
  echo -e "\n${GREEN}🎉 完成！数据已成功导入到 Neon 数据库${NC}"
else
  echo -e "\n${RED}❌ 导入失败！${NC}"
  rm -f "$TEMP_BACKUP"
  exit 1
fi

