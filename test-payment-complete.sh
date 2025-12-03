#!/bin/bash
# 使用 webapp-testing skill 进行完整的支付功能测试
# [2025-01-29 13:00:00]

set -e

echo "============================================================"
echo "🧪 使用 webapp-testing skill 进行支付功能测试"
echo "============================================================"

# 检查 Python 和 Playwright
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

# 安装 Playwright（如果需要）
if ! python3 -c "import playwright" 2>/dev/null; then
    echo "📦 安装 Playwright..."
    pip3 install playwright
    python3 -m playwright install chromium
fi

# 检查服务是否已运行
check_service() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "✅ 端口 $port 已有服务运行"
        return 0
    else
        echo "⚠️  端口 $port 无服务运行"
        return 1
    fi
}

# 检查服务状态
BACKEND_RUNNING=$(check_service 4000 && echo "yes" || echo "no")
FRONTEND_RUNNING=$(check_service 3000 && echo "yes" || echo "no")

if [ "$BACKEND_RUNNING" = "no" ] || [ "$FRONTEND_RUNNING" = "no" ]; then
    echo "🚀 启动服务器并运行测试..."
    echo "   注意：如果服务器启动失败，请手动启动服务后运行："
    echo "   python3 test-payment-with-webapp-testing.py http://localhost:3000"
    
    # 使用 with_server.py 管理服务器并运行测试
    # 增加超时时间，并只启动前端（如果后端已运行）
    if [ "$BACKEND_RUNNING" = "no" ] && [ "$FRONTEND_RUNNING" = "no" ]; then
        python3 .claude/skills/webapp-testing/scripts/with_server.py \
          --server "cd backend && npm run dev" --port 4000 --timeout 60 \
          --server "cd apps/web && npm run dev" --port 3000 --timeout 60 \
          -- python3 test-payment-with-webapp-testing.py http://localhost:3000
    elif [ "$FRONTEND_RUNNING" = "no" ]; then
        python3 .claude/skills/webapp-testing/scripts/with_server.py \
          --server "cd apps/web && npm run dev" --port 3000 --timeout 60 \
          -- python3 test-payment-with-webapp-testing.py http://localhost:3000
    else
        # 服务已运行，直接测试
        python3 test-payment-with-webapp-testing.py http://localhost:3000
    fi
else
    echo "✅ 服务已运行，直接开始测试..."
    python3 test-payment-with-webapp-testing.py http://localhost:3000
fi

echo "✅ 测试完成！"

