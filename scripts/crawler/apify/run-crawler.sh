#!/bin/bash
# [2025-12-17] CustomInk 素材抓取定时任务脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

# 加载环境变量
export DATABASE_URL="postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export GCP_PROJECT_ID="moonlit-gamma-479502-r6"
export GCP_IMAGE_BUCKET="print-main-assets"

# 运行抓取脚本（使用绝对路径）
cd "$PROJECT_ROOT"
npx ts-node "$PROJECT_ROOT/scripts/crawler/apify/customink-clipart-scheduled.ts" >> /tmp/customink-crawler.log 2>&1

