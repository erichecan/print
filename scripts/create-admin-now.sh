#!/bin/bash
# [2025-11-28 12:55:00] 立即创建 Admin 用户的脚本
# 通过调用后端 API 或直接执行脚本

echo "=== 立即创建 Admin 用户 ==="
echo ""

BACKEND_URL="https://print-main-backend-hsbqzlnkxa-uc.a.run.app"

# 方法 1: 如果新 API 端点已部署
echo "尝试通过 API 端点创建用户..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/admin-setup/create-user" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "success.*true"; then
  echo "✅ Admin 用户创建成功！"
  echo "$RESPONSE" | jq .
  exit 0
fi

echo "API 端点尚未部署，请等待部署完成后再试"
echo ""
echo "或者等待部署完成后访问："
echo "  ${BACKEND_URL}/api/admin-setup/create-user"
echo ""
echo "Admin 登录信息："
echo "  邮箱: admin@suvernireplus.com"
echo "  密码: admin123"

