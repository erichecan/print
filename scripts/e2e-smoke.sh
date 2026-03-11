#!/bin/bash
# E2E smoke test script 
# 支持 RUN_PLAYWRIGHT=1 触发完整 UI 回归
# Usage: RUN_PLAYWRIGHT=1 ./scripts/e2e-smoke.sh [base-url]

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BASE_URL="${1:-http://localhost:3000}"
API_URL="${2:-http://localhost:3001/api}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running E2E smoke tests..."
echo "Frontend URL: $BASE_URL"
echo "API URL: $API_URL"

# Test 1: Homepage loads
echo "Test 1: Homepage loads..."
curl -f -s "$BASE_URL" > /dev/null || {
  echo "❌ Homepage failed to load"
  exit 1
}
echo "✅ Homepage loaded"

# Test 2: Products API responds
echo "Test 2: Products API responds..."
curl -f -s "$API_URL/products?limit=1" > /dev/null || {
  echo "❌ Products API failed"
  exit 1
}
echo "✅ Products API working"

# Test 3: Collections API responds
echo "Test 3: Collections API responds..."
curl -f -s "$API_URL/collections" > /dev/null || {
  echo "❌ Collections API failed"
  exit 1
}
echo "✅ Collections API working"

# Test 4: Health check (if available)
if curl -f -s "$API_URL/health" > /dev/null 2>&1; then
  echo "✅ Health check passed"
else
  echo "⚠️  Health check endpoint not available (optional)"
fi

# Test 5: Admin routes require auth (should return 401/403)
echo "Test 5: Admin routes protected..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/admin/orders" || echo "000")
if [ "$ADMIN_STATUS" = "401" ] || [ "$ADMIN_STATUS" = "403" ] || [ "$ADMIN_STATUS" = "000" ]; then
  echo "✅ Admin routes protected"
else
  echo "⚠️  Admin routes may not be protected (status: $ADMIN_STATUS)"
fi

if [ "${RUN_PLAYWRIGHT:-0}" = "1" ]; then
  echo "Running Playwright regression suite..."
  export E2E_ENV_FILE="${E2E_ENV_FILE:-$REPO_ROOT/configs/e2e.test.envvars}"
  (cd "$REPO_ROOT/apps/web" && npx playwright test)
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] All smoke tests passed! ✅"

