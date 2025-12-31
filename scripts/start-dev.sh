#!/bin/bash
# 快速启动开发环境脚本
# 用途：同时启动后端和前端开发服务器
# 使用方法：./scripts/start-dev.sh

set -e

cd "$(dirname "$0")/.."

echo "[$(date +'%Y-%m-%d %H:%M:%S')] 启动开发环境..."

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
  echo "⚠️  依赖未安装，正在安装..."
  npm install
fi

if [ ! -d "backend/node_modules" ]; then
  echo "⚠️  后端依赖未安装，正在安装..."
  cd backend && npm install && cd ..
fi

if [ ! -d "apps/web/node_modules" ]; then
  echo "⚠️  前端依赖未安装，正在安装..."
  cd apps/web && npm install && cd ..
fi

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
  echo "⚠️  后端 .env 文件不存在，从模板创建..."
  cp backend/env.example backend/.env
  echo "📝 请编辑 backend/.env 文件，配置数据库连接等必要信息"
fi

if [ ! -f "apps/web/.env.local" ]; then
  echo "⚠️  前端 .env.local 文件不存在，正在创建..."
  cat > apps/web/.env.local << 'ENVEOF'
# API 配置（指向本地后端）
NEXT_PUBLIC_API_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
ENVEOF
fi

# 启动后端（后台运行）
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 启动后端服务器 (端口 3001)..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 等待后端服务器启动..."
sleep 5

# 检查后端是否启动成功
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "⚠️  后端健康检查失败，但继续启动前端..."
else
  echo "✅ 后端服务器已启动"
fi

# 启动前端（前台运行，便于查看日志）
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 启动前端服务器 (端口 3000)..."
echo "📝 前端将在 http://localhost:3000 启动"
echo "📝 Design Lab 地址: http://localhost:3000/design-lab"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

cd apps/web
npm run dev

# 清理：当脚本退出时停止后端
trap "echo '停止后端服务器...'; kill $BACKEND_PID 2>/dev/null || true; exit" INT TERM

