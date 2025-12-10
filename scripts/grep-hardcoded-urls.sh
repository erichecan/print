#!/bin/bash
# [2025-01-30 23:00:00] Design Lab 4.0: 禁止硬编码域与散落 baseURL

echo "🔍 检查硬编码 URL..."

# 检查硬编码的 API URL
HARDCODED_URLS=$(grep -r "http://localhost:3001" apps/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "env.example" | grep -v ".test." | grep -v ".spec." || true)

if [ -n "$HARDCODED_URLS" ]; then
  echo "❌ 发现硬编码 URL:"
  echo "$HARDCODED_URLS"
  exit 1
fi

# 检查散落的 baseURL
SCATTERED_BASEURL=$(grep -r "baseURL\|baseUrl\|BASE_URL" apps/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "env.ts" | grep -v "apiClient.ts" | grep -v "api-config.ts" | grep -v ".test." | grep -v ".spec." || true)

if [ -n "$SCATTERED_BASEURL" ]; then
  echo "❌ 发现散落的 baseURL:"
  echo "$SCATTERED_BASEURL"
  exit 1
fi

echo "✅ 硬编码 URL 检查通过"
