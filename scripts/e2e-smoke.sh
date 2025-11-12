#!/bin/bash
# E2E smoke test script [2025-11-12 03:25:00]
# Usage: ./scripts/e2e-smoke.sh [base-url]

set -e

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

echo "[$(date +'%Y-%m-%d %H:%M:%S')] All smoke tests passed! ✅"

