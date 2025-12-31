#!/bin/bash
# 清理所有开发服务器端口和进程
# 用途：停止所有可能占用端口的开发服务器进程
# 使用方法：./scripts/cleanup-ports.sh

set -e

echo "[$(date +'%Y-%m-%d %H:%M:%S')] 开始清理端口和进程..."

# 定义要清理的端口
PORTS=(3000 3001 4000 5000 8000 8080)
KILLED_PROCESSES=0

# 清理指定端口上的进程
for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "🛑 发现端口 $PORT 被进程 $PID 占用，正在停止..."
    kill -9 $PID 2>/dev/null || true
    KILLED_PROCESSES=$((KILLED_PROCESSES + 1))
    sleep 1
  else
    echo "✅ 端口 $PORT 未被占用"
  fi
done

# 清理所有开发服务器进程（npm/yarn/pnpm dev）
echo ""
echo "🔍 查找开发服务器进程..."

# 查找所有 npm/yarn/pnpm dev 进程
DEV_PROCESSES=$(pgrep -fl "npm.*dev|yarn.*dev|pnpm.*dev|next.*dev" 2>/dev/null | grep -v "Cursor\|chrome-devtools\|context7" || true)

if [ -n "$DEV_PROCESSES" ]; then
  echo "$DEV_PROCESSES" | while read -r LINE; do
    PID=$(echo "$LINE" | awk '{print $1}')
    if [ -n "$PID" ]; then
      echo "🛑 停止开发服务器进程: $LINE"
      kill -9 $PID 2>/dev/null || true
      KILLED_PROCESSES=$((KILLED_PROCESSES + 1))
    fi
  done
else
  echo "✅ 没有发现开发服务器进程"
fi

# 清理后台日志文件
echo ""
echo "🧹 清理后台日志文件..."
if [ -f "backend.log" ]; then
  rm -f backend.log
  echo "✅ 已删除 backend.log"
fi

if [ -f "frontend.log" ]; then
  rm -f frontend.log
  echo "✅ 已删除 frontend.log"
fi

# 总结
echo ""
if [ $KILLED_PROCESSES -gt 0 ]; then
  echo "✅ 清理完成！已停止 $KILLED_PROCESSES 个进程"
else
  echo "✅ 清理完成！没有需要停止的进程"
fi

echo ""
echo "📊 当前端口占用情况："
lsof -i -P | grep LISTEN | grep -E "(3000|3001|4000|5000|5432|8000|8080)" || echo "  ✅ 所有开发端口均未被占用"

echo ""
echo "💡 提示："
echo "  - PostgreSQL (5432) 是数据库服务，通常需要保持运行"
echo "  - 如需停止 PostgreSQL，请运行: brew services stop postgresql@15"
echo "  - 启动开发服务器，请运行: ./scripts/start-dev.sh"

