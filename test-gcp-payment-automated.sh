#!/bin/bash
# test-gcp-payment-automated.sh
# GCP 生产环境 Stripe 支付自动化测试执行脚本
# [2025-01-30 17:00:00]

set -e

echo "=========================================="
echo "GCP 生产环境 Stripe 支付自动化测试"
echo "=========================================="

# 检查 Python 和 Playwright
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查 Playwright
if ! python3 -c "import playwright" 2>/dev/null; then
    echo "安装 Playwright..."
    pip3 install playwright
    playwright install chromium
fi

# 运行测试
echo "开始执行测试..."
python3 test-gcp-payment-automated.py

echo "测试完成！"

