#!/bin/bash
# [2025-12-10] 扫描硬编码 URL（http://localhost、/_next/image 手动访问、baseURL 拼接散点）
# 用法: bash scripts/grep-hardcoded-urls.sh

set -e

echo "[Hardcoded URL Check] 开始扫描硬编码 URL..."

# 要扫描的目录
SEARCH_DIRS=("apps/web/src" "apps/web/public")

# 要排除的文件/目录
EXCLUDE_PATTERNS=(
  "node_modules"
  ".next"
  "*.test.ts"
  "*.test.tsx"
  "*.spec.ts"
  "*.spec.tsx"
  "__tests__"
  "*.d.ts"
  "scripts"
)

# 硬编码 URL 模式
PATTERNS=(
  "http://localhost"
  "https://localhost"
  "http://127.0.0.1"
  "https://127.0.0.1"
  "/_next/image"
  "baseURL.*=.*['\"]http"
  "baseURL.*=.*['\"]https"
  "API_BASE.*=.*['\"]http"
  "apiUrl.*=.*['\"]http"
)

# 构建 exclude 参数
EXCLUDE_ARGS=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_ARGS+=("--glob" "!${pattern}")
done

# 错误计数
ERROR_COUNT=0
ERROR_FILES=()

# 扫描每个目录
for dir in "${SEARCH_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi

  echo "[Hardcoded URL Check] 扫描目录: $dir"

  # 对每个模式进行搜索
  for pattern in "${PATTERNS[@]}"; do
    # 使用 ripgrep (rg) 搜索
    if command -v rg &> /dev/null; then
      results=$(rg -n --type-add 'web:*.{ts,tsx,js,jsx}' -t web "$pattern" "$dir" "${EXCLUDE_ARGS[@]}" 2>/dev/null || true)
    else
      # 回退到 grep
      results=$(grep -rn "$pattern" "$dir" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null || true)
    fi

    if [ -n "$results" ]; then
      echo ""
      echo "[Hardcoded URL Check] ❌ 发现硬编码 URL: $pattern"
      echo "$results" | while IFS= read -r line; do
        if [ -n "$line" ]; then
          echo "  $line"
          # 提取文件路径
          file=$(echo "$line" | cut -d: -f1)
          if [[ ! " ${ERROR_FILES[@]} " =~ " ${file} " ]]; then
            ERROR_FILES+=("$file")
          fi
          ((ERROR_COUNT++)) || true
        fi
      done
    fi
  done
done

# 输出结果
echo ""
if [ $ERROR_COUNT -gt 0 ]; then
  echo "[Hardcoded URL Check] ❌ 发现 $ERROR_COUNT 处硬编码 URL"
  echo "[Hardcoded URL Check] 涉及文件:"
  for file in "${ERROR_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  echo "[Hardcoded URL Check] 请使用环境变量或统一的配置模块（@/config/env）替代硬编码 URL"
  exit 1
else
  echo "[Hardcoded URL Check] ✅ 未发现硬编码 URL"
  exit 0
fi

