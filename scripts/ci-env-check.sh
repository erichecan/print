#!/bin/bash
# CI 环境变量检查脚本
# 用于在 CI/CD 流程中检查环境变量配置，防止硬编码 URL 和配置错误

set -e

echo "🔍 开始环境变量和代码检查..."

# 检查是否在生产环境
IS_PRODUCTION="${NODE_ENV:-development}"
if [ "$IS_PRODUCTION" = "production" ]; then
  echo "✅ 检测到生产环境，开始严格检查..."
  
  # 1. 检查必需的环境变量
  MISSING_VARS=()
  
  if [ -z "$NEXT_PUBLIC_API_URL" ] && [ -z "$API_BASE_URL" ] && [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_API_URL 或 API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL")
  fi
  
  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ 错误：生产环境缺少必需的环境变量："
    for var in "${MISSING_VARS[@]}"; do
      echo "   - $var"
    done
    exit 1
  fi
  
  # 2. 检查是否包含 localhost（生产环境不允许）
  if [ -n "$NEXT_PUBLIC_API_URL" ]; then
    if [[ "$NEXT_PUBLIC_API_URL" == *"localhost"* ]] || [[ "$NEXT_PUBLIC_API_URL" == *"127.0.0.1"* ]]; then
      echo "❌ 错误：NEXT_PUBLIC_API_URL 包含 localhost 或 127.0.0.1"
      echo "   当前值: $NEXT_PUBLIC_API_URL"
      exit 1
    fi
  fi
  
  if [ -n "$API_BASE_URL" ]; then
    if [[ "$API_BASE_URL" == *"localhost"* ]] || [[ "$API_BASE_URL" == *"127.0.0.1"* ]]; then
      echo "❌ 错误：API_BASE_URL 包含 localhost 或 127.0.0.1"
      echo "   当前值: $API_BASE_URL"
      exit 1
    fi
  fi
  
  if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then
    if [[ "$NEXT_PUBLIC_API_BASE_URL" == *"localhost"* ]] || [[ "$NEXT_PUBLIC_API_BASE_URL" == *"127.0.0.1"* ]]; then
      echo "❌ 错误：NEXT_PUBLIC_API_BASE_URL 包含 localhost 或 127.0.0.1"
      echo "   当前值: $NEXT_PUBLIC_API_BASE_URL"
      exit 1
    fi
  fi
fi

# 3. 检查代码中是否包含硬编码的 localhost（生产环境不允许）
echo "🔍 检查代码中的硬编码 localhost..."
HARDCODED_LOCALHOST=$(grep -r "http://localhost:3001" apps/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "node_modules" | grep -v ".next" | grep -v "config/env.ts" | grep -v "api-config.ts" | grep -v "api-route-config.ts" | grep -v "//.*localhost" || true)

if [ -n "$HARDCODED_LOCALHOST" ]; then
  echo "⚠️  警告：发现硬编码的 localhost:3001（开发环境允许，但建议使用环境变量）"
  echo "$HARDCODED_LOCALHOST" | while IFS= read -r line; do
    echo "   $line"
  done
  # 生产环境不允许硬编码
  if [ "$IS_PRODUCTION" = "production" ]; then
    echo "❌ 错误：生产环境代码中不允许硬编码 localhost"
    exit 1
  fi
fi

# 4. 检查是否使用了统一的环境变量配置模块
echo "🔍 检查是否使用了统一的环境变量配置..."
DIRECT_ENV_USAGE=$(grep -r "process.env.NEXT_PUBLIC_API_URL\|process.env.API_BASE_URL" apps/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "node_modules" | grep -v ".next" | grep -v "config/env.ts" | grep -v "api-config.ts" | grep -v "api-route-config.ts" | grep -v "apiClient.ts" | grep -v "sitemap.ts" || true)

if [ -n "$DIRECT_ENV_USAGE" ]; then
  echo "⚠️  警告：发现直接使用环境变量的代码（建议使用 @/config/env 模块）"
  echo "$DIRECT_ENV_USAGE" | while IFS= read -r line; do
    echo "   $line"
  done
fi

# 5. 检查 next.config.mjs 中的配置
echo "🔍 检查 next.config.mjs..."
if [ -f "apps/web/next.config.mjs" ]; then
  if grep -q "localhost:3001" apps/web/next.config.mjs && [ "$IS_PRODUCTION" = "production" ]; then
    echo "⚠️  警告：next.config.mjs 中包含 localhost（构建时允许，但运行时需要正确配置）"
  fi
fi

echo "✅ 环境变量和代码检查完成"

