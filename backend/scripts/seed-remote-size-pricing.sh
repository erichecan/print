#!/bin/bash
# Seed Remote Database with Size Pricing Configuration
# Usage: ./backend/scripts/seed-remote-size-pricing.sh

set -e

echo "🚀 Seeding Remote Database with Size Pricing Configuration..."

# Configuration
PROJECT_ID="moonlit-gamma-479502-r6"
REGION="us-central1"
SERVICE_NAME="print-main-backend"

# Get the backend service URL
echo "📡 Getting backend service URL..."
BACKEND_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

if [ -z "$BACKEND_URL" ]; then
  echo "❌ Failed to get backend URL"
  exit 1
fi

echo "✅ Backend URL: $BACKEND_URL"

# Size fees to seed
declare -a SIZE_FEES=(
  "2XL:2.00"
  "3XL:3.00"
  "4XL:4.00"
  "5XL:5.00"
)

echo ""
echo "📦 Seeding size fees..."

for item in "${SIZE_FEES[@]}"; do
  IFS=':' read -r size fee <<< "$item"
  
  echo "  → $size: \$$fee"
  
  # Call the admin API to create/update size fee
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "$BACKEND_URL/api/admin/offline-orders/size-fees" \
    -H "Content-Type: application/json" \
    -d "{\"sizeFees\": [{\"size\": \"$size\", \"additionalFee\": $fee}]}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo "    ✅ Success"
  else
    echo "    ⚠️  HTTP $http_code: $body"
  fi
done

echo ""
echo "✅ Remote database seeding complete!"
echo ""
echo "📝 To verify, check the admin panel:"
echo "   https://print-main-frontend-234065158862.us-central1.run.app/offline-orders/sales/orders"
