#!/bin/bash
# [2025-12-09] 环境变量校验脚本
# 用于在构建和部署前检查必需的环境变量

set -e

echo "🔍 检查环境变量配置..."

# 检查是否在生产环境
if [ "$NODE_ENV" = "production" ]; then
  echo "✅ 检测到生产环境，开始严格检查..."
  
  # 检查必需的环境变量
  MISSING_VARS=()
  
  if [ -z "$NEXT_PUBLIC_API_URL" ] && [ -z "$API_BASE_URL" ] && [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_API_URL 或 API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL")
  fi
  
  # 检查是否包含 localhost（生产环境不允许）
  if [ -n "$NEXT_PUBLIC_API_URL" ]; then
    if [[ "$NEXT_PUBLIC_API_URL" == *"localhost"* ]] || [[ "$NEXT_PUBLIC_API_URL" == *"127.0.0.1"* ]]; then
      echo "❌ 错误：NEXT_PUBLIC_API_URL 包含 localhost 或 127.0.0.1"
      echo "   当前值: $NEXT_PUBLIC_API_URL"
      echo "   生产环境不允许使用 localhost 地址"
      exit 1
    fi
  fi
  
  if [ -n "$API_BASE_URL" ]; then
    if [[ "$API_BASE_URL" == *"localhost"* ]] || [[ "$API_BASE_URL" == *"127.0.0.1"* ]]; then
      echo "❌ 错误：API_BASE_URL 包含 localhost 或 127.0.0.1"
      echo "   当前值: $API_BASE_URL"
      echo "   生产环境不允许使用 localhost 地址"
      exit 1
    fi
  fi
  
  if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then
    if [[ "$NEXT_PUBLIC_API_BASE_URL" == *"localhost"* ]] || [[ "$NEXT_PUBLIC_API_BASE_URL" == *"127.0.0.1"* ]]; then
      echo "❌ 错误：NEXT_PUBLIC_API_BASE_URL 包含 localhost 或 127.0.0.1"
      echo "   当前值: $NEXT_PUBLIC_API_BASE_URL"
      echo "   生产环境不允许使用 localhost 地址"
      exit 1
    fi
  fi
  
  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ 错误：生产环境缺少必需的环境变量："
    for var in "${MISSING_VARS[@]}"; do
      echo "   - $var"
    done
    echo ""
    echo "请设置以下环境变量之一："
    echo "  - NEXT_PUBLIC_API_URL (推荐，用于前端)"
    echo "  - API_BASE_URL (用于服务端)"
    echo "  - NEXT_PUBLIC_API_BASE_URL (备选)"
    exit 1
  fi
  
  echo "✅ 环境变量检查通过"
  echo "   NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-未设置}"
  echo "   API_BASE_URL: ${API_BASE_URL:-未设置}"
  echo "   NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-未设置}"
else
  echo "ℹ️  开发环境，跳过严格检查"
fi

