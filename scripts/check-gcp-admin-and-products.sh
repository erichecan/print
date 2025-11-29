#!/bin/bash
# [2025-11-28 17:20:00] 检查 GCP 生产环境的 Admin 用户和商品数据

BACKEND_URL="https://print-main-backend-hsbqzlnkxa-uc.a.run.app"
FRONTEND_URL="https://print-main-frontend-hsbqzlnkxa-uc.a.run.app"

echo "=== 检查 GCP 生产环境数据库状态 ==="
echo ""

echo "1. 检查 Admin 用户..."
echo "   尝试登录..."
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@suvernireplus.com","password":"admin123"}')

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o '"error"\|"user"\|"token"' | head -1)

if echo "$LOGIN_RESPONSE" | grep -q '"user"'; then
  echo "   ✅ Admin 用户存在且密码正确"
  echo "$LOGIN_RESPONSE" | grep -o '"role":"[^"]*"' | head -1
else
  echo "   ❌ Admin 登录失败"
  echo "   响应: $LOGIN_RESPONSE"
fi

echo ""
echo "2. 检查商品数据..."
PRODUCTS_RESPONSE=$(curl -s "${BACKEND_URL}/api/products?limit=1")
PRODUCT_COUNT=$(echo "$PRODUCTS_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$PRODUCT_COUNT" ]; then
  echo "   ⚠️  无法获取商品数量"
  echo "   响应: $PRODUCTS_RESPONSE"
elif [ "$PRODUCT_COUNT" -eq 0 ]; then
  echo "   ❌ 数据库中没有商品数据（总数: 0）"
  echo "   建议：运行数据库 seed"
else
  echo "   ✅ 数据库中有商品数据（总数: $PRODUCT_COUNT）"
fi

echo ""
echo "3. 检查分类数据..."
CATEGORIES_RESPONSE=$(curl -s "${BACKEND_URL}/api/categories")
CATEGORY_COUNT=$(echo "$CATEGORIES_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$CATEGORY_COUNT" -eq 0 ]; then
  echo "   ❌ 数据库中没有分类数据"
else
  echo "   ✅ 数据库中有分类数据（约 $CATEGORY_COUNT 个）"
fi

echo ""
echo "=== 检查完成 ==="

