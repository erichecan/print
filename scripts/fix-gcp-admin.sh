#!/bin/bash
# 修复 GCP 生产环境的 Admin 用户

BACKEND_URL="https://print-main-backend-hsbqzlnkxa-uc.a.run.app"

echo "=== 修复 GCP 生产环境 Admin 用户 ==="
echo ""

echo "正在通过 API 创建/更新 Admin 用户..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/admin-setup/create-user" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ Admin 用户创建/更新成功！"
  echo ""
  echo "登录信息："
  echo "  邮箱: admin@suvernireplus.com"
  echo "  密码: admin123"
  echo "  登录页面: ${BACKEND_URL//\/api//admin/login}"
else
  echo ""
  echo "❌ Admin 用户创建/更新失败"
  echo "请检查后端服务是否正常运行"
fi

