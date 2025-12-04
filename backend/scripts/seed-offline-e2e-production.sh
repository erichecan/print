#!/bin/bash
# [2025-01-28 21:00:00] 线上环境 Seed 脚本运行助手
# 使用方法: ./seed-offline-e2e-production.sh

set -e

echo "🌱 线下订单 Seed 脚本 - 线上环境运行助手"
echo "=========================================="
echo ""

# 检查是否提供了 DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ 错误: 未设置 DATABASE_URL 环境变量"
  echo ""
  echo "请使用以下方式之一设置 DATABASE_URL:"
  echo ""
  echo "方法 1: 临时设置环境变量"
  echo "  export DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require'"
  echo "  npm run seed:offline-e2e"
  echo ""
  echo "方法 2: 一行命令运行"
  echo "  DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require' npm run seed:offline-e2e"
  echo ""
  echo "方法 3: 从 GCP Cloud Run 获取"
  echo "  gcloud run services describe <service-name> --region=us-central1 --format='value(spec.template.spec.containers[0].env)'"
  echo ""
  echo "方法 4: 从 GCP Secret Manager 获取"
  echo "  gcloud secrets versions access latest --secret=DATABASE_URL"
  echo ""
  exit 1
fi

# 显示数据库信息（隐藏密码）
DB_INFO=$(echo "$DATABASE_URL" | sed -E 's|://([^:]+):([^@]+)@|://\1:***@|')
echo "📝 数据库连接: $DB_INFO"
echo ""

# 设置生产环境
export NODE_ENV=production

# 运行 seed 脚本
echo "🚀 开始运行 seed 脚本..."
echo ""

cd "$(dirname "$0")/.."
npm run seed:offline-e2e

echo ""
echo "✅ Seed 脚本执行完成！"

