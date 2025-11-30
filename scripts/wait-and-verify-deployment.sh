#!/bin/bash
# 等待部署完成并验证所有功能
# [2025-01-29 14:35:00]

BUILD_ID=${1:-"0dddc675-a6d5-41f8-88d2-80958f941a31"}
PROJECT_ID="moonlit-gamma-479502-r6"
REGION="us-central1"

FRONTEND_URL="https://print-main-frontend-234065158862.us-central1.run.app"
BACKEND_URL="https://print-main-backend-234065158862.us-central1.run.app"

echo "=== 等待部署完成并验证 ==="
echo "构建 ID: $BUILD_ID"
echo "项目: $PROJECT_ID"
echo ""
echo "前端: $FRONTEND_URL"
echo "后端: $BACKEND_URL"
echo ""

# 等待构建完成
echo "⏳ 等待构建完成..."
while true; do
  STATUS=$(gcloud builds describe $BUILD_ID \
    --project=$PROJECT_ID \
    --format="value(status)" 2>/dev/null)
  
  if [ -z "$STATUS" ]; then
    echo "⏳ 获取构建状态..."
    sleep 5
    continue
  fi
  
  TIMESTAMP=$(date '+%H:%M:%S')
  
  case $STATUS in
    QUEUED)
      echo "[$TIMESTAMP] ⏳ 状态: QUEUED - 排队中..."
      ;;
    WORKING)
      echo "[$TIMESTAMP] 🔨 状态: WORKING - 正在构建..."
      ;;
    SUCCESS)
      echo "[$TIMESTAMP] ✅ 状态: SUCCESS - 部署成功！"
      echo ""
      echo "等待服务就绪（30秒）..."
      sleep 30
      break
      ;;
    FAILURE|CANCELLED|TIMEOUT|INTERNAL_ERROR)
      echo "[$TIMESTAMP] ❌ 状态: $STATUS - 部署失败"
      echo ""
      echo "查看错误日志:"
      echo "https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=234065158862"
      exit 1
      ;;
    *)
      echo "[$TIMESTAMP] 📊 状态: $STATUS"
      ;;
  esac
  
  sleep 15
done

echo ""
echo "=== 开始验证 ==="
echo ""

# 1. 检查后端服务状态
echo "1️⃣  检查后端服务..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "503" ]; then
  echo "   ✅ 后端服务响应 (状态码: $BACKEND_STATUS)"
else
  echo "   ⚠️  后端服务状态码: $BACKEND_STATUS"
fi

# 2. 检查 CORS
echo ""
echo "2️⃣  检查 CORS 配置..."
CORS_HEADER=$(curl -s -I -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/api/categories" 2>/dev/null | grep -i "access-control-allow-origin")
if [ -n "$CORS_HEADER" ]; then
  echo "   ✅ CORS 头已设置: $CORS_HEADER"
else
  echo "   ⚠️  CORS 头未找到"
fi

# 3. 测试 API 端点
echo ""
echo "3️⃣  测试 API 端点..."

# Categories API
echo "   - Categories API..."
CATEGORIES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/api/categories" 2>/dev/null)
echo "     状态码: $CATEGORIES_STATUS"

# Products API
echo "   - Products API..."
PRODUCTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/api/products?page=1&limit=12" 2>/dev/null)
echo "     状态码: $PRODUCTS_STATUS"

# Content API
echo "   - Content API..."
CONTENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/api/content" 2>/dev/null)
echo "     状态码: $CONTENT_STATUS"

# 4. 检查前端服务
echo ""
echo "4️⃣  检查前端服务..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null)
echo "   前端服务状态码: $FRONTEND_STATUS"

echo ""
echo "=== 验证完成 ==="
echo ""
echo "✅ 如果所有状态码都是 200，说明部署成功！"
echo ""
echo "访问前端网站测试："
echo "$FRONTEND_URL"
echo ""

