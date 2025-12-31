#!/bin/bash
# Git Bisect 验证脚本
# 用于二分法定位问题提交

set -e

echo "🔍 验证当前提交..."

# 检查是否在 apps/web 目录
if [ ! -f "package.json" ]; then
    cd apps/web 2>/dev/null || { echo "❌ 请在项目根目录或 apps/web 目录运行"; exit 1; }
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm ci || npm install
fi

# 构建项目
echo "🔨 构建项目..."
npm run build || { echo "❌ 构建失败"; exit 125; }

# 启动服务器（后台）
echo "🚀 启动服务器..."
npm run start > /tmp/nextjs-server.log 2>&1 &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 10

# 检查服务器是否启动
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 服务器未启动"
    kill $SERVER_PID 2>/dev/null || true
    exit 125
fi

# 运行 smoke 测试
echo "🧪 运行 smoke 测试..."
cd ../..
node scripts/smoke-routes.mjs
SMOKE_RESULT=$?

# 停止服务器
echo "🛑 停止服务器..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

# 返回结果
if [ $SMOKE_RESULT -eq 0 ]; then
    echo "✅ 验证通过：当前提交是好的"
    exit 0
else
    echo "❌ 验证失败：当前提交有问题"
    exit 1
fi

