#!/usr/bin/env bash
# 2026-04-21 一键本地启动：生成 Prisma client → 应用迁移 → 起后端 → 起前端
# 用法：
#   bash scripts/dev-start.sh                       # 默认前端 3100，后端 3001
#   FRONTEND_PORT=3200 bash scripts/dev-start.sh    # 指定前端端口
#   BACKEND_PORT=3201 bash scripts/dev-start.sh     # 指定后端端口（自动改 apps/web/.env.local）
# 终止：Ctrl+C 自动清理子进程

set -eo pipefail

# 2026-04-21 明确初始化，防止上游环境里混入怪值
: "${FRONTEND_PORT:=3100}"
: "${BACKEND_PORT:=3001}"
export FRONTEND_PORT BACKEND_PORT

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.dev-logs"
mkdir -p "$LOG_DIR"

port_in_use() {
  lsof -iTCP:"$1" -sTCP:LISTEN -Pn -t 2>/dev/null | head -1
}

echo "==> 检查端口占用"
if pid=$(port_in_use "$FRONTEND_PORT"); then
  echo "❌ 前端端口 $FRONTEND_PORT 被进程 $pid 占用。改个端口再跑："
  echo "   FRONTEND_PORT=3200 bash scripts/dev-start.sh"
  exit 1
fi
if pid=$(port_in_use "$BACKEND_PORT"); then
  echo "❌ 后端端口 $BACKEND_PORT 被进程 $pid 占用。改个端口再跑："
  echo "   BACKEND_PORT=3201 bash scripts/dev-start.sh"
  exit 1
fi
echo "    前端 $FRONTEND_PORT / 后端 $BACKEND_PORT 都空闲"

# 如果后端端口不是默认 3001，同步改 backend/.env 的 PORT + 前端 .env.local 的 API 地址
if [[ "$BACKEND_PORT" != "3001" ]]; then
  echo "==> 同步后端端口到 backend/.env 和 apps/web/.env.local"
  sed -i.bak -E "s#^PORT=.*#PORT=${BACKEND_PORT}#" backend/.env
  sed -i.bak -E "s#http://127\.0\.0\.1:3001#http://127.0.0.1:${BACKEND_PORT}#g" apps/web/.env.local
fi

echo "==> [1/4] Prisma generate（生成客户端）"
npx prisma generate

echo "==> [2/4] Prisma migrate deploy（应用 status_to_string 迁移到 dev branch）"
# 2026-04-21 用 deploy 而不是 dev：dev branch 是 prod 克隆，
# 不需要 shadow db 重放历史（会撞 Neon 的 serverless 限制）
npx prisma migrate deploy

echo "==> [3/4] 启动后端（端口 $BACKEND_PORT，日志：$LOG_DIR/backend.log）"
( cd backend && npm run dev ) > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "    backend pid=$BACKEND_PID"

echo "==> [4/4] 启动前端（端口 $FRONTEND_PORT，日志：$LOG_DIR/frontend.log）"
( cd apps/web && npx next dev -p "$FRONTEND_PORT" ) > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "    frontend pid=$FRONTEND_PID"

cleanup() {
  echo
  echo "==> 收到信号，关闭后端/前端..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  # 端口上残留进程也一并清理
  for p in "$FRONTEND_PORT" "$BACKEND_PORT"; do
    if pid=$(port_in_use "$p"); then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM

echo "==> 等待后端 (http://localhost:$BACKEND_PORT/api/health) ..."
for i in {1..40}; do
  if curl -fsS "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    echo "    后端已就绪"
    break
  fi
  sleep 1
  if [[ $i -eq 40 ]]; then
    echo "    ⚠️  后端 40s 未就绪，看 $LOG_DIR/backend.log"
  fi
done

echo "==> 等待前端 (http://localhost:$FRONTEND_PORT) ..."
for i in {1..90}; do
  if curl -fsS "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo "    前端已就绪"
    break
  fi
  sleep 1
  if [[ $i -eq 90 ]]; then
    echo "    ⚠️  前端 90s 未就绪，看 $LOG_DIR/frontend.log"
  fi
done

echo
echo "================================================================"
echo "  本地服务启动完成"
echo "================================================================"
echo "  前端：http://localhost:$FRONTEND_PORT"
echo "  后端：http://localhost:$BACKEND_PORT"
echo
echo "  关键页面："
echo "  - 创建订单：    http://localhost:$FRONTEND_PORT/offline-orders"
echo "  - 销售登录：    http://localhost:$FRONTEND_PORT/offline-orders/sales/login"
echo "  - 订单管理：    http://localhost:$FRONTEND_PORT/offline-orders/sales/orders"
echo
echo "  日志："
echo "  - tail -f $LOG_DIR/backend.log"
echo "  - tail -f $LOG_DIR/frontend.log"
echo
echo "  Ctrl+C 关闭"
echo "================================================================"

wait
