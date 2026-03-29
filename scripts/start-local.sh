#!/usr/bin/env bash
# 本地同时启动后端 + 前端，便于联调与部署前自测
# 使用：在项目根目录执行 ./scripts/start-local.sh
# 2026-03-10 新增

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
API_BASE="http://localhost:${BACKEND_PORT}/api"

echo "=============================================="
echo "  本地服务启动（后端 ${BACKEND_PORT} + 前端 ${FRONTEND_PORT}）"
echo "=============================================="
echo "  后端 API: ${API_BASE}"
echo "  前端页面: http://localhost:${FRONTEND_PORT}"
echo "  若端口被占用可指定: BACKEND_PORT=3002 FRONTEND_PORT=3003 $0"
echo "  停止: 在当前终端按 Ctrl+C"
echo "=============================================="

# 后端：必须在 backend 目录下启动（server.js 会执行 scripts/、prisma 等相对路径）
export PORT="$BACKEND_PORT"
(cd "$REPO_ROOT/backend" && node server.js) &
BACKEND_PID=$!

# 等后端先起来
sleep 4
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo "后端启动失败，请检查 backend 依赖与数据库配置（如 .env / DATABASE_URL）"
  exit 1
fi

# 前端：在 apps/web 下启动，并指定 API 地址
export NEXT_PUBLIC_API_URL="$API_BASE"
(cd "$REPO_ROOT/apps/web" && npm run dev -- -p "$FRONTEND_PORT") &
FRONTEND_PID=$!

echo ""
echo "✅ 后端 PID: $BACKEND_PID  前端 PID: $FRONTEND_PID"
echo "   请用浏览器打开: http://localhost:${FRONTEND_PORT}"
echo ""

# 前台等待，Ctrl+C 时杀两个进程
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
