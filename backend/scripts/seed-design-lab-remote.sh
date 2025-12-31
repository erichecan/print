#!/bin/bash
# Seed Design Lab Default Product (Remote)
# Usage: ./backend/scripts/seed-design-lab-remote.sh

set -e

echo "🚀 Seeding Design Lab Default Product (Remote)..."

# Configuration
PROJECT_ID="print-482914"
REGION="us-central1"
SERVICE_NAME="print-main-backend"

# Get the backend service URL if not provided
if [ -z "$BACKEND_URL" ]; then
  echo "📡 Getting backend service URL..."
  BACKEND_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format='value(status.url)')
fi

if [ -z "$BACKEND_URL" ]; then
  echo "❌ Failed to get backend URL"
  exit 1
fi

echo "✅ Backend URL: $BACKEND_URL"

echo "📦 Seeding Design Lab Product..."

# Call the seed endpoint
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "$BACKEND_URL/api/admin/products/seed/design-lab" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
  echo "    ✅ Success: $body"
else
  echo "    ⚠️  HTTP $http_code: $body"
  # Don't fail the build, just warn
  echo "    (Warning only - checking if product already exists or specific error)"
fi

echo "✅ Seed script finished."
