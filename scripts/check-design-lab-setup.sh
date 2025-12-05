#!/bin/bash
# [2025-01-30 23:55:00] Design Lab 本地测试环境检查脚本
# 用途：快速检查 Design Lab 测试环境是否准备就绪

set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "Design Lab 本地测试环境检查"
echo "=========================================="
echo ""

# 检查 Node.js
echo -n "✓ Node.js 版本: "
if command -v node &> /dev/null; then
  node --version
else
  echo "❌ 未安装"
  exit 1
fi

# 检查 npm
echo -n "✓ npm 版本: "
if command -v npm &> /dev/null; then
  npm --version
else
  echo "❌ 未安装"
  exit 1
fi

echo ""

# 检查依赖
echo "依赖检查:"
echo -n "  - 根目录依赖: "
[ -d "node_modules" ] && echo "✅ 已安装" || echo "❌ 未安装 (运行: npm install)"

echo -n "  - 后端依赖: "
[ -d "backend/node_modules" ] && echo "✅ 已安装" || echo "❌ 未安装 (运行: npm install)"

echo -n "  - 前端依赖: "
[ -d "apps/web/node_modules" ] && echo "✅ 已安装" || echo "❌ 未安装 (运行: npm install)"

echo ""

# 检查配置文件
echo "配置文件:"
echo -n "  - 后端 .env: "
if [ -f "backend/.env" ]; then
  echo "✅ 存在"
  # 检查关键配置
  if grep -q "DATABASE_URL" backend/.env; then
    echo "    ✓ DATABASE_URL 已配置"
  else
    echo "    ⚠️  DATABASE_URL 未配置"
  fi
  if grep -q "JWT_SECRET" backend/.env && ! grep -q "please_replace" backend/.env; then
    echo "    ✓ JWT_SECRET 已配置"
  else
    echo "    ⚠️  JWT_SECRET 需要配置"
  fi
else
  echo "❌ 不存在 (从 backend/env.example 创建)"
fi

echo -n "  - 前端 .env.local: "
if [ -f "apps/web/.env.local" ]; then
  echo "✅ 存在"
  # 检查 API 配置
  if grep -q "NEXT_PUBLIC_API_URL" apps/web/.env.local; then
    API_URL=$(grep "NEXT_PUBLIC_API_URL" apps/web/.env.local | cut -d '=' -f2)
    echo "    ✓ NEXT_PUBLIC_API_URL = $API_URL"
  else
    echo "    ⚠️  NEXT_PUBLIC_API_URL 未配置"
  fi
else
  echo "❌ 不存在 (需要创建)"
fi

echo ""

# 检查服务运行状态
echo "服务状态:"
echo -n "  - 后端服务 (http://localhost:3001): "
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✅ 运行中"
  BACKEND_RUNNING=true
else
  echo "❌ 未运行 (启动: cd backend && npm run dev)"
  BACKEND_RUNNING=false
fi

echo -n "  - 前端服务 (http://localhost:3000): "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ 运行中"
  FRONTEND_RUNNING=true
else
  echo "❌ 未运行 (启动: cd apps/web && npm run dev)"
  FRONTEND_RUNNING=false
fi

echo ""

# 检查数据（需要后端运行）
if [ "$BACKEND_RUNNING" = true ]; then
  echo "数据检查:"
  
  echo -n "  - 产品数据: "
  PRODUCT_RESPONSE=$(curl -s http://localhost:3001/api/products?page=1&limit=1 2>/dev/null)
  if echo "$PRODUCT_RESPONSE" | grep -q "data"; then
    PRODUCT_COUNT=$(echo "$PRODUCT_RESPONSE" | grep -o '"total"[^,]*' | grep -o '[0-9]*' | head -1)
    if [ -n "$PRODUCT_COUNT" ] && [ "$PRODUCT_COUNT" -gt 0 ]; then
      echo "✅ 有数据 ($PRODUCT_COUNT 个产品)"
    else
      echo "❌ 无数据 (运行: cd backend && node scripts/seed-demo.js)"
    fi
  else
    echo "❌ API 错误或无法访问"
  fi
  
  echo -n "  - 艺术库数据: "
  ART_RESPONSE=$(curl -s http://localhost:3001/api/art-assets 2>/dev/null)
  if echo "$ART_RESPONSE" | grep -q "data\|success"; then
    echo "✅ 有数据"
  else
    echo "⚠️  无数据 (可通过 Admin 面板上传: http://localhost:3000/admin/art-assets)"
  fi
else
  echo "数据检查: ⏭️  跳过 (后端未运行)"
fi

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo ""
echo "下一步:"
if [ "$BACKEND_RUNNING" = false ] || [ "$FRONTEND_RUNNING" = false ]; then
  echo "  1. 启动服务: ./scripts/start-dev.sh"
  echo "  2. 或分别启动:"
  echo "     - 后端: cd backend && npm run dev"
  echo "     - 前端: cd apps/web && npm run dev"
fi
echo "  3. 访问 Design Lab: http://localhost:3000/design-lab"
echo ""

