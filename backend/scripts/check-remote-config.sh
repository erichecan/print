#!/bin/bash
# Quick diagnostic script to check remote database configuration
# Usage: ./backend/scripts/check-remote-config.sh

set -e

echo "🔍 Checking Remote Database Configuration..."
echo ""

# Configuration
PROJECT_ID="moonlit-gamma-479502-r6"
REGION="us-central1"
BACKEND_SERVICE="print-main-backend"
FRONTEND_SERVICE="print-main-frontend"

# Get service URLs
echo "📡 Getting service URLs..."
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)' 2>/dev/null || echo "")

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
  echo "❌ Failed to get backend URL"
  exit 1
fi

if [ -z "$FRONTEND_URL" ]; then
  echo "⚠️  Failed to get frontend URL (non-critical)"
fi

echo "✅ Backend:  $BACKEND_URL"
echo "✅ Frontend: $FRONTEND_URL"
echo ""

# Check version
echo "📦 Checking deployed version..."
if [ -n "$FRONTEND_URL" ]; then
  version_response=$(curl -s "$FRONTEND_URL/api/version" || echo "{}")
  version=$(echo "$version_response" | grep -o '"sha":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  build_time=$(echo "$version_response" | grep -o '"buildTime":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  echo "  Version: $version"
  echo "  Build Time: $build_time"
else
  echo "  ⚠️  Cannot check version (frontend URL not available)"
fi
echo ""

# Check offline orders config
echo "🔧 Checking offline orders configuration..."
config_response=$(curl -s "$BACKEND_URL/api/offline-orders/config" || echo "{}")

# Parse response
products_count=$(echo "$config_response" | grep -o '"products":\[[^]]*\]' | grep -o '"id"' | wc -l | tr -d ' ')
colors_count=$(echo "$config_response" | grep -o '"colors":\[[^]]*\]' | grep -o '"id"' | wc -l | tr -d ' ')
size_fees_count=$(echo "$config_response" | grep -o '"sizeFees":\[[^]]*\]' | grep -o '"size"' | wc -l | tr -d ' ')

echo "  Products: $products_count"
echo "  Colors: $colors_count"
echo "  Size Fees: $size_fees_count"
echo ""

# Check size fees detail
if [ "$size_fees_count" -gt 0 ]; then
  echo "✅ Size fees configuration found:"
  echo "$config_response" | grep -o '"sizeFees":\[[^]]*\]' | sed 's/},{/}\n{/g' | grep -o '"size":"[^"]*","additionalFee":[0-9.]*' | while read -r line; do
    size=$(echo "$line" | grep -o '"size":"[^"]*"' | cut -d'"' -f4)
    fee=$(echo "$line" | grep -o '"additionalFee":[0-9.]*' | cut -d':' -f2)
    echo "  - $size: \$$fee"
  done
else
  echo "❌ No size fees configuration found!"
  echo ""
  echo "💡 To fix this, run:"
  echo "   ./backend/scripts/seed-remote-size-pricing.sh"
fi

echo ""
echo "📊 Summary:"
if [ "$size_fees_count" -gt 0 ]; then
  echo "  ✅ Configuration is complete"
else
  echo "  ❌ Size fees configuration is missing"
  echo "  ⚠️  Users will see default fallback values"
fi

echo ""
echo "🔗 URLs:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend API: $BACKEND_URL/api"
echo "  Config Endpoint: $BACKEND_URL/api/offline-orders/config"
echo "  Admin Panel: $FRONTEND_URL/offline-orders/sales/orders"
