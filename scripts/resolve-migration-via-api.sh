#!/bin/bash
# 通过 API 端点解决失败的迁移
# 修复时间: 2026-01-06T23:20:00.000Z

set -e

BACKEND_URL="https://print-main-backend-5spbppmmza-uc.a.run.app"
API_URL="${BACKEND_URL}/api/admin-seed/migrate"

echo "🔧 通过 API 解决失败的迁移"
echo "=========================================="
echo "API URL: ${API_URL}"
echo ""

# 需要管理员 token，这里先提示用户
echo "⚠️  注意: 此方法需要管理员认证"
echo "请先登录获取 token，然后运行:"
echo ""
echo "curl -X POST ${API_URL} \\"
echo "  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \\"
echo "  -H 'Content-Type: application/json'"
echo ""
echo "或者使用浏览器访问管理后台，手动触发迁移"
echo ""

# 如果提供了 token，直接执行
if [ -n "$1" ]; then
    TOKEN=$1
    echo "使用提供的 token 执行迁移..."
    curl -X POST "${API_URL}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -v
else
    echo "未提供 token，请手动执行或提供 token 作为参数"
    echo "用法: ./scripts/resolve-migration-via-api.sh YOUR_ADMIN_TOKEN"
fi

